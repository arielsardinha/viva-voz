describe("Fluxo de Contato com o Desenvolvedor e Contribuição Open Source", () => {
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

  it("deve abrir o modal de contato a partir do AppHeader e exibir a aba de Contato por padrão", () => {
    cy.get('[data-cy="developer-contact-trigger"]').first().should("be.visible").click();

    cy.get('[role="dialog"][data-webmcp-tool="contactDeveloper"]').should("be.visible");
    cy.get('[data-cy="developer-dialog-tabs"]').should("be.visible");

    // Valida aba ativa de Contato
    cy.get('[data-cy="tab-contact-trigger"]').should("have.attr", "data-state", "active");
    cy.contains("Falar com o Desenvolvedor").should("be.visible");

    // Valida cards de orientação e e-mail
    cy.contains("Sugerir Novos Recursos").should("exist");
    cy.contains("Usabilidade & Acessibilidade").should("exist");
    cy.contains("Vozes Neurais & Narração").should("exist");
    cy.contains("Dúvidas, Parcerias ou Feedback").should("exist");

    cy.get('[data-cy="contact-email-btn"]').should("be.visible");
    cy.get('input[aria-label="E-mail do desenvolvedor"]').should(
      "have.value",
      "ariel.contato.dev@gmail.com"
    );

    // Não deve conter opções indesejadas
    cy.contains("Reportar Erro").should("not.exist");
    cy.contains("Falar via WhatsApp").should("not.exist");
  });

  it("deve alternar para a aba 'Contribuir' e interagir com links open source e clone", () => {
    cy.get('[data-cy="developer-contact-trigger"]').first().should("be.visible").click();

    // Alterna para a aba de Contribuição
    cy.get('[data-cy="tab-contribute-trigger"]').should("be.visible").click();
    cy.get('[data-cy="tab-contribute-trigger"]').should("have.attr", "data-state", "active");

    // Valida conteúdo open source
    cy.contains("Projeto 100% Livre & Código Aberto").should("be.visible");
    cy.contains("Código & Features").should("exist");
    cy.contains("Design & A11y").should("exist");
    cy.contains("IA & Vozes").should("exist");
    cy.contains("Issues & Ideias").should("exist");

    // Valida links do GitHub
    cy.get('[data-cy="github-repo-link"]')
      .should("have.attr", "href", "https://github.com/arielsardinha/viva-voz")
      .and("have.attr", "target", "_blank");

    cy.get('[data-cy="github-issues-link"]')
      .should("have.attr", "href", "https://github.com/arielsardinha/viva-voz/issues")
      .and("have.attr", "target", "_blank");

    // Valida campo de clone e botão de cópia
    cy.get('input[aria-label="Comando de clone do Git"]').should(
      "have.value",
      "git clone https://github.com/arielsardinha/viva-voz.git"
    );

    cy.get('[data-cy="copy-clone-cmd-btn"]').should("be.visible").click();
    cy.contains("Copiado!").should("exist");

    // Valida passos de como começar
    cy.contains("Como enviar sua primeira contribuição:").should("be.visible");
    cy.contains("Faça um Fork do repositório no GitHub").should("exist");

    // Fecha o modal pelo botão de voltar
    cy.contains("Voltar ao início").click();
    cy.get('[role="dialog"]').should("not.exist");
  });
});
