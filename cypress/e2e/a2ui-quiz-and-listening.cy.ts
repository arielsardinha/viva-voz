describe("Quiz Interativo A2UI & Assistente de Leitura", () => {
  const SAMPLE_TITLE = "Memórias Póstumas de Brás Cubas";
  const SAMPLE_TEXT = [
    "Brás Cubas inicia suas memórias explicando que não é propriamente um autor defunto, mas um defunto autor.",
    "A narrativa adota um tom irônico e livre de julgamentos porque o narrador já atravessou a fronteira da morte.",
    "Machado de Assis rompe com o realismo tradicional ao dialogar diretamente com o leitor sobre a própria sepultura.",
  ].join("\n\n");

  function build10MockQuestions() {
    return Array.from({ length: 10 }, (_, idx) => ({
      id: `q-${idx + 1}`,
      index: idx,
      topic: `Tema ${idx + 1}`,
      paragraphRef: idx + 1,
      sentenceIndex: idx % 3,
      page: 1,
      prompt: `Questão ${idx + 1} sobre o conteúdo analisado?`,
      evidenceQuote: "Brás Cubas inicia suas memórias explicando sua perspectiva.",
      explanation: `Explicação detalhada da questão ${idx + 1} ancorada no documento.`,
      hint: `Observe a passagem ¶${idx + 1}.`,
      xpReward: 60,
      options: [
        { id: "A", label: `Distrator A-${idx + 1}`, isCorrect: false },
        { id: "B", label: `Resposta correta da questão ${idx + 1}`, isCorrect: true },
        { id: "C", label: `Distrator C-${idx + 1}`, isCorrect: false },
        { id: "D", label: `Distrator D-${idx + 1}`, isCorrect: false },
      ],
    }));
  }

  function visitReaderWithTemplate(
    template: "ai-study" | "zen",
    viewport: [number, number] = [1280, 800],
  ) {
    cy.viewport(viewport[0], viewport[1]);
    cy.visit("/", { timeout: 60000 });
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.window().then(async (win) => {
      if (win.indexedDB?.databases) {
        const dbs = await win.indexedDB.databases();
        await Promise.all(
          dbs.map((db) =>
            db.name
              ? new Promise<void>((resolve) => {
                  const req = win.indexedDB.deleteDatabase(db.name!);
                  req.onsuccess = () => resolve();
                  req.onerror = () => resolve();
                  req.onblocked = () => resolve();
                })
              : Promise.resolve(),
          ),
        );
      }
    });
    cy.visit("/leitor", {
      timeout: 60000,
      onBeforeLoad(win) {
        win.localStorage.setItem(
          "vivavoz-reader-settings",
          JSON.stringify({
            template,
            theme: "light",
            font: "inter",
            fontSize: 16,
            lineHeight: 1.8,
            hasCompletedOnboarding: true,
          }),
        );
      },
    });
    cy.get('header[data-hydrated="true"]').should("exist");
  }

  function openSampleViaQuickPaste() {
    cy.get("body").then(($body) => {
      if ($body.find('[data-cy="change-document-btn"]').length > 0) {
        cy.get('[data-cy="change-document-btn"]').first().click();
      }
    });
    cy.get('[data-cy="quick-paste-btn"]').should("be.visible").click();
    cy.get('[data-cy="quick-paste-title-input"]').clear().type(SAMPLE_TITLE, { delay: 0 });
    cy.get('[data-cy="quick-paste-content-textarea"]').clear().type(SAMPLE_TEXT, { delay: 0 });
    cy.get('[data-cy="quick-paste-submit-btn"]').click();
    cy.contains(SAMPLE_TEXT.slice(0, 42)).should("be.visible");
  }

  function connectFakeGeminiKeyViaAssistantPanel() {
    cy.get('[data-cy="gemini-key-trigger"]:visible').first().click();
    cy.get('[data-cy="gemini-key-input"]')
      .scrollIntoView()
      .should("be.visible")
      .clear()
      .type("AIzaSyCypressTestQuizKey123456", { delay: 0 });
    cy.get('[data-cy="gemini-key-save-btn"]').scrollIntoView().click();
    cy.get('[data-cy="chrome-ai-badge-btn"]:visible').should(
      "contain.text",
      "Gemini 2.5 Flash",
    );
  }

  function checkAccessibility() {
    cy.injectAxe();
    cy.checkA11y(undefined, {
      includedImpacts: ["critical", "serious"],
      rules: {
        "color-contrast": { enabled: false },
      },
    });
  }

  afterEach(() => {
    cy.clearCookies();
  });

  it("deve adaptar o Quiz A2UI para doc curto (2 questões), responder tudo, destacar evidência e exibir resumo", () => {
    visitReaderWithTemplate("ai-study", [1280, 800]);
    openSampleViaQuickPaste();

    cy.get('[data-cy="assistant-tab-quiz"]').should("be.visible").click();
    cy.get('[data-cy="a2ui-next-btn"]').should("contain.text", "Próxima (2/2)");

    cy.get('[data-cy="a2ui-choice-B"]').click();
    cy.get('[data-cy="a2ui-choice-B"]').should("contain.text", "+60 XP");

    cy.get('[data-cy="a2ui-explanation-card"]').should("be.visible");

    cy.get('[data-cy="a2ui-highlight-evidence"]').click();
    cy.get('[data-cy="a2ui-reader-sync-banner"]').should("not.exist");
    cy.get('[data-a2ui-evidence="true"]').should("exist");

    cy.get('[data-cy="a2ui-voice-command-input"]').type("próxima");
    cy.get('[data-cy="a2ui-voice-command-form"]').submit();
    cy.get('[data-cy="a2ui-next-btn"]').should("contain.text", "Próxima (1/2)");

    cy.get('[data-cy="a2ui-choice-C"]').click();
    cy.get('[data-cy="a2ui-quiz-summary"]')
      .scrollIntoView()
      .should("be.visible")
      .and("contain.text", "Quiz concluído");

    checkAccessibility();
  });

  it("deve gerar até 10 questões via /api/quiz com economia de tokens, navegar até Q10 e gerar novas perguntas", () => {
    visitReaderWithTemplate("ai-study", [1280, 800]);
    openSampleViaQuickPaste();
    connectFakeGeminiKeyViaAssistantPanel();

    cy.intercept("POST", "/api/quiz", {
      statusCode: 200,
      body: {
        questions: build10MockQuestions(),
        coverage: {
          totalSentences: 120,
          includedSentences: 40,
          totalChars: 32000,
          includedChars: 11200,
          estimatedInputTokens: 5800,
          maxInputTokens: 6000,
          coveragePercent: 35,
          wasBudgetLimited: true,
          strategy: "stratified",
          targetQuestionCount: 10,
          coveredPageRange: { from: 1, to: 15 },
        },
        modelId: "gemini-2.5-flash",
      },
    }).as("generateQuiz");

    cy.get('[data-cy="assistant-tab-quiz"]').should("be.visible").click();
    cy.wait("@generateQuiz");

    cy.get('[data-cy="a2ui-next-btn"]').should("contain.text", "Próxima (2/10)");
    cy.get('[data-cy="a2ui-coverage-badge"]')
      .should("contain.text", "IA Nuvem")
      .and("contain.text", "economia de tokens");

    cy.get('[data-cy="a2ui-step-10"]').click();
    cy.get('[data-cy="a2ui-next-btn"]').should("contain.text", "Próxima (1/10)");

    cy.get('[data-cy="a2ui-regenerate-btn"]').click();
    cy.wait("@generateQuiz");
    cy.get('[data-cy="a2ui-next-btn"]').should("contain.text", "Próxima (2/10)");

    checkAccessibility();
  });

  it("deve acionar fallback resiliente quando /api/quiz retornar erro 429 mantendo o quiz interativo", () => {
    visitReaderWithTemplate("ai-study", [1280, 800]);
    openSampleViaQuickPaste();
    connectFakeGeminiKeyViaAssistantPanel();

    cy.intercept("POST", "/api/quiz", {
      statusCode: 429,
      body: { error: "Limite temporário de uso da IA atingido." },
    }).as("generateQuizError");

    cy.get('[data-cy="assistant-tab-quiz"]').should("be.visible").click();
    cy.wait("@generateQuizError");

    cy.get('[data-cy="a2ui-fallback-notice"]').should("be.visible");
    cy.get('[data-cy="a2ui-coverage-badge"]').should("contain.text", "Modo rápido");
    cy.get('[data-cy="a2ui-choice-B"]').click();
    cy.get('[data-cy="a2ui-explanation-card"]').should("be.visible");
  });

  it("deve renderizar o Quiz A2UI com 10 questões em viewport mobile 370px sem overflow horizontal", () => {
    visitReaderWithTemplate("ai-study", [370, 667]);
    openSampleViaQuickPaste();

    cy.window().then((win) => {
      const { scrollWidth, clientWidth } = win.document.documentElement;
      expect(scrollWidth).to.be.lte(clientWidth + 1);
    });

    cy.get('[data-cy="mobile-tab-chat"]').click();
    connectFakeGeminiKeyViaAssistantPanel();

    cy.intercept("POST", "/api/quiz", {
      statusCode: 200,
      body: {
        questions: build10MockQuestions(),
        coverage: {
          totalSentences: 120,
          includedSentences: 40,
          totalChars: 32000,
          includedChars: 11200,
          estimatedInputTokens: 5800,
          maxInputTokens: 6000,
          coveragePercent: 35,
          wasBudgetLimited: true,
          strategy: "stratified",
          targetQuestionCount: 10,
        },
        modelId: "gemini-2.5-flash",
      },
    }).as("generateMobileQuiz");

    cy.get('[data-cy="assistant-tab-quiz"]').scrollIntoView().should("be.visible").click();
    cy.wait("@generateMobileQuiz");

    cy.get('[data-cy="a2ui-step-track"]').should("be.visible");
    cy.get('[data-cy="a2ui-quiz-card"]').scrollIntoView().should("be.visible");

    cy.window().then((win) => {
      const { scrollWidth, clientWidth } = win.document.documentElement;
      expect(scrollWidth).to.be.lte(clientWidth + 1);
    });
  });
});
