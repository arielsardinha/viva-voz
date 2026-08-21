import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ZenFocusTemplate } from "./zen-focus-template";
import type { ReaderSettings } from "../ui/template-switcher";

const mockSettings: ReaderSettings = {
  template: "zen",
  theme: "light",
  font: "serif",
  fontSize: 18,
  lineHeight: 2.0,
  speed: 1.0,
  hasCompletedOnboarding: true,
};

const mockSentences = [
  { index: 0, text: "Primeiro parágrafo de teste.", page: 1 },
  { index: 1, text: "Segundo parágrafo de teste.", page: 1 },
  { index: 2, text: "Terceiro parágrafo de teste.", page: 2 },
];

const mockVoices = [
  { id: "voice-1", label: "Voz 1 (pt-BR)" },
  { id: "Kore", label: "Kore (Google)" },
];

describe("ZenFocusTemplate Component", () => {
  const onToggleMock = jest.fn();
  const onPreviousMock = jest.fn();
  const onNextMock = jest.fn();
  const onRestartMock = jest.fn();
  const onEngineChangeMock = jest.fn();
  const onVoiceChangeMock = jest.fn();
  const onSpeedChangeMock = jest.fn();
  const onSelectSentenceMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("NÃO deve conter sons de foco (AmbientSoundPlayer) nem botão de recomeçar", () => {
    render(
      <ZenFocusTemplate
        sentences={mockSentences}
        currentIndex={1}
        title="Documento Zen"
        settings={mockSettings}
        isPlaying={false}
        isBuffering={false}
        voice="voice-1"
        speed="1"
        engine="system"
        voices={mockVoices}
        disabledEngines={[]}
        apiKey={null}
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

    // Garante que o botão de reiniciar/recomeçar NÃO existe
    expect(screen.queryByRole("button", { name: /reiniciar/i })).not.toBeInTheDocument();
    expect(screen.queryByTitle(/reiniciar/i)).not.toBeInTheDocument();

    // Garante que o texto de Som de Fundo/Sons de Foco NÃO existe no header
    expect(screen.queryByText(/som de fundo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sons de foco/i)).not.toBeInTheDocument();
  });

  it("deve conter botões de Voltar e Avançar trecho e disparar callbacks", () => {
    render(
      <ZenFocusTemplate
        sentences={mockSentences}
        currentIndex={1}
        title="Documento Zen"
        settings={mockSettings}
        isPlaying={false}
        isBuffering={false}
        voice="voice-1"
        speed="1"
        engine="system"
        voices={mockVoices}
        disabledEngines={[]}
        apiKey={null}
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

    const prevBtn = screen.getByRole("button", { name: "Voltar trecho" });
    const nextBtn = screen.getByRole("button", { name: "Avançar trecho" });

    expect(prevBtn).toBeInTheDocument();
    expect(nextBtn).toBeInTheDocument();

    fireEvent.click(prevBtn);
    expect(onPreviousMock).toHaveBeenCalledTimes(1);

    fireEvent.click(nextBtn);
    expect(onNextMock).toHaveBeenCalledTimes(1);
  });

  it("deve conter o ícone/botão para conectar a chave de IA do Google quando desconectada", () => {
    render(
      <ZenFocusTemplate
        sentences={mockSentences}
        currentIndex={0}
        title="Documento Zen"
        settings={mockSettings}
        isPlaying={false}
        isBuffering={false}
        voice="voice-1"
        speed="1"
        engine="system"
        voices={mockVoices}
        disabledEngines={[]}
        apiKey={null}
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

    const geminiTrigger = screen.getByRole("button", { name: /conectar chave gemini/i });
    expect(geminiTrigger).toBeInTheDocument();

    // Ao clicar, deve abrir o modal de inserção da chave Gemini
    fireEvent.click(geminiTrigger);
    expect(screen.getByText("Conectar conta do Gemini (Google AI Studio)")).toBeInTheDocument();
  });

  it("deve exibir feedback visual de loading (aria-label 'Carregando áudio...') quando isBuffering for true", () => {
    render(
      <ZenFocusTemplate
        sentences={mockSentences}
        currentIndex={0}
        title="Documento Zen"
        settings={mockSettings}
        isPlaying={true}
        isBuffering={true}
        voice="Kore"
        speed="1"
        engine="google"
        voices={mockVoices}
        disabledEngines={[]}
        apiKey="fake-key"
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

    const loadingButton = screen.getByRole("button", { name: "Carregando áudio..." });
    expect(loadingButton).toBeInTheDocument();
  });
});
