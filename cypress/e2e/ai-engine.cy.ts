describe("AI Engine & Study Assistant E2E", () => {
  beforeEach(() => {
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.clear();
        win.localStorage.setItem(
          "vivavoz-reader-settings",
          JSON.stringify({
            template: "ai-study",
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
  });

  it("NÃO deve renderizar o botão 'Configurar IA' no cabeçalho e deve permitir configurar chave na aba AI Study", () => {
    // 1. Garante que o botão 'Configurar IA' foi removido do cabeçalho
    cy.get("header").find('[data-cy="ai-engine-badge"]').should("not.exist");

    // 2. Carrega um texto rápido para abrir o template AI Study
    cy.get('[data-cy="quick-paste-btn"]').first().click({ force: true });
    cy.get('[data-cy="quick-paste-title-input"]', { timeout: 8000 })
      .should("be.visible")
      .and("not.be.disabled")
      .type("Documento de Estudo IA");
    cy.get('[data-cy="quick-paste-content-textarea"]').should("not.be.disabled").type("Este é o texto de teste para análise com IA.");
    cy.get('[data-cy="quick-paste-submit-btn"]').click();

    // 3. Na aba AI Study Assistant, valida presença do status badge e botão de chave com instruções
    cy.get('[data-cy="chrome-ai-badge-btn"]').should("be.visible");
    cy.get('[data-cy="gemini-key-trigger"]').filter(':visible').first().click({ force: true });

    // 4. Valida modal com instruções e título
    cy.contains("Conectar conta do Gemini (Google AI Studio)").should("be.visible");
    cy.get('[data-cy="gemini-key-input"]').should("be.visible");

    // 5. Salva chave de API
    cy.get('[data-cy="gemini-key-input"]').clear().type("AIzaSyTestValidVertexKey123");
    cy.get('[data-cy="gemini-key-save-btn"]').should("be.visible").click();

    // 6. Valida que a chave foi persistida
    cy.window().then((win) => {
      expect(win.localStorage.getItem("gemini-api-key")).to.eq("AIzaSyTestValidVertexKey123");
    });
  });

  it("deve conter anotações semânticas e WebMCP acessíveis para agentes no formulário de chave", () => {
    // Abre o diálogo da chave Gemini pelo menu de opções
    cy.get("[data-cy='theme-dropdown-trigger']").first().click();
    cy.get('[data-cy="gemini-key-trigger"]').filter(':visible').first().click({ force: true });

    cy.get("form[data-webmcp-tool='configureGeminiApiKey']")
      .should("exist")
      .and("have.attr", "data-webmcp-action", "saveApiKey")
      .within(() => {
        cy.get('[data-cy="gemini-key-input"]')
          .should("exist")
          .and("have.attr", "name", "geminiApiKey")
          .and("have.attr", "type", "password")
          .and("have.attr", "aria-label");
      });
  });

  it("deve ser perfeitamente responsivo em mobile (370px) sem overflow horizontal", () => {
    cy.viewport(370, 667);
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.setItem(
          "vivavoz-reader-settings",
          JSON.stringify({
            template: "ai-study",
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

    // Header sem botão extra e sem overflow
    cy.get("header").find('[data-cy="ai-engine-badge"]').should("not.exist");

    cy.window().then((win) => {
      const scrollWidth = win.document.documentElement.scrollWidth;
      const clientWidth = win.document.documentElement.clientWidth;
      expect(scrollWidth).to.be.lte(clientWidth);
    });
  });
});
