describe("AI Engine Badge & Modal E2E", () => {
  beforeEach(() => {
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.setItem(
          "vivavoz-reader-settings",
          JSON.stringify({
            template: "modern",
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

  it("deve renderizar o badge de IA no cabeçalho e abrir o modal de configuração", () => {
    cy.get('[data-cy="ai-engine-badge"]').should("be.visible").click();

    cy.get('[data-cy="ai-engine-modal"]').should("be.visible");
    cy.contains("Motor de IA Híbrida VivaVoz").should("be.visible");

    // Valida abas
    cy.get('[data-cy="tab-gemini-nano"]').should("be.visible");
    cy.get('[data-cy="tab-cloud-key"]').should("be.visible").click();

    // Valida input de chave Cloud
    cy.get('[data-cy="input-cloud-key"]').should("be.visible").clear().type("AIzaSyTestApiKey12345");
    cy.get('[data-cy="btn-save-key"]').should("be.visible").click();
    cy.contains("Salvo com sucesso!").should("be.visible");

    // Volta para a aba Nano e valida botões de cópia
    cy.get('[data-cy="tab-gemini-nano"]').click();
    cy.get('[data-cy="copy-flag-1"]').should("be.visible").click();
    cy.get('[data-cy="copy-flag-1"]').should("contain.text", "Copiado");

    // Fecha o modal
    cy.get('[data-cy="btn-close-modal"]').click();
    cy.get('[data-cy="ai-engine-modal"]').should("not.exist");
  });

  it("deve conter anotações semânticas e WebMCP acessíveis para agentes", () => {
    cy.get('[data-cy="ai-engine-badge"]')
      .should("have.attr", "data-webmcp-tool", "viewAIEngineStatus")
      .and("have.attr", "aria-label");

    cy.get('[data-cy="ai-engine-badge"]').click();

    cy.get('[data-cy="ai-engine-modal"]').should("be.visible");
    cy.get('[data-cy="tab-cloud-key"]').click();

    cy.get("form[data-webmcp-tool='saveVertexAPIKey']")
      .should("exist")
      .within(() => {
        cy.get('[data-cy="input-cloud-key"]')
          .should("have.attr", "name", "apiKey")
          .and("have.attr", "type", "password")
          .and("have.attr", "aria-label");
      });

    cy.get('[data-cy="btn-close-modal"]').click();
  });

  it("deve ser perfeitamente responsivo em mobile (370px)", () => {
    cy.viewport(370, 667);
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.setItem(
          "vivavoz-reader-settings",
          JSON.stringify({
            template: "modern",
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

    cy.get('[data-cy="mobile-menu-trigger"]').should("be.visible").click();
    cy.get('[data-cy="mobile-ai-engine-item"]').should("be.visible").click();

    cy.get('[data-cy="ai-engine-modal"]').should("be.visible");
    cy.contains("Motor de IA Híbrida VivaVoz").should("be.visible");

    // Garante que não há overflow horizontal
    cy.window().then((win) => {
      const scrollWidth = win.document.documentElement.scrollWidth;
      const clientWidth = win.document.documentElement.clientWidth;
      expect(scrollWidth).to.be.lte(clientWidth);
    });

    cy.get('[data-cy="btn-close-modal"]').click();
  });
});
