import React from "react";
import { render } from "@testing-library/react";
import type { Sentence } from "@/lib/pdf-text";
import type { ReaderSettings } from "@/context/reader-settings-context";

// Mock do módulo 'ai' e de subcomponentes para compatibilidade e isolamento nos testes Jest
jest.mock("ai", () => ({
  DefaultChatTransport: jest.fn().mockImplementation(() => ({
    sendMessages: jest.fn(),
  })),
}));

jest.mock("@/lib/client/hybrid-chat-transport", () => ({
  HybridChatTransport: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("../ui/ambient-sound-player", () => ({
  AmbientSoundPlayer: () => <div data-testid="ambient-sound-player" />,
}));
jest.mock("../ui/text-selection-menu", () => ({
  TextSelectionMenu: () => <div data-testid="text-selection-menu" />,
}));
jest.mock("../ui/pages-drawer", () => ({
  PagesDrawer: () => <div data-testid="pages-drawer" />,
}));
jest.mock("../ui/floating-audio-dock", () => ({
  FloatingAudioDock: () => <div data-testid="floating-audio-dock" />,
}));
jest.mock("../ui/waveform-visualizer", () => ({
  WaveformVisualizer: () => <div data-testid="waveform-visualizer" />,
}));
jest.mock("@/hooks/use-chrome-ai", () => ({
  useChromeAi: () => ({ status: "unavailable" }),
}));
jest.mock("@ai-sdk/react", () => ({
  useChat: () => ({
    messages: [],
    sendMessage: jest.fn(),
    status: "ready",
  }),
}));

import { ZenFocusTemplate } from "./zen-focus-template";
import { ModernStudioTemplate } from "./modern-studio-template";
import { AIStudyTemplate } from "./ai-study-template";

const mockSentences: Sentence[] = [
  { index: 0, text: "Primeira frase para leitura.", page: 1 },
  { index: 1, text: "Segunda frase com conteúdo.", page: 1 },
  { index: 2, text: "Terceira frase finalizando o teste.", page: 2 },
];

const mockSettings: ReaderSettings = {
  template: "zen",
  theme: "light",
  font: "sans",
  fontSize: 18,
  lineHeight: 1.8,
  speed: 1,
  hasCompletedOnboarding: true,
};

const defaultProps = {
  sentences: mockSentences,
  title: "Documento de Teste",
  isPlaying: false,
  isBuffering: false,
  voice: "pt-BR-Standard-A",
  speed: "1.0",
  engine: "google" as const,
  voices: [],
  disabledEngines: [],
  onEngineChange: jest.fn(),
  onSelectSentence: jest.fn(),
  onToggle: jest.fn(),
  onPrevious: jest.fn(),
  onNext: jest.fn(),
  onRestart: jest.fn(),
  onVoiceChange: jest.fn(),
  onSpeedChange: jest.fn(),
};

describe("Comportamento de auto-scroll entre os Modos de Leitura", () => {
  let scrollIntoViewMock: jest.Mock;

  beforeEach(() => {
    scrollIntoViewMock = jest.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("deve executar auto-scroll (scrollIntoView) exclusivamente no Modo Zen Imersivo", () => {
    const { rerender } = render(
      <ZenFocusTemplate
        {...defaultProps}
        settings={{ ...mockSettings, template: "zen" }}
        currentIndex={0}
      />
    );

    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
    });

    // Ao avançar o índice durante a reprodução no Modo Zen
    rerender(
      <ZenFocusTemplate
        {...defaultProps}
        settings={{ ...mockSettings, template: "zen" }}
        currentIndex={1}
      />
    );

    expect(scrollIntoViewMock).toHaveBeenCalledTimes(2);
  });

  it("NÃO deve executar auto-scroll no modo Estúdio Moderno", () => {
    const { rerender } = render(
      <ModernStudioTemplate
        {...defaultProps}
        settings={{ ...mockSettings, template: "modern" }}
        currentIndex={0}
      />
    );

    expect(scrollIntoViewMock).not.toHaveBeenCalled();

    // Ao avançar o índice de sentença durante a leitura
    rerender(
      <ModernStudioTemplate
        {...defaultProps}
        settings={{ ...mockSettings, template: "modern" }}
        currentIndex={1}
      />
    );

    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });

  it("NÃO deve executar auto-scroll no texto no modo Assistente IA", () => {
    const { rerender } = render(
      <AIStudyTemplate
        {...defaultProps}
        settings={{ ...mockSettings, template: "ai-study" }}
        currentIndex={0}
      />
    );

    expect(scrollIntoViewMock).not.toHaveBeenCalled();

    // Ao avançar o índice de sentença durante a leitura
    rerender(
      <AIStudyTemplate
        {...defaultProps}
        settings={{ ...mockSettings, template: "ai-study" }}
        currentIndex={1}
      />
    );

    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });
});
