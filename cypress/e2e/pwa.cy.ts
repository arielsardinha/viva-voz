describe("Progressive Web App (PWA) — VivaVoz", () => {
  it("deve carregar o manifesto com metadados corretos do VivaVoz", () => {
    cy.request("/manifest.webmanifest").then((response) => {
      expect(response.status).to.eq(200);
      const manifest = response.body;

      expect(manifest.short_name).to.eq("VivaVoz");
      expect(manifest.name).to.contain("VivaVoz");
      expect(manifest.display).to.eq("standalone");
      expect(manifest.start_url).to.eq("/");
      expect(manifest.icons).to.be.an("array").and.have.length.at.least(3);

      const has192 = manifest.icons.some((i: { sizes: string }) => i.sizes === "192x192");
      const has512 = manifest.icons.some((i: { sizes: string }) => i.sizes === "512x512");
      expect(has192).to.be.true;
      expect(has512).to.be.true;

      expect(manifest.shortcuts).to.be.an("array").and.have.length.at.least(2);
    });
  });

  it("deve disponibilizar o Service Worker em /sw.js", () => {
    cy.request("/sw.js").then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.include("vivavoz-app-v1");
      expect(response.body).to.include("addEventListener('install'");
      expect(response.body).to.include("addEventListener('fetch'");
    });
  });

  it("deve conter tags de manifesto e meta tags de web app no cabeçalho HTML", () => {
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

    cy.get('link[rel="manifest"]').should("have.attr", "href", "/manifest.webmanifest");
    cy.get('meta[name="application-name"]').should("have.attr", "content", "VivaVoz");
    cy.get('meta[name="apple-mobile-web-app-title"]').should("have.attr", "content", "VivaVoz");
  });

  it("deve permitir abrir o diálogo de instalação PWA através do menu", () => {
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

    // Abre o menu dropdown de tema e ajustes
    cy.get('[data-cy="theme-dropdown-trigger"]').should("be.visible").click();

    // Clica no item de instalar aplicativo
    cy.get('[data-webmcp-tool="openPwaInstallDialog"]').first().click();

    // Valida que o modal de instalação do VivaVoz é exibido com os benefícios
    cy.get('[data-webmcp-tool="installVivaVozPwa"]').should("be.visible");
    cy.contains("Instalar o VivaVoz").should("be.visible");
    cy.contains("100% Offline").should("be.visible");
    cy.contains("Ultra Rápido").should("be.visible");
    cy.contains("Tela Cheia").should("be.visible");
  });
});
