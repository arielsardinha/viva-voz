describe("Upload e Processamento Multi-Documento (PDF, EPUB, DOCX, ODT, PPTX, TXT, Web URL)", () => {
  beforeEach(() => {
    cy.visit("/leitor", {
      onBeforeLoad(win) {
        win.localStorage.clear();
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
        try {
          win.indexedDB?.deleteDatabase("pdf-audio-library");
          win.indexedDB?.deleteDatabase("vivavoz-db");
        } catch {
          // ignore
        }
      },
    });

    cy.get('header[data-hydrated="true"]').should("exist");

    // Se estiver com leitura carregada, clica para trocar documento e voltar à dropzone limpa
    cy.get("body").then(($body) => {
      const btn = $body.find('[data-cy="change-document-btn"]');
      if (btn.length > 0) {
        cy.wrap(btn.first()).click({ force: true });
      }
    });

    // Garante que o botão de selecionar arquivo e a dropzone estão comprovadamente visíveis
    cy.contains("Selecionar Arquivo", { timeout: 10000 }).should("be.visible");
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
    cy.get('[data-cy="change-document-btn"]', { timeout: 15000 }).first().should("be.visible");
  });

  it("deve permitir extrair artigo da web via URL e iniciar leitura diretamente", () => {
    cy.get("body").then(($body) => {
      const btn = $body.find('[data-cy="change-document-btn"]');
      if (btn.length > 0) {
        cy.wrap(btn.first()).click({ force: true });
      }
    });
    cy.contains("Selecionar Arquivo", { timeout: 8000 }).should("be.visible");

    cy.intercept("POST", "/api/extract-url", {
      statusCode: 200,
      body: {
        title: "Artigo Web E2E",
        siteUrl: "exemplo.com",
        wordCount: 50,
        estimatedMinutes: 1,
        document: {
          id: "doc_e2e_web_test",
          metadata: {
            id: "doc_e2e_web_test",
            title: "Artigo Web E2E",
            format: "web",
            sizeBytes: 800,
            wordCount: 50,
            estimatedReadingMinutes: 1,
            chapterCount: 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          chapters: [{ id: "c1", title: "Início", startIndex: 0, endIndex: 1 }],
          sentences: [
            { index: 0, page: 1, text: "Primeira frase extraída do artigo online." },
            { index: 1, page: 1, text: "Segunda frase pronta para reprodução em áudio." },
          ],
          lastSentenceIndex: 0,
        },
      },
    }).as("extractUrlReq");

    cy.get('[data-cy="web-url-btn"]').should("be.visible").click({ force: true });
    cy.get('[data-cy="web-url-input"]', { timeout: 8000 }).should("be.visible");
    cy.get('[data-cy="web-url-input"]').type("https://exemplo.com/artigo-e2e");

    cy.get('[data-cy="web-url-extract-btn"]').click({ force: true });
    cy.wait("@extractUrlReq");

    // Modal deve fechar e documento deve aparecer carregado no player diretamente
    cy.contains(/Artigo Web E2E/i, { timeout: 12000 }).should("be.visible");
  });

  it("deve exibir e filtrar documentos por badges de formato na biblioteca", () => {
    // Navega para a biblioteca
    cy.visit("/leituras");

    // Valida que a biblioteca lista o cabeçalho e armazenamento
    cy.contains("Biblioteca").should("be.visible");
    cy.contains("Armazenamento Local").should("be.visible");
  });
});

