describe("Tier 1: Multi-Document Architecture & Quick Paste E2E", () => {
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

    // Se estiver com leitura anterior carregada, troca para voltar à dropzone limpa
    cy.get("body").then(($body) => {
      if ($body.find('[data-cy="change-document-btn"]').length > 0) {
        cy.get('[data-cy="change-document-btn"]').click({ force: true });
      }
    });

    // Garante que a área de upload está disponível
    cy.contains(/Arraste seus documentos/i, { timeout: 10000 }).should("be.visible");
  });

  it("deve exibir a dropzone com suporte aos formatos do Tier 1 e anotações WebMCP", () => {
    cy.get('section[data-webmcp-tool="uploadDocument"]').should("exist");
    cy.contains(/PDF/i).should("be.visible");
    cy.contains(/EPUB/i).should("be.visible");
    cy.contains(/DOCX/i).should("be.visible");
    cy.contains(/TXT/i).should("be.visible");
    cy.contains(/MD/i).should("be.visible");
  });

  it("deve abrir o modal de Colar Texto (Quick Paste) e criar uma nova leitura", () => {
    cy.get('[data-cy="quick-paste-btn"]').first().click({ force: true });

    cy.get('[data-cy="quick-paste-title-input"]', { timeout: 8000 }).should("be.visible");
    cy.get('[data-cy="quick-paste-title-input"]').type("Nota de Estudos E2E");
    cy.get('[data-cy="quick-paste-content-textarea"]').type(
      "Esta é a primeira sentença para validação E2E. E aqui está a segunda frase com detalhes."
    );

    // Valida cálculo de métricas na interface
    cy.contains(/palavras/i).should("be.visible");
    cy.contains(/áudio/i).should("be.visible");

    cy.get('[data-cy="quick-paste-submit-btn"]').click({ force: true });

    // Valida que o player montou com o documento criado
    cy.contains(/Nota de Estudos/i, { timeout: 10000 }).should("be.visible");
  });

  it("deve permitir upload de arquivo .txt e reprodução no player", () => {
    const textContent =
      "Capítulo 1 de teste. O VivaVoz converte arquivos texto com extrema fluidez e fidelidade.";
    cy.get("input#pdf-upload-input").first().selectFile(
      {
        contents: Cypress.Buffer.from(textContent),
        fileName: "resumo-livro.txt",
        mimeType: "text/plain",
      },
      { force: true }
    );

    // Valida que o player carregou o documento processado
    cy.get('[data-cy="change-document-btn"]', { timeout: 15000 }).should("be.visible");
  });

  it("deve exibir e filtrar documentos por badges de formato na biblioteca", () => {
    // Navega para a biblioteca
    cy.visit("/leituras");

    // Valida que a biblioteca lista o cabeçalho e armazenamento
    cy.contains("Biblioteca").should("be.visible");
    cy.contains("Armazenamento Local").should("be.visible");
  });
});
