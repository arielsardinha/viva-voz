describe("Temas e Configurações de Leitura", () => {
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

  it("deve alternar o tema entre Clean, Papel Zen e Escuro e refletir no atributo data-reading-theme", () => {
    cy.contains("VivaVoz").should("be.visible");
    cy.contains("Arraste seus documentos aqui").should("be.visible");

    // Abre dropdown de temas
    cy.get('[data-cy="theme-dropdown-trigger"]').should("be.visible").click();

    // Seleciona Papel Zen (sépia)
    cy.get('[data-cy="theme-item-sepia"]').should("be.visible").click();
    cy.get("html").should("have.attr", "data-reading-theme", "sepia");
    cy.get('[data-cy="theme-item-sepia"]').should("not.exist");

    // Abre novamente e seleciona Escuro
    cy.get('[data-cy="theme-dropdown-trigger"]').click();
    cy.get('[data-cy="theme-item-dark"]').should("be.visible").click();
    cy.get("html").should("have.attr", "data-reading-theme", "dark");
    cy.get("html").should("have.class", "dark");
    cy.get('[data-cy="theme-item-dark"]').should("not.exist");

    // Retorna para Clean (claro)
    cy.get('[data-cy="theme-dropdown-trigger"]').click();
    cy.get('[data-cy="theme-item-light"]').should("be.visible").click();
    cy.get("html").should("have.attr", "data-reading-theme", "light");
    cy.get("html").should("not.have.class", "dark");
  });

  it("deve persistir a escolha do tema no localStorage após recarregar a página", () => {
    cy.contains("VivaVoz").should("be.visible");
    cy.contains("Arraste seus documentos aqui").should("be.visible");

    cy.get('[data-cy="theme-dropdown-trigger"]').should("be.visible").click();
    cy.get('[data-cy="theme-item-dark"]').should("be.visible").click();
    cy.get("html").should("have.attr", "data-reading-theme", "dark");

    // Recarrega a página
    cy.reload();
    cy.get('header[data-hydrated="true"]').should("exist");
    cy.get("html").should("have.attr", "data-reading-theme", "dark");
    cy.get("html").should("have.class", "dark");
  });
});
