describe("Fluxo de Contribuição Voluntária & Apoio Pix / GitHub", () => {
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

  it("deve abrir o modal de apoio a partir do AppHeader e navegar entre as abas Pix e Desenvolvimento", () => {
    cy.get('[data-cy="support-project-btn"]').should("be.visible").click();

    cy.get('[role="dialog"][data-webmcp-tool="supportProject"]').should("be.visible");
    cy.get('[role="tab"]').contains("Doação Pix").should("be.visible");
    cy.get('[role="tab"]').contains("Desenvolvimento").should("be.visible");

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

    // Alterna para a aba 'Desenvolvimento'
    cy.get('[role="tab"]').contains("Desenvolvimento").click();

    // Valida conteúdo da aba Desenvolvimento
    cy.contains("Código Aberto & Comunidade").should("be.visible");
    cy.contains("Deixar uma Estrela (Star)").should("exist");
    cy.contains("Sugerir Ideias & Recursos").should("exist");
    cy.contains("Relatar Problemas").should("exist");
    cy.contains("Contribuir com Código").should("exist");

    cy.contains("Ver Repositório no GitHub")
      .should("have.attr", "href", "https://github.com/arielsardinha/viva-voz")
      .should("have.attr", "target", "_blank");

    cy.get('input[aria-label="Link do Repositório no GitHub"]').should(
      "have.value",
      "https://github.com/arielsardinha/viva-voz"
    );

    // Fecha o modal pelo botão 'Voltar ao início'
    cy.contains("Voltar ao início").click({ force: true });
    cy.get('[role="dialog"]').should("not.exist");
  });

  it("deve carregar a página dedicada /apoiar com abas Pix e Desenvolvimento e links funcionais", () => {
    cy.visit("/apoiar");
    cy.get('main[data-webmcp-tool="supportProject"]').should("be.visible");
    cy.get("h1").should("contain.text", "Apoie o VivaVoz");

    cy.get('[role="tab"]').contains("Doação Pix").should("be.visible");
    cy.get('[role="tab"]').contains("Desenvolvimento").should("be.visible");

    cy.get('input[aria-label="Chave Pix Aleatória"]').should(
      "have.value",
      "d1b12e3a-a8db-4164-a580-91b6a172e77a"
    );

    // Alterna para a aba 'Desenvolvimento'
    cy.get('[role="tab"]').contains("Desenvolvimento").click();
    cy.contains("Código Aberto & Comunidade").should("be.visible");
    cy.contains("Ver Repositório no GitHub")
      .should("have.attr", "href", "https://github.com/arielsardinha/viva-voz");

    // Valida link de retorno ao leitor
    cy.contains("Voltar ao Leitor").should("be.visible").click();
    cy.location("pathname").should("eq", "/");
  });
});
