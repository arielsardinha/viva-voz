describe("Assistente IA — Layout Sticky, Scroll Horizontal, Dock Flutuante e Remoção do Estúdio Moderno", () => {
  const LONG_TITLE = "Tratado Extenso de Arquitetura e Leitura";
  const LONG_TEXT = Array.from({ length: 36 }, (_, idx) => {
    return `Parágrafo número ${idx + 1} deste documento extenso elaborado para exercitar a rolagem vertical completa da página principal enquanto o painel do assistente de leitura permanece fixo à direita e os controles de áudio flutuam na base da tela sem sobrepor o chat.`;
  }).join("\n\n");

  function visitReaderWithSettings(
    template: string = "ai-study",
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

  function loadLongDocumentViaQuickPaste() {
    cy.get("body").then(($body) => {
      if ($body.find('[data-cy="change-document-btn"]').length > 0) {
        cy.get('[data-cy="change-document-btn"]').first().click();
      }
    });
    cy.get('[data-cy="quick-paste-btn"]:visible').first().click();
    cy.get('[data-cy="quick-paste-title-input"]').clear().type(LONG_TITLE, { delay: 0 });
    cy.get('[data-cy="quick-paste-content-textarea"]').clear().type(LONG_TEXT, { delay: 0 });
    cy.get('[data-cy="quick-paste-submit-btn"]').click();
    cy.contains("Parágrafo número 1 deste documento extenso").should("be.visible");
  }

  it("mantém chat sticky à direita no scroll, dock fixo embaixo sem colisão, scroll com mouse nos chips e sem Estúdio Moderno/chip A2UI", () => {
    visitReaderWithSettings("ai-study", [1280, 800]);
    loadLongDocumentViaQuickPaste();

    // 1. Somente Assistente IA e Modo Zen Imersivo no switcher (Estúdio Moderno não existe)
    cy.get('[data-cy="template-tab-ai-study"]').should("be.visible");
    cy.get('[data-cy="template-tab-zen"]').should("be.visible");
    cy.get('[data-cy="template-tab-modern"]').should("not.exist");
    cy.contains("Estúdio Moderno").should("not.exist");

    // 2. FloatingAudioDock visível, fixed e sem sobrepor o input do chat
    cy.get('[data-cy="floating-audio-dock"]')
      .should("be.visible")
      .and("have.css", "position", "fixed");

    cy.get('#ai-study-prompt-input').then(($input) => {
      const inputRect = $input[0].getBoundingClientRect();
      cy.get('[data-cy="floating-audio-dock"]').then(($dock) => {
        const dockRect = $dock[0].getBoundingClientRect();
        expect(dockRect.top).to.be.greaterThan(inputRect.bottom);
      });
    });

    // 3. Scroll da página mantém o painel "Assistente de leitura" fixo à direita na viewport
    cy.scrollTo(0, 700);
    cy.get('[data-cy="ai-assistant-panel"]').then(($panel) => {
      const rect = $panel[0].getBoundingClientRect();
      expect(rect.top).to.be.at.least(0);
      expect(rect.top).to.be.lessThan(150);
      expect(rect.bottom).to.be.at.most(800);
      expect(rect.left).to.be.greaterThan(500);
    });

    // 4. Scroll horizontal com mouse (botão direito + wheel) nas sugestões rápidas
    cy.get('[data-cy="quick-prompts-scroller"]').then(($scroller) => {
      const el = $scroller[0];
      expect(el.scrollWidth).to.be.greaterThan(el.clientWidth);
      expect(el.scrollLeft).to.eq(0);
    });

    cy.get('[data-cy="quick-prompts-scroll-right"]').should("be.visible").click();
    cy.get('[data-cy="quick-prompts-scroller"]').should(($scroller) => {
      expect($scroller[0].scrollLeft).to.be.at.least(100);
    });

    // Wheel vertical negativo volta para a esquerda e positivo avança novamente
    cy.get('[data-cy="quick-prompts-scroller"]').then(($scroller) => {
      const initialLeft = $scroller[0].scrollLeft;
      const wheelBack = new WheelEvent("wheel", {
        deltaY: -100,
        deltaX: 0,
        bubbles: true,
        cancelable: true,
      });
      $scroller[0].dispatchEvent(wheelBack);
      expect($scroller[0].scrollLeft).to.be.lessThan(initialLeft);

      const afterBack = $scroller[0].scrollLeft;
      const wheelForward = new WheelEvent("wheel", {
        deltaY: 140,
        deltaX: 0,
        bubbles: true,
        cancelable: true,
      });
      $scroller[0].dispatchEvent(wheelForward);
      expect($scroller[0].scrollLeft).to.be.greaterThan(afterBack);
    });

    // 5. Aba Quiz não renderiza o chip/banner "Superfície A2UI sincronizada"
    cy.get('[data-cy="assistant-tab-quiz"]').click();
    cy.get('[data-cy="a2ui-quiz-card"]').should("exist");
    cy.get('[data-cy="a2ui-highlight-evidence"]').should("not.exist");
    cy.get('[data-cy="a2ui-choice-B"]').scrollIntoView().should("be.visible").click();
    cy.get('[data-cy="a2ui-highlight-evidence"]').scrollIntoView().should("be.visible").click();
    cy.get('[data-cy="a2ui-reader-sync-banner"]').should("not.exist");
    cy.contains("Superfície A2UI sincronizada").should("not.exist");

    // 6. Auditoria de acessibilidade
    cy.injectAxe();
    cy.checkA11y(undefined, {
      includedImpacts: ["critical", "serious"],
      rules: {
        "color-contrast": { enabled: false },
      },
    });
  });

  it("funciona em mobile 370px sem overflow horizontal e sem sobrepor o chat ao dock", () => {
    visitReaderWithSettings("ai-study", [370, 667]);
    loadLongDocumentViaQuickPaste();

    cy.window().then((win) => {
      const { scrollWidth, clientWidth } = win.document.documentElement;
      expect(scrollWidth).to.be.lte(clientWidth + 1);
    });

    // Aba Documento & Áudio exibe o FloatingAudioDock
    cy.get('[data-cy="floating-audio-dock"]').should("be.visible");

    // Aba Assistente IA oculta o dock para não cobrir o input do chat e mantém scroll horizontal válido
    cy.get('[data-cy="mobile-tab-chat"]').click();
    cy.get('[data-cy="ai-assistant-panel"]').should("be.visible");
    cy.get('#ai-study-prompt-input').should("be.visible");
    cy.get('[data-cy="floating-audio-dock"]').should("not.be.visible");

    cy.window().then((win) => {
      const { scrollWidth, clientWidth } = win.document.documentElement;
      expect(scrollWidth).to.be.lte(clientWidth + 1);
    });
  });

  it("migra automaticamente configuração legada template='modern' para Assistente IA", () => {
    visitReaderWithSettings("modern", [1280, 800]);
    loadLongDocumentViaQuickPaste();

    cy.get('[data-cy="ai-assistant-panel"]').should("be.visible");
    cy.get('[data-cy="floating-audio-dock"]').should("be.visible");
    cy.window().then((win) => {
      const saved = JSON.parse(win.localStorage.getItem("vivavoz-reader-settings") ?? "{}");
      expect(saved.template).to.eq("ai-study");
    });
  });
});
