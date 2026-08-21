import { TextEncoder, TextDecoder } from "util";
import { ReadableStream, WritableStream, TransformStream } from "stream/web";
import { MessageChannel, MessagePort } from "worker_threads";

Object.assign(global, {
  TextEncoder,
  TextDecoder,
  ReadableStream,
  WritableStream,
  TransformStream,
  MessageChannel,
  MessagePort,
});
Object.assign(globalThis, {
  TextEncoder,
  TextDecoder,
  ReadableStream,
  WritableStream,
  TransformStream,
  MessageChannel,
  MessagePort,
});

import "@testing-library/jest-dom";
import "fake-indexeddb/auto";

// Configura timeout global seguro de 10 segundos por teste
jest.setTimeout(10000);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  Request: UndiciRequest,
  Response: UndiciResponse,
  Headers: UndiciHeaders,
  fetch: UndiciFetch,
} = require("undici");

Object.defineProperty(global, "Request", { value: UndiciRequest, writable: true });
Object.defineProperty(global, "Response", { value: UndiciResponse, writable: true });
Object.defineProperty(global, "Headers", { value: UndiciHeaders, writable: true });
Object.defineProperty(global, "fetch", { value: UndiciFetch, writable: true });

Object.defineProperty(window, "Request", { value: UndiciRequest, writable: true });
Object.defineProperty(window, "Response", { value: UndiciResponse, writable: true });
Object.defineProperty(window, "Headers", { value: UndiciHeaders, writable: true });
Object.defineProperty(window, "fetch", { value: UndiciFetch, writable: true });

// Polyfill para structuredClone no ambiente de teste jsdom
if (typeof global.structuredClone === "undefined") {
  global.structuredClone =
    typeof structuredClone !== "undefined"
      ? structuredClone
      : (val: unknown) => (val instanceof Blob ? val : JSON.parse(JSON.stringify(val)));
}

// Polyfill para matchMedia
if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // Polyfill para URL.createObjectURL / revokeObjectURL
  if (!URL.createObjectURL) {
    URL.createObjectURL = jest.fn((blob: Blob) => `blob:mock-url-${Math.random()}`);
  }
  if (!URL.revokeObjectURL) {
    URL.revokeObjectURL = jest.fn();
  }

  // Mock de speechSynthesis
  if (!("speechSynthesis" in window)) {
    const mockSpeechSynthesis = {
      paused: false,
      pending: false,
      speaking: false,
      cancel: jest.fn(),
      getVoices: jest.fn().mockReturnValue([
        {
          name: "Luciana (pt-BR)",
          lang: "pt-BR",
          voiceURI: "Google Português do Brasil",
          default: true,
          localService: true,
        },
        {
          name: "Alex (en-US)",
          lang: "en-US",
          voiceURI: "Alex",
          default: false,
          localService: true,
        },
      ]),
      pause: jest.fn(),
      resume: jest.fn(),
      speak: jest.fn((utterance: SpeechSynthesisUtterance) => {
        setTimeout(() => {
          utterance.onend?.(new Event("end") as SpeechSynthesisEvent);
        }, 10);
      }),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    };
    Object.defineProperty(window, "speechSynthesis", {
      writable: true,
      value: mockSpeechSynthesis,
    });
  }

  // Mock de SpeechSynthesisUtterance
  if (typeof global.SpeechSynthesisUtterance === "undefined") {
    class MockSpeechSynthesisUtterance {
      text: string;
      lang = "pt-BR";
      rate = 1;
      pitch = 1;
      volume = 1;
      voice: SpeechSynthesisVoice | null = null;
      onend: ((event: SpeechSynthesisEvent) => void) | null = null;
      onerror: ((event: SpeechSynthesisErrorEvent) => void) | null = null;
      constructor(text = "") {
        this.text = text;
      }
    }
    (global as unknown as { SpeechSynthesisUtterance: typeof MockSpeechSynthesisUtterance }).SpeechSynthesisUtterance =
      MockSpeechSynthesisUtterance as unknown as typeof SpeechSynthesisUtterance;
  }

  // Mock de HTMLMediaElement play / pause
  window.HTMLMediaElement.prototype.play = jest.fn().mockImplementation(() => Promise.resolve());
  window.HTMLMediaElement.prototype.pause = jest.fn();
  window.HTMLMediaElement.prototype.load = jest.fn();

  // Mock de ResizeObserver
  if (typeof global.ResizeObserver === "undefined") {
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
  }
}
