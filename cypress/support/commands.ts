/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Define uma chave do Gemini no localStorage para testes de IA.
       */
      setGeminiKey(key?: string): Chainable<void>;

      /**
       * Remove a chave do Gemini do localStorage.
       */
      clearGeminiKey(): Chainable<void>;

      /**
       * Intercepta chamadas de TTS com resposta simulada de áudio WAV.
       */
      mockTtsSuccess(): Chainable<void>;

      /**
       * Intercepta chamadas do assistente de IA (/api/ask).
       */
      mockAskSuccess(responseMessage?: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add("setGeminiKey", (key = "AIzaSyFakeKeyForCypressAutomatedTesting123") => {
  cy.window().then((win) => {
    win.localStorage.setItem("gemini-api-key", key);
  });
});

Cypress.Commands.add("clearGeminiKey", () => {
  cy.window().then((win) => {
    win.localStorage.removeItem("gemini-api-key");
  });
});

Cypress.Commands.add("mockTtsSuccess", () => {
  cy.intercept("POST", "/api/tts", {
    statusCode: 200,
    headers: { "Content-Type": "audio/wav" },
    body: new Uint8Array([82, 73, 70, 70, 44, 0, 0, 0, 87, 65, 86, 69]).buffer,
  }).as("ttsRequest");
});

Cypress.Commands.add("mockAskSuccess", (responseMessage = "Esta é uma resposta simulada para o teste.") => {
  cy.intercept("POST", "/api/ask", {
    statusCode: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
    body: responseMessage,
  }).as("askRequest");
});

export {};