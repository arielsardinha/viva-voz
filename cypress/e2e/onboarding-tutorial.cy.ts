describe("Tutorial e Onboarding de Preferências", () => {
  beforeEach(() => {
    // Limpa localStorage para simular primeiro acesso do usuário
    cy.clearLocalStorage();
  });

  it("deve exibir o tutorial no primeiro acesso e permitir 'Pular tudo'", () => {
    cy.visit("/");

    // Modal de onboarding visível
    cy.get('[data-cy="onboarding-dialog"]').should("be.visible");
    cy.contains("Personalize sua experiência de leitura").should("be.visible");
    cy.get('[data-cy="start-journey-btn"]').should("be.visible");

    // Clica em pular tudo no botão discreto superior
    cy.get('[data-cy="skip-onboarding-top-btn"]').should("be.visible").click();
    cy.get('[data-cy="onboarding-dialog"]').should("not.exist");

    // Ao recarregar, não deve abrir novamente
    cy.reload();
    cy.get('[data-cy="onboarding-dialog"]').should("not.exist");
  });

  it("deve permitir fazer a jornada completa passo a passo e aplicar as preferências", () => {
    cy.visit("/");

    // Inicia a jornada
    cy.get('[data-cy="onboarding-dialog"]').should("be.visible");
    cy.get('[data-cy="start-journey-btn"]').click();

    // Etapa 1: Modo de Leitura (Template)
    cy.contains("Escolha seu Modo de Leitura Favorito").should("be.visible");
    cy.get('[data-cy="template-option-ai-study"]').click();
    cy.get('[data-cy="next-step-btn"]').click();

    // Etapa 2: Ambiente & Tema
    cy.contains("Selecione o Ambiente & Tema Visual").should("be.visible");
    cy.get('[data-cy="theme-option-sepia"]').click();
    cy.get("html").should("have.attr", "data-reading-theme", "sepia");
    cy.get('[data-cy="next-step-btn"]').click();

    // Etapa 3: Tipografia & Tamanho
    cy.contains("Ajuste a Tipografia & Conforto Visual").should("be.visible");
    cy.get('[data-cy="font-option-literata"]').click();
    cy.contains("Ampliado").click();
    cy.get('[data-cy="next-step-btn"]').click();

    // Etapa 4: Velocidade & Teste de Voz
    cy.contains("Configure a Velocidade de Narração").should("be.visible");
    cy.get('[data-cy="speed-option-1.25x"]').click();
    cy.get('[data-cy="next-step-btn"]').click();

    // Etapa 5: Resumo e Conclusão
    cy.contains("Configurações salvas com sucesso!").should("be.visible");
    cy.contains("Assistente IA & Estudos").should("be.visible");
    cy.contains("Papel Zen (Sépia)").should("be.visible");

    // Finaliza a jornada
    cy.get('[data-cy="finish-onboarding-btn"]').click();
    cy.get('[data-cy="onboarding-dialog"]').should("not.exist");

    // Valida persistência após reload
    cy.get("html").should("have.attr", "data-reading-theme", "sepia");
    cy.reload();
    cy.get("html").should("have.attr", "data-reading-theme", "sepia");
    cy.get('[data-cy="onboarding-dialog"]').should("not.exist");
  });

  it("deve permitir reabrir o tutorial a qualquer momento pelo cabeçalho", () => {
    // Inicializa com onboarding já concluído
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

    // Aguarda a aplicação carregar
    cy.contains("VivaVoz").should("be.visible");
    cy.contains("Arraste seu PDF aqui").should("be.visible");

    // O modal não deve abrir automaticamente
    cy.get('[data-cy="onboarding-dialog"]').should("not.exist");

    // Clica no botão Tutorial do cabeçalho
    cy.get('[data-cy="open-tutorial-btn"]').should("be.visible").click({ force: true });

    // O modal abre com sucesso
    cy.get('[data-cy="onboarding-dialog"]').should("be.visible");
    cy.contains("Personalize sua experiência de leitura").should("be.visible");

    // Fecha pelo botão de fechar no topo
    cy.get('[data-cy="skip-onboarding-top-btn"]').click();
    cy.get('[data-cy="onboarding-dialog"]').should("not.exist");
  });

  it("deve renderizar com perfeita responsividade e espaçamento inferior em dispositivos móveis (370px)", () => {
    cy.viewport(370, 667);
    cy.visit("/");

    // Modal de onboarding visível e adaptado
    cy.get('[data-cy="onboarding-dialog"]').should("be.visible");
    cy.get('[data-cy="start-journey-btn"]').scrollIntoView().should("be.visible").click();

    // Etapa 1: Modo de Leitura
    cy.contains("Escolha seu Modo de Leitura Favorito").should("be.visible");
    cy.get('[data-cy="prev-step-btn"]').should("be.visible");
    cy.get('[data-cy="next-step-btn"]').should("be.visible").click();

    // Etapa 2: Ambiente & Tema
    cy.contains("Selecione o Ambiente & Tema Visual").should("be.visible");
    cy.get('[data-cy="theme-option-dark"]').click();
    cy.get('[data-cy="next-step-btn"]').click();

    // Etapa 3: Tipografia & Tamanho
    cy.contains("Ajuste a Tipografia & Conforto Visual").should("be.visible");
    cy.get('[data-cy="next-step-btn"]').click();

    // Etapa 4: Velocidade
    cy.contains("Configure a Velocidade de Narração").should("be.visible");
    cy.get('[data-cy="voice-test-btn"]').should("be.visible");
    cy.get('[data-cy="next-step-btn"]').click();

    // Etapa 5: Conclusão
    cy.contains("Configurações salvas com sucesso!").should("be.visible");
    cy.get('[data-cy="finish-onboarding-btn"]').should("be.visible").click();

    cy.get('[data-cy="onboarding-dialog"]').should("not.exist");
  });
});
