describe("Biblioteca de Leituras (/leituras)", () => {
  beforeEach(() => {
    cy.visit("/leituras", {
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
  });

  it("deve carregar a página da biblioteca exibindo navegação e armazenamento", () => {
    cy.contains("Biblioteca").should("be.visible");
    cy.contains("Favoritos").should("be.visible");
    cy.contains("Armazenamento Local").should("be.visible");
    cy.get('input[placeholder="Pesquisar leituras…"]').should("be.visible");
  });

  it("deve exibir estado vazio quando não houver leituras salvas", () => {
    cy.contains("Nenhuma leitura encontrada").should("be.visible");
    cy.contains(
      "Envie um arquivo PDF, EPUB, Word ou cole um texto acima para começar a sua biblioteca com narração."
    ).should("be.visible");
  });

  it("deve alternar entre as abas Biblioteca e Favoritos na sidebar", () => {
    cy.contains("button", "Favoritos").click();
    cy.contains("Nenhuma leitura encontrada").should("be.visible");

    cy.contains("button", "Biblioteca").click();
    cy.contains("Nenhuma leitura encontrada").should("be.visible");
  });

  it("deve permitir filtrar pelas tags pré-definidas de formato", () => {
    const tags = ["Todos", "PDF", "EPUB", "DOCX", "ODT", "TXT", "MD"];

    tags.forEach((tag) => {
      cy.contains("button", tag).should("be.visible").click();
    });
  });
});
