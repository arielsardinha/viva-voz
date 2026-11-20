function createValidWavBuffer() {
  const sampleBytes = 4800; // ~0.1s de áudio PCM 24kHz 16-bit mono
  const buffer = new ArrayBuffer(44 + sampleBytes);
  const view = new DataView(buffer);
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + sampleBytes, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 24000, true);
  view.setUint32(28, 48000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, sampleBytes, true);
  return Cypress.Buffer.from(new Uint8Array(buffer));
}

function setupCleanReader(viewportWidth?: number, viewportHeight?: number) {
  cy.clearCookies();
  if (viewportWidth && viewportHeight) {
    cy.viewport(viewportWidth, viewportHeight);
  }
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
        }),
      );
      try {
        win.indexedDB?.deleteDatabase("pdf-audio-library");
        win.indexedDB?.deleteDatabase("vivavoz-db");
      } catch {
        // Ignora erro caso IndexedDB ainda não exista
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
}

function connectGeminiKeyViaModal(isMobile = false) {
  if (isMobile) {
    cy.get('[data-cy="mobile-menu-trigger"]').should("be.visible").click();
    cy.get('[data-cy="mobile-gemini-key-item"]').should("be.visible").click();
  } else {
    cy.get("[data-cy='theme-dropdown-trigger']").first().should("be.visible").click();
    cy.get('[data-cy="gemini-key-trigger"]').should("be.visible").click();
  }
  cy.get('[data-cy="gemini-key-input"]').clear().type("AIzaSyTestFallbackKey123456");
  cy.get('[data-cy="gemini-key-save-btn"]').click();
  cy.contains("Conectar conta do Gemini (Google AI Studio)").should("not.exist");
  cy.contains("Conta Gemini conectada").should("exist");
}

function createSampleReadingViaQuickPaste() {
  cy.get('[data-cy="quick-paste-btn"]').first().click({ force: true });
  cy.get('[data-cy="quick-paste-title-input"]', { timeout: 8000 })
    .should("be.visible")
    .type("Teste TTS Fallback");
  cy.get('[data-cy="quick-paste-content-textarea"]').type(
    "Primeira frase do teste. Segunda frase complementar. Terceira frase final.",
  );
  cy.get('[data-cy="quick-paste-submit-btn"]').click({ force: true });
  cy.contains(/Teste TTS Fallback/i, { timeout: 10000 }).should("be.visible");
  cy.get("[data-sonner-toast]", { timeout: 10000 }).should("not.exist");
}

describe("TTS Gemini Fallback, Agrupamento em Blocos e Responsividade E2E", () => {
  it("deve agrupar frases em bloco único e exibir indicador discreto e toast amigável quando ocorrer fallback", () => {
    setupCleanReader(1280, 800);
    connectGeminiKeyViaModal(false);
    createSampleReadingViaQuickPaste();

    cy.intercept("POST", "/api/tts", (req) => {
      req.reply({
        statusCode: 200,
        headers: {
          "content-type": "audio/wav",
          "x-tts-model": "gemini-3.8-flash-lite-tts",
          "x-tts-model-label": "Gemini 3.8 Flash-Lite TTS",
          "x-tts-fallback": "true",
        },
        body: createValidWavBuffer(),
      });
    }).as("ttsFallbackReq");

    cy.get('[data-cy="floating-voice-trigger"]').should("be.visible").click();
    cy.contains('[role="menuitemradio"]', "Google (IA)").should("be.visible").click();

    cy.get('button[aria-label="Reproduzir"]:visible').click();

    cy.wait("@ttsFallbackReq").then((interception) => {
      const sentText = interception.request.body?.text as string;
      expect(sentText).to.include("Primeira frase do teste.");
      expect(sentText).to.include("Segunda frase complementar.");
      expect(sentText).to.include("Terceira frase final.");
    });

    cy.get('[data-cy="tts-model-indicator"]:visible')
      .should("be.visible")
      .and("have.attr", "data-tts-model", "gemini-3.8-flash-lite-tts")
      .and("have.attr", "data-tts-fallback", "true")
      .and("contain.text", "3.8 Lite");

    cy.get('[data-cy="tts-model-indicator"]:visible')
      .invoke("text")
      .should("not.match", /\b(429|403|500)\b|env/i);

    cy.contains("Gemini 3.8 Flash-Lite TTS").should("exist");
  });

  it("deve alternar para vozes gratuitas do sistema com mensagem amigável quando toda a cascata retornar 429", () => {
    setupCleanReader(1280, 800);
    connectGeminiKeyViaModal(false);
    createSampleReadingViaQuickPaste();

    cy.intercept("POST", "/api/tts", {
      statusCode: 429,
      body: {
        error:
          "Cota de narração com IA esgotada ou limite de requisições atingido. Alterne para as vozes gratuitas do sistema ou aguarde alguns instantes.",
      },
    }).as("ttsExhaustedReq");

    cy.get('[data-cy="floating-voice-trigger"]').should("be.visible").click();
    cy.contains('[role="menuitemradio"]', "Google (IA)").should("be.visible").click();

    cy.get('button[aria-label="Reproduzir"]:visible').click();
    cy.wait("@ttsExhaustedReq");

    cy.contains("Alternando automaticamente para as vozes gratuitas do sistema", {
      timeout: 8000,
    }).should("exist");
  });

  it("deve manter layout acessível e sem overflow horizontal em mobile 370x667 com indicador de fallback visível", () => {
    setupCleanReader(370, 667);
    connectGeminiKeyViaModal(true);
    createSampleReadingViaQuickPaste();

    cy.intercept("POST", "/api/tts", (req) => {
      req.reply({
        statusCode: 200,
        headers: {
          "content-type": "audio/wav",
          "x-tts-model": "gemini-3.8-flash-lite-tts",
          "x-tts-model-label": "Gemini 3.8 Flash-Lite TTS",
          "x-tts-fallback": "true",
        },
        body: createValidWavBuffer(),
      });
    }).as("ttsMobileReq");

    cy.get('button[aria-label="Selecionar voz e motor mobile"]').should("be.visible").click();
    cy.contains('[role="menuitemradio"]', "Google (IA)").should("be.visible").click();

    cy.get('button[aria-label="Reproduzir"]:visible').click();
    cy.wait("@ttsMobileReq");

    cy.get('[data-cy="tts-model-indicator"]:visible')
      .should("be.visible")
      .and("contain.text", "3.8 Lite");

    cy.window().then((win) => {
      expect(win.document.documentElement.scrollWidth).to.be.lte(
        win.document.documentElement.clientWidth,
      );
    });

    cy.get("button:visible").each(($btn) => {
      const hasText = $btn.text().trim().length > 0;
      const hasAriaLabel = Boolean($btn.attr("aria-label")?.trim());
      const hasTitle = Boolean($btn.attr("title")?.trim());
      expect(hasText || hasAriaLabel || hasTitle).to.eq(true);
    });
  });
});
