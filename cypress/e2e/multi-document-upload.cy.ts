describe("Tier 1: Multi-Document Architecture & Quick Paste E2E", () => {
  beforeEach(() => {
    // Configura preferências iniciais e limpa storage
    cy.window().then((win) => {
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
    });
    cy.visit("/");
  });

  it("deve exibir a dropzone com suporte aos formatos do Tier 1 e anotações WebMCP", () => {
    cy.get('section[data-webmcp-tool="uploadDocument"]').should("exist");
    cy.contains("PDF").should("be.visible");
    cy.contains("EPUB").should("be.visible");
    cy.contains("DOCX").should("be.visible");
    cy.contains("TXT").should("be.visible");
    cy.contains("MD").should("be.visible");
  });

  it("deve abrir o modal de Colar Texto (Quick Paste) e criar uma nova leitura", () => {
    cy.contains("Colar Texto").click();

    cy.get('div[data-webmcp-tool="quickPasteDocument"]').should("be.visible");
    cy.get('input[name="title"]').type("Nota de Estudos E2E");
    cy.get('textarea[name="content"]').type(
      "Esta é a primeira sentença para validação E2E. E aqui está a segunda frase com detalhes."
    );

    // Valida contagem de palavras e estimativa de áudio
    cy.contains(/palavras/i).should("be.visible");
    cy.contains(/min de áudio/i).should("be.visible");

    cy.contains("button", "Criar Leitura").click();

    // Deve carregar o player com o título da nota e as sentenças
    cy.contains("Nota de Estudos E2E").should("be.visible");
    cy.contains("Esta é a primeira sentença para validação E2E.").should("be.visible");
  });

  it("deve permitir upload de arquivo .txt e reprodução no player", () => {
    const textContent =
      "Capítulo 1 de teste. O VivaVoz converte arquivos texto com extrema fluidez e fidelidade.";
    cy.get('input[type="file"]').selectFile(
      {
        contents: Cypress.Buffer.from(textContent),
        fileName: "resumo-livro.txt",
        mimeType: "text/plain",
      },
      { force: true }
    );

    cy.contains("resumo-livro").should("be.visible");
    cy.contains("Capítulo 1 de teste.").should("be.visible");
  });

  it("deve exibir e filtrar documentos por badges de formato na biblioteca", () => {
    // Cria uma nota via Quick Paste primeiro
    cy.contains("Colar Texto").click();
    cy.get('input[name="title"]').type("Artigo de Teste");
    cy.get('textarea[name="content"]').type("Texto rápido para aparecer na biblioteca.");
    cy.contains("button", "Criar Leitura").click();

    // Navega para a biblioteca
    cy.visit("/leituras");

    cy.contains("Artigo de Teste").should("be.visible");
    cy.contains("NOTA").should("be.visible");

    // Testa filtro de categoria por formato
    cy.get('div[role="toolbar"]').within(() => {
      cy.contains("Notas").click();
    });

    cy.contains("Artigo de Teste").should("be.visible");
  });
});
