describe("AI Engine & Study Assistant E2E", () => {
  beforeEach(() => {
    cy.visit("/leituras", {
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

  it("deve gerenciar ciclo de vida da chave Gemini: conectar, salvar cookie e desconectar no Armazenamento Local", () => {
    // 1. No Armazenamento Local em /leituras, valida status inicial Inativa
    cy.contains("Chave Gemini (IA)").should("be.visible");
    cy.contains("Inativa").should("be.visible");
    cy.get('[data-cy="connect-gemini-key-btn"]').should("be.visible").click();

    // 2. Valida modal com instruções e campos WebMCP
    cy.contains("Conectar conta do Gemini (Google AI Studio)").should("be.visible");
    cy.get('[data-cy="gemini-key-input"]').should("be.visible");

    // 3. Salva chave de API via Server Action
    cy.get('[data-cy="gemini-key-input"]').clear().type("AIzaSyTestValidVertexKey123");
    cy.get('[data-cy="gemini-key-save-btn"]').should("be.visible").click();

    // 4. Valida feedback de sucesso e atualização imediata do status no Armazenamento Local
    cy.contains("Conta Gemini conectada").should("exist");
    cy.contains("Conectada").should("be.visible");
    cy.get('[data-cy="disconnect-gemini-key-btn"]').should("be.visible");

    // 5. Clica em Desconectar no Armazenamento Local e confirma no popup
    cy.get('[data-cy="disconnect-gemini-key-btn"]').click();
    cy.contains("Desconectar Chave Gemini").should("be.visible");
    cy.contains("Tem certeza que deseja desconectar sua chave de IA?").should("be.visible");
    cy.contains("button", "Sim, Desconectar").click();

    cy.contains("Conta Gemini desconectada").should("exist");
    cy.contains("Inativa").should("be.visible");
    cy.get('[data-cy="connect-gemini-key-btn"]').should("be.visible");
  });

  it("deve conter anotações semânticas e WebMCP acessíveis para agentes no formulário de chave", () => {
    cy.get('[data-cy="connect-gemini-key-btn"]').should("be.visible").click();

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
    cy.visit("/leituras", {
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
