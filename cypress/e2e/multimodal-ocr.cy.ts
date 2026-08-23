describe("E2E: OCR Multimodal com Google Gemini Vision", () => {
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

    cy.get("body").then(($body) => {
      const btn = $body.find('[data-cy="change-document-btn"]');
      if (btn.length > 0) {
        cy.wrap(btn.first()).click({ force: true });
      }
    });

    cy.contains("Selecionar Arquivo", { timeout: 10000 }).should("be.visible");
  });

  it("deve exibir a dropzone com badge de suporte a OCR e formatos de imagem", () => {
    cy.get('section[data-webmcp-tool="uploadDocument"]').should("exist");
    cy.contains(/OCR/i).should("be.visible");
    cy.contains(/fotos/i).should("be.visible");
  });

  it("deve permitir upload de imagem (.png) com OCR e transição para o leitor de áudio", () => {
    cy.intercept("POST", "/api/ocr/gemini", {
      statusCode: 200,
      body: {
        text: "Frase extraída via OCR da foto da página. Segunda frase reconhecida com perfeição.",
      },
    }).as("ocrRequest");

    // 1x1 pixel PNG transparente em base64
    const pngBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    const pngBlob = Cypress.Buffer.from(pngBase64, "base64");

    cy.get("input#pdf-upload-input").first().selectFile(
      {
        contents: pngBlob,
        fileName: "foto-pagina-livro.png",
        mimeType: "image/png",
      },
      { force: true }
    );

    // Valida que o player montou com o documento criado a partir da imagem
    cy.get('[data-cy="change-document-btn"]', { timeout: 15000 }).first().should("be.visible");
    cy.contains(/foto-pagina-livro/i, { timeout: 10000 }).should("be.visible");
  });

  it("deve exibir documento OCR com badge temático na Biblioteca (/leituras)", () => {
    cy.intercept("POST", "/api/ocr/gemini", {
      statusCode: 200,
      body: {
        text: "Texto escaneado de apostila universitária. Parágrafo complementar de estudo.",
      },
    });

    const pngBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    const pngBlob = Cypress.Buffer.from(pngBase64, "base64");

    cy.get("input#pdf-upload-input").first().selectFile(
      {
        contents: pngBlob,
        fileName: "apostila-foto.png",
        mimeType: "image/png",
      },
      { force: true }
    );

    cy.get('[data-cy="change-document-btn"]', { timeout: 15000 }).first().should("be.visible");

    // Navega para a Biblioteca
    cy.visit("/leituras");
    cy.contains(/Biblioteca/i, { timeout: 8000 }).should("be.visible");

    // Valida que o documento está na lista com badge OCR
    cy.contains(/apostila-foto/i).should("be.visible");
    cy.contains("OCR").should("be.visible");
  });
});
