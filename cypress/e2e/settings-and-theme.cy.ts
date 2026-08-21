describe("Temas e Configurações de Leitura", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("deve alternar o tema entre Clean, Papel Zen e Escuro e refletir no atributo data-reading-theme", () => {
    // Abre dropdown de temas
    cy.get('button[aria-label="Alternar tema de leitura"]').click();

    // Seleciona Papel Zen (sépia)
    cy.contains("Papel Zen (Sépia)").click();
    cy.get("html").should("have.attr", "data-reading-theme", "sepia");

    // Abre novamente e seleciona Escuro
    cy.get('button[aria-label="Alternar tema de leitura"]').click();
    cy.contains("Escuro (Midnight)").click();
    cy.get("html").should("have.attr", "data-reading-theme", "dark");
    cy.get("html").should("have.class", "dark");

    // Retorna para Clean (claro)
    cy.get('button[aria-label="Alternar tema de leitura"]').click();
    cy.contains("Clean (Claro)").click();
    cy.get("html").should("have.attr", "data-reading-theme", "light");
    cy.get("html").should("not.have.class", "dark");
  });

  it("deve persistir a escolha do tema no localStorage após recarregar a página", () => {
    cy.get('button[aria-label="Alternar tema de leitura"]').click();
    cy.contains("Escuro (Midnight)").click();
    cy.get("html").should("have.attr", "data-reading-theme", "dark");

    // Recarrega a página
    cy.reload();
    cy.get("html").should("have.attr", "data-reading-theme", "dark");
    cy.get("html").should("have.class", "dark");
  });
});
