describe("Auditoria de Qualidade com Google Lighthouse", () => {
  beforeEach(() => {
    // Configura preferências iniciais para inicializar a aplicação com onboarding concluído
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

  it("deve atender aos thresholds de qualidade na Página Inicial (Home)", () => {
    // Garante que a Home e a dropzone foram renderizadas
    cy.contains("VivaVoz").should("be.visible");
    cy.contains("Arraste seu PDF aqui").should("be.visible");

    // Executa auditoria do Lighthouse no Leitor / Home
    cy.lighthouse(
      {
        accessibility: 90,
        "best-practices": 80,
        seo: 80,
      },
      {
        formFactor: "desktop",
        screenEmulation: {
          mobile: false,
          width: 1280,
          height: 800,
          deviceScaleFactor: 1,
          disabled: false,
        },
      }
    );
  });

  it("deve manter acessibilidade elevada no Modal de Conexão com Gemini", () => {
    // Abre o modal de configuração de chave Gemini
    cy.get('[data-cy="gemini-key-trigger"]').should("be.visible").click();
    cy.contains("Conectar conta do Gemini").should("be.visible");

    // Audita acessibilidade no estado com o diálogo aberto
    cy.lighthouse(
      {
        accessibility: 85,
      },
      {
        formFactor: "desktop",
        screenEmulation: {
          mobile: false,
          width: 1280,
          height: 800,
          deviceScaleFactor: 1,
          disabled: false,
        },
      }
    );
  });

  it("deve atender aos critérios de qualidade na página da Biblioteca (/leituras)", () => {
    // Navega para a Biblioteca
    cy.contains("a", "Biblioteca").click();
    cy.url().should("include", "/leituras");
    cy.contains("Armazenamento Local").should("be.visible");

    // Executa auditoria do Lighthouse na Biblioteca
    cy.lighthouse(
      {
        accessibility: 90,
        "best-practices": 80,
        seo: 80,
      },
      {
        formFactor: "desktop",
        screenEmulation: {
          mobile: false,
          width: 1280,
          height: 800,
          deviceScaleFactor: 1,
          disabled: false,
        },
      }
    );
  });
});
