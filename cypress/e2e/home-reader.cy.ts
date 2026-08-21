describe("Leitor de PDF - Fluxo Principal e Dropzone", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("deve carregar a página inicial com cabeçalho, logotipo e área de upload", () => {
    cy.contains("VivaVoz").should("be.visible");
    cy.contains("AI Studio").should("be.visible");
    cy.contains("Arraste seu PDF aqui ou selecione").should("be.visible");
    cy.contains("Escolher arquivo PDF").should("be.visible");

    // Valida os cards de recursos da home
    cy.contains("Narração Fluida").should("be.visible");
    cy.contains("Assistente de Estudos").should("be.visible");
    cy.contains("100% Local & Seguro").should("be.visible");
  });

  it("deve navegar entre o Leitor e a Biblioteca através do cabeçalho", () => {
    cy.contains("a", "Biblioteca").click();
    cy.url().should("include", "/leituras");
    cy.contains("Armazenamento Local").should("be.visible");

    cy.contains("a", "Leitor").click();
    cy.url().should("eq", `${Cypress.config().baseUrl}/`);
    cy.contains("Arraste seu PDF aqui ou selecione").should("be.visible");
  });

  it("deve abrir e permitir configuração da chave do Gemini pelo modal", () => {
    cy.get('button[aria-label*="Conectar chave Gemini"]').click();

    cy.contains("Conectar conta do Gemini (Google AI Studio)").should("be.visible");
    cy.get('input[placeholder="AIza..."]').should("be.visible");

    // Tenta salvar chave curta (inválida)
    cy.get('input[placeholder="AIza..."]').type("curta");
    cy.contains("button", "Salvar chave").click();
    cy.contains("Informe uma chave válida do Google AI Studio.").should("be.visible");

    // Salva chave válida
    cy.get('input[placeholder="AIza..."]').clear().type("AIzaSyFakeKeyForTesting123456");
    cy.contains("button", "Salvar chave").click();

    // Modal deve fechar e botão do header mudar para conectado
    cy.contains("Conta Gemini conectada neste navegador.").should("be.visible");
    cy.get('button[aria-label*="Chave Gemini conectada"]').should("be.visible");
  });
});
