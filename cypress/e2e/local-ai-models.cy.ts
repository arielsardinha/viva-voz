/// <reference types="cypress" />

/**
 * E2E da IA Local Offline (LiteRT-LM): central dedicada /modelos (único ponto
 * de gestão, sem menu lateral), motor de TTS "IA Local (Offline)" (Kokoro 82M) e chat multimodal Gemma 4.
 *
 * Os downloads do Hugging Face são interceptados com um corpo de 16 bytes:
 * o fluxo real de streaming → Cache API → estado "Pronto offline" é exercitado
 * sem baixar centenas de MB. Nenhum teste dispara inferência real.
 */

const MODELS_CACHE_NAME = "vivavoz-local-ai-models-v1";
const KOKORO_ID = "kokoro-82m-tts";
const GEMMA_ID = "gemma-4-e2b-chat";
const MOCK_MODEL_BODY = "mock-litertlm-16";

type ReaderTemplate = "ai-study" | "zen";

function mockModelDownloads() {
  cy.intercept("GET", "https://huggingface.co/**", {
    statusCode: 206,
    headers: {
      "content-type": "application/octet-stream",
      "content-length": String(MOCK_MODEL_BODY.length),
      "content-range": `bytes 0-${MOCK_MODEL_BODY.length - 1}/${MOCK_MODEL_BODY.length}`,
      "access-control-allow-origin": "*",
      "access-control-expose-headers": "content-length, content-range",
    },
    body: MOCK_MODEL_BODY,
  }).as("modelDownload");
}

/** Limpa Cache API, IndexedDB e preferências antes de cada cenário. */
function resetLocalState() {
  cy.clearCookies();
  // Qualquer página HTML do mesmo origin dá acesso à Cache API e ao IndexedDB.
  cy.visit("/apoiar");
  cy.window().then(async (win) => {
    win.localStorage.clear();
    await win.caches.delete(MODELS_CACHE_NAME);
    win.indexedDB.deleteDatabase("pdf-audio-library");
    win.indexedDB.deleteDatabase("vivavoz-db");
  });
}

function visitWithSettings(path: string, template: ReaderTemplate = "ai-study") {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem(
        "vivavoz-reader-settings",
        JSON.stringify({
          template,
          theme: "light",
          font: "inter",
          fontSize: 16,
          lineHeight: 1.8,
          hasCompletedOnboarding: true,
        }),
      );
    },
  });
  cy.get('header[data-hydrated="true"]').should("exist");
}

function downloadModelFromCard(modelId: string) {
  cy.get(`[data-cy="download-model-${modelId}"]:visible`).first().click();
  cy.wait("@modelDownload");
  cy.get(`[data-cy="model-status-${modelId}"]:visible`, { timeout: 10000 })
    .first()
    .should("contain.text", "Pronto offline");
}

function createReadingViaQuickPaste(title: string) {
  cy.get("body").then(($body) => {
    const btn = $body.find('[data-cy="change-document-btn"]');
    if (btn.length > 0) cy.wrap(btn.first()).click({ force: true });
  });
  cy.get('[data-cy="quick-paste-btn"]').first().click({ force: true });
  cy.get('[data-cy="quick-paste-title-input"]', { timeout: 8000 })
    .should("be.visible")
    .type(title);
  cy.get('[data-cy="quick-paste-content-textarea"]').type(
    "Primeira frase local. Segunda frase offline. Terceira frase final.",
  );
  cy.get('[data-cy="quick-paste-submit-btn"]').click({ force: true });
  cy.contains(title, { timeout: 10000 }).should("be.visible");
}

function openVoiceMenu() {
  // O dock flutuante entra com animação após a navegação client-side de volta ao leitor.
  cy.get('[data-cy="floating-voice-trigger"]:visible', { timeout: 10000 })
    .first()
    .click();
}

function assertNoHorizontalOverflow() {
  cy.document().then((doc) => {
    const root = doc.documentElement;
    expect(root.scrollWidth, "scrollWidth da página").to.be.at.most(
      root.clientWidth,
    );
  });
}

function checkA11yOn(context: string) {
  cy.injectAxe();
  cy.checkA11y(context, {
    includedImpacts: ["critical", "serious"],
    rules: {
      // Gradientes/glassmorphism geram falsos positivos de contraste no axe.
      "color-contrast": { enabled: false },
    },
  });
}

describe("IA Local Offline — Modelos LiteRT-LM (Kokoro 82M + Gemma 4 E2B)", () => {
  beforeEach(() => {
    resetLocalState();
    mockModelDownloads();
  });

  it("exibe a central /modelos com os 2 cards, anotações WebMCP, sem menu lateral e sem violações de acessibilidade", () => {
    visitWithSettings("/modelos");

    cy.get("main h1").should("contain.text", "Modelos de IA Local");
    cy.get(`[data-cy="model-card-${KOKORO_ID}"]`)
      .should("be.visible")
      .and("have.attr", "data-webmcp-tool", "manageLocalAiModels");
    cy.get(`[data-cy="model-card-${GEMMA_ID}"]`)
      .should("be.visible")
      .and("have.attr", "data-webmcp-tool", "manageLocalAiModels");
    cy.get(`[data-cy="model-status-${KOKORO_ID}"]`).should(
      "contain.text",
      "Não baixado",
    );
    cy.get(`[data-cy="download-model-${GEMMA_ID}"]`)
      .should("have.attr", "data-webmcp-action", "downloadModel");

    cy.contains("button", "Abrir Menu Lateral").should("not.exist");
    cy.get('[data-cy="local-models-drawer"]').should("not.exist");
    cy.get('[data-cy="local-models-drawer-trigger"]').should("not.exist");

    checkA11yOn("main");
  });

  it("continua o download do Kokoro ao trocar de rota e remove o modelo na central", () => {
    // Resposta atrasada: o download ainda está em andamento quando o usuário sai de /modelos.
    cy.intercept("GET", "https://huggingface.co/**", {
      statusCode: 200,
      delay: 1500,
      headers: {
        "content-type": "application/octet-stream",
        "content-length": String(MOCK_MODEL_BODY.length),
        "access-control-expose-headers": "content-length",
      },
      body: MOCK_MODEL_BODY,
    }).as("slowModelDownload");

    visitWithSettings("/modelos");
    cy.get(`[data-cy="download-model-${KOKORO_ID}"]`).click();
    cy.get(`[data-cy="model-status-${KOKORO_ID}"]`).should("contain.text", "Baixando");

    cy.get('[data-cy="nav-link-reader"]').click();
    cy.location("pathname").should("eq", "/leitor");
    cy.get('[data-cy="nav-models-download-progress"]').should("be.visible");
    cy.wait("@slowModelDownload");

    cy.get('[data-cy="nav-link-models"]').click();
    cy.location("pathname").should("eq", "/modelos");
    cy.get(`[data-cy="model-status-${KOKORO_ID}"]`, { timeout: 10000 }).should(
      "contain.text",
      "Pronto offline",
    );
    cy.get(`[data-cy="model-status-${GEMMA_ID}"]`).should("contain.text", "Não baixado");
    cy.get('[data-cy="nav-models-download-progress"]').should("not.exist");

    cy.get(`[data-cy="delete-model-${KOKORO_ID}"]`).click();
    cy.get(`[data-cy="model-status-${KOKORO_ID}"]`).should("contain.text", "Não baixado");
    cy.get(`[data-cy="download-model-${KOKORO_ID}"]`).should("be.visible");

    cy.window().then(async (win) => {
      const cache = await win.caches.open(MODELS_CACHE_NAME);
      const keys = await cache.keys();
      expect(keys.map((req) => req.url).join(",")).not.to.include(KOKORO_ID);
    });
  });

  it("leva à central /modelos com o Kokoro destacado ao escolher 'IA Local (Offline)' sem o modelo", () => {
    visitWithSettings("/leitor");
    createReadingViaQuickPaste("Leitura IA Local");

    openVoiceMenu();
    cy.contains('[role="menuitemradio"]', "IA Local (Offline)")
      .should("be.visible")
      .and("contain.text", "Baixar")
      .click();

    cy.location("pathname").should("eq", "/modelos");
    cy.location("search").should("eq", `?model=${KOKORO_ID}`);
    cy.get(`[data-cy="model-card-${KOKORO_ID}"]`).should("have.class", "ring-2");
    cy.get(`[data-cy="model-card-${GEMMA_ID}"]`).should("not.have.class", "ring-2");
    cy.get('[data-cy="local-models-drawer"]').should("not.exist");
  });

  it("com o Kokoro baixado, lista as vozes PT-BR e mostra o indicador do modelo local", () => {
    visitWithSettings("/leitor");
    createReadingViaQuickPaste("Leitura Kokoro Local");

    openVoiceMenu();
    cy.get('[data-cy="tts-menu-open-local-models"]').should("be.visible").click();
    cy.location("search").should("eq", `?model=${KOKORO_ID}`);
    downloadModelFromCard(KOKORO_ID);

    cy.get('[data-cy="nav-link-reader"]').click();
    cy.location("pathname").should("eq", "/leitor");
    cy.contains("Leitura Kokoro Local", { timeout: 10000 }).should("be.visible");

    openVoiceMenu();
    cy.contains('[role="menuitemradio"]', "IA Local (Offline)")
      .should("contain.text", "Pronto")
      .click();

    cy.get('[data-cy="tts-model-indicator"]:visible')
      .first()
      .should("have.attr", "data-tts-model", "kokoro-82m")
      .and("contain.text", "Kokoro Local");

    openVoiceMenu();
    cy.get('[role="menu"]').within(() => {
      cy.contains('[role="menuitemradio"]', "Dora (PT-BR")
        .scrollIntoView()
        .should("be.visible");
      cy.contains('[role="menuitemradio"]', "Alex (PT-BR")
        .scrollIntoView()
        .should("be.visible");
      cy.contains('[role="menuitemradio"]', "Santa (PT-BR")
        .scrollIntoView()
        .should("be.visible");
    });
  });

  it("leva à central /modelos com o Gemma destacado ao escolher 'Gemma 4 Local' sem o modelo", () => {
    visitWithSettings("/leitor", "ai-study");
    createReadingViaQuickPaste("Apostila Sem Gemma");

    cy.get('[data-cy="chat-engine-selector"]:visible').first().click();
    cy.contains('[role="menuitemradio"]', "Gemma 4 Local")
      .should("contain.text", "Baixar")
      .click();

    cy.location("pathname").should("eq", "/modelos");
    cy.location("search").should("eq", `?model=${GEMMA_ID}`);
    cy.get(`[data-cy="model-card-${GEMMA_ID}"]`).should("have.class", "ring-2");
  });

  it("com o Gemma baixado no template ai-study, usa Gemma 4 Local e anexa imagem e áudio", () => {
    visitWithSettings("/modelos", "ai-study");
    downloadModelFromCard(GEMMA_ID);

    cy.get('[data-cy="nav-link-reader"]').click();
    cy.location("pathname").should("eq", "/leitor");
    createReadingViaQuickPaste("Apostila Gemma Local");

    cy.get("header").find('[data-cy="ai-engine-badge"]').should("not.exist");
    cy.get('[data-cy="chat-engine-selector"]:visible')
      .first()
      .should("contain.text", "Gemma 4 Local")
      .click();
    cy.contains('[role="menuitemradio"]', "Gemma 4 Local").should(
      "contain.text",
      "Pronto",
    );
    cy.get("body").type("{esc}");

    cy.get('input[aria-label="Selecionar imagem para o chat"]')
      .first()
      .selectFile(
        {
          contents: Cypress.Buffer.from("fake-png-bytes"),
          fileName: "slide.png",
          mimeType: "image/png",
        },
        { force: true },
      );
    cy.get('input[aria-label="Selecionar arquivo de áudio para o chat"]')
      .first()
      .selectFile(
        {
          contents: Cypress.Buffer.from("fake-wav-bytes"),
          fileName: "duvida.wav",
          mimeType: "audio/wav",
        },
        { force: true },
      );

    cy.get('[data-cy="chat-attachments-preview"]:visible')
      .first()
      .within(() => {
        cy.get('[data-cy="chat-attachment-chip-image"]').should(
          "contain.text",
          "slide.png",
        );
        cy.get('[data-cy="chat-attachment-chip-audio"]').should(
          "contain.text",
          "duvida.wav",
        );
        cy.get('button[aria-label="Remover anexo slide.png"]').click();
        cy.get('[data-cy="chat-attachment-chip-image"]').should("not.exist");
      });
  });

  it("não estoura a largura em 370px na central /modelos e acessa a central pelo menu mobile", () => {
    cy.viewport(370, 667);
    visitWithSettings("/leitor");

    cy.get('[data-cy="nav-link-models"]').should("not.be.visible");
    cy.get('[data-cy="mobile-menu-trigger"]').should("be.visible").click();
    cy.get('[data-cy="mobile-models-drawer-item"]').should("not.exist");
    cy.get('[data-cy="mobile-models-page-item"]').should("be.visible").click();

    cy.location("pathname").should("eq", "/modelos");
    cy.get(`[data-cy="model-card-${KOKORO_ID}"]`).should("be.visible");
    cy.get(`[data-cy="model-card-${GEMMA_ID}"]`).should("be.visible");
    cy.get('[data-cy="local-models-drawer"]').should("not.exist");
    assertNoHorizontalOverflow();
  });
});
