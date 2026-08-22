import React from "react";
import { render, screen } from "@testing-library/react";
import { AIStudyTemplate } from "./ai-study-template";
import type { ReaderSettings } from "@/context/reader-settings-context";

// Mocks necessários
jest.mock("@/hooks/use-chrome-ai", () => ({
  useChromeAi: () => ({
    status: "unavailable",
    isSupported: false,
  }),
}));

jest.mock("@/hooks/use-gemini-api-key", () => ({
  useGeminiApiKey: () => ({
    apiKey: null,
    hasApiKey: false,
    maskedKey: null,
    isChecking: false,
    updateApiKey: jest.fn(),
    syncKey: jest.fn(),
  }),
}));

const mockSentences = [
  { index: 0, text: "Primeiro parágrafo de análise de IA.", page: 1 },
  { index: 1, text: "Segundo parágrafo com argumentos.", page: 1 },
];

const mockVoices = [
  { id: "voice-1", label: "Voz do Sistema (pt-BR)" },
  { id: "Kore", label: "Kore (Google IA)" },
  { id: "Puck", label: "Puck (Google IA)" },
];

const mockSettings: ReaderSettings = {
  template: "ai-study",
  theme: "light",
  font: "sans",
  fontSize: 16,
  lineHeight: 1.8,
  speed: 1,
  hasCompletedOnboarding: true,
};

describe("AIStudyTemplate Component", () => {
  const onToggleMock = jest.fn();
  const onPreviousMock = jest.fn();
  const onNextMock = jest.fn();
  const onRestartMock = jest.fn();
  const onEngineChangeMock = jest.fn();
  const onVoiceChangeMock = jest.fn();
  const onSpeedChangeMock = jest.fn();
  const onSelectSentenceMock = jest.fn();
  const onApiKeyChangeMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve renderizar a aba AI Study Assistant e o botão de voz no header", () => {
    render(
      <AIStudyTemplate
        sentences={mockSentences}
        currentIndex={0}
        title="Documento de Estudo"
        settings={mockSettings}
        isPlaying={false}
        isBuffering={false}
        voice="voice-1"
        speed="1"
        engine="system"
        voices={mockVoices}
        disabledEngines={[]}
        apiKey={null}
        onApiKeyChange={onApiKeyChangeMock}
        onEngineChange={onEngineChangeMock}
        onSelectSentence={onSelectSentenceMock}
        onToggle={onToggleMock}
        onPrevious={onPreviousMock}
        onNext={onNextMock}
        onRestart={onRestartMock}
        onVoiceChange={onVoiceChangeMock}
        onSpeedChange={onSpeedChangeMock}
      />
    );

    expect(screen.getByText("AI Study Assistant")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /selecionar voz e motor/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /conectar chave gemini/i })).toBeInTheDocument();
  });

  it("NÃO deve renderizar o botão de conectar chave Gemini no header quando já conectado", () => {
    render(
      <AIStudyTemplate
        sentences={mockSentences}
        currentIndex={0}
        title="Documento de Estudo"
        settings={mockSettings}
        isPlaying={false}
        isBuffering={false}
        voice="Kore"
        speed="1"
        engine="google"
        voices={mockVoices}
        disabledEngines={[]}
        apiKey="AIzaSyTestValidVertexKey123"
        onApiKeyChange={onApiKeyChangeMock}
        onEngineChange={onEngineChangeMock}
        onSelectSentence={onSelectSentenceMock}
        onToggle={onToggleMock}
        onPrevious={onPreviousMock}
        onNext={onNextMock}
        onRestart={onRestartMock}
        onVoiceChange={onVoiceChangeMock}
        onSpeedChange={onSpeedChangeMock}
      />
    );

    expect(screen.getByText("AI Study Assistant")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /conectar chave gemini/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /chave gemini conectada/i })).not.toBeInTheDocument();
  });
});
