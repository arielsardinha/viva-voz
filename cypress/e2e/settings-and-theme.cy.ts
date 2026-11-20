describe("Temas e Configurações de Leitura", () => {
  beforeEach(() => {
    cy.visit("/leitor", {
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

  it("deve carregar todas as 5 fontes auto-hospedadas localmente sem depender do Google Fonts externo e manter acessibilidade semântica", () => {
    const expectedVariables = [
      "--font-inter",
      "--font-merriweather",
      "--font-lora",
      "--font-roboto",
      "--font-literata",
    ];

    cy.document().then((doc) => {
      const rootStyle = doc.defaultView?.getComputedStyle(doc.documentElement);
      expect(rootStyle).to.not.equal(undefined);

      for (const cssVar of expectedVariables) {
        const value = rootStyle?.getPropertyValue(cssVar).trim() ?? "";
        expect(value.length, `Variavel CSS ${cssVar} deve estar definida`).to.be.greaterThan(0);
      }

      const externalFontLinks = doc.head.querySelectorAll(
        'link[href*="fonts.googleapis.com"], link[href*="fonts.gstatic.com"]'
      );
      expect(externalFontLinks.length).to.eq(0);
    });

    cy.window().then((win) => {
      const externalRequests = win.performance
        .getEntriesByType("resource")
        .filter(
          (entry) =>
            entry.name.includes("fonts.googleapis.com") ||
            entry.name.includes("fonts.gstatic.com")
        );
      expect(externalRequests.length).to.eq(0);
    });

    // Valida landmarks e acessibilidade da árvore semântica antes de abrir o tutorial
    cy.get("header[role='banner']").should("exist").and("be.visible");
    cy.get("nav[aria-label='Navegação principal']").should("exist");
    cy.get("main").should("exist").and("be.visible");
    cy.get("button").each(($btn) => {
      const hasText = $btn.text().trim().length > 0;
      const hasAriaLabel = Boolean($btn.attr("aria-label")?.trim());
      const hasTitle = Boolean($btn.attr("title")?.trim());
      expect(hasText || hasAriaLabel || hasTitle).to.eq(true);
    });

    // Abre o tutorial de preferências e navega até a etapa de Tipografia
    cy.get('[data-cy="theme-dropdown-trigger"]').first().should("be.visible").click();
    cy.get('[data-cy="reopen-tutorial-item"]').first().should("be.visible").click();
    cy.get('[data-cy="onboarding-dialog"]').should("be.visible");

    cy.get('[data-cy="start-journey-btn"]').click();
    cy.get('[data-cy="next-step-btn"]').click();
    cy.get('[data-cy="next-step-btn"]').click();

    // Seleciona Roboto e valida a classe + fontFamily computada no preview
    cy.get('[data-cy="font-option-roboto"]').should("be.visible").click();
    cy.get('[data-cy="onboarding-dialog"] p.font-roboto')
      .should("be.visible")
      .then(($el) => {
        const computedFontFamily = winGetComputedFontFamily($el[0]);
        expect(computedFontFamily.length).to.be.greaterThan(0);
      });
  });
});

function winGetComputedFontFamily(el: HTMLElement): string {
  const view = el.ownerDocument.defaultView;
  return view ? view.getComputedStyle(el).fontFamily.trim() : "";
}
