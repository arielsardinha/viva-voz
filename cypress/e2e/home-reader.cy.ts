describe("Leitor de PDF - Fluxo Principal e Dropzone", () => {
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
          })
        );
      },
    });
    cy.get('header[data-hydrated="true"]').should("exist");
  });

  it("deve carregar a página inicial com cabeçalho, logotipo e área de upload", () => {
    cy.contains("VivaVoz").should("be.visible");
    cy.contains("AI Studio").should("be.visible");
    cy.contains("Arraste seus documentos aqui ou selecione").should("be.visible");
    cy.contains("Selecionar Arquivo").should("be.visible");

    // Valida os cards de recursos da home
    cy.contains("Narração Fluida").should("be.visible");
    cy.contains("Assistente de Estudos").should("be.visible");
    cy.contains("100% Local & Seguro").should("be.visible");
  });

  it("deve navegar entre o Leitor e a Biblioteca através do cabeçalho", () => {
    cy.contains("VivaVoz").should("be.visible");
    cy.contains("Arraste seus documentos aqui").should("be.visible");

    cy.contains("a", "Biblioteca").click();
    cy.url().should("include", "/leituras");
    cy.contains("Armazenamento Local").should("be.visible");

    cy.contains("a", "Leitor").click();
    cy.url().should("eq", `${Cypress.config().baseUrl}/`);
    cy.contains("Arraste seus documentos aqui ou selecione").should("be.visible");
  });

  it("deve abrir e permitir configuração da chave do Gemini pelo modal", () => {
    cy.contains("VivaVoz").should("be.visible");
    cy.contains("Arraste seus documentos aqui").should("be.visible");

    cy.get('[data-cy="gemini-key-trigger"]').should("be.visible").click();

    cy.contains("Conectar conta do Gemini (Google AI Studio)").should("be.visible");
    cy.get('[data-cy="gemini-key-input"]').should("be.visible");

    // Tenta salvar chave curta (inválida)
    cy.get('[data-cy="gemini-key-input"]').type("curta");
    cy.get('[data-cy="gemini-key-save-btn"]').click();
    // O modal continua aberto em caso de validação inválida
    cy.contains("Conectar conta do Gemini (Google AI Studio)").should("be.visible");

    // Salva chave válida
    cy.get('[data-cy="gemini-key-input"]').clear().type("AIzaSyFakeKeyForTesting123456");
    cy.get('[data-cy="gemini-key-save-btn"]').click();

    // Modal deve fechar e botão do header mudar para conectado
    cy.contains("Conectar conta do Gemini (Google AI Studio)").should("not.exist");
    cy.contains("Gemini Conectado").should("be.visible");
  });
});
