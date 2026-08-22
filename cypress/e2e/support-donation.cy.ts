describe("Fluxo de Contribuição Voluntária & Apoio Pix", () => {
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
  });

  it("deve abrir o modal de apoio a partir do AppHeader e exibir dados do Pix diretamente", () => {
    cy.get('[data-cy="support-project-btn"]').should("be.visible").click();

    cy.get('[role="dialog"][data-webmcp-tool="supportProject"]').should("be.visible");
    cy.get('[role="tab"]').should("not.exist");
    cy.contains("Desenvolvimento").should("not.exist");
    cy.contains("Código Aberto & Comunidade").should("not.exist");

    cy.get('input[aria-label="Chave Pix Aleatória"]').should(
      "have.value",
      "d1b12e3a-a8db-4164-a580-91b6a172e77a"
    );
    cy.contains("Ariel Sardinha Moraes Santiago").should("not.exist");
    cy.contains("QR Code Pix para Contribuição Voluntária").should("not.exist");

    // Valida exibição dos motivos da contribuição voluntária na aba Pix
    cy.contains("Vozes Neurais de Estúdio").should("exist");
    cy.contains("Consultas com IA").should("exist");
    cy.contains("100% Grátis & Sem Anúncios").should("exist");
    cy.contains("Servidores Rápidos").should("exist");
    cy.contains("Apoio a Estudantes e Leitores").should("exist");

    // Valida botões de ação
    cy.contains("Copiar Código Pix (Copia e Cola)").should("exist");

    // QR Code opcional expansível
    cy.contains("Prefere escanear com a câmera? Ver QR Code").click({ force: true });
    cy.get('[data-testid="pix-qrcode-container"]').should("exist");

    // Fecha o modal pelo botão 'Voltar ao início'
    cy.contains("Voltar ao início").click({ force: true });
    cy.get('[role="dialog"]').should("not.exist");
  });

  it("deve carregar a página dedicada /apoiar diretamente com dados do Pix e link de retorno", () => {
    cy.visit("/apoiar");
    cy.get('main[data-webmcp-tool="supportProject"]').should("be.visible");
    cy.get("h1").should("contain.text", "Apoie o VivaVoz");

    cy.get('[role="tab"]').should("not.exist");
    cy.contains("Desenvolvimento").should("not.exist");
    cy.contains("Código Aberto & Comunidade").should("not.exist");

    cy.get('input[aria-label="Chave Pix Aleatória"]').should(
      "have.value",
      "d1b12e3a-a8db-4164-a580-91b6a172e77a"
    );

    // Valida link de retorno ao leitor
    cy.contains("Voltar ao Leitor").should("be.visible").click();
    cy.location("pathname").should("eq", "/");
  });
});

