import { fireEvent, render, screen, within } from "@testing-library/react";
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

const quizMockSentences = [
  {
    index: 0,
    page: 1,
    text: "Brás Cubas abre suas memórias explicando que não é propriamente um autor defunto, mas um defunto autor para quem a sepultura se tornou outro berço inesperado.",
  },
  {
    index: 1,
    page: 1,
    text: "Moisés narrou a própria morte no final do Pentateuco, criando uma diferença marcante na estrutura narrativa desta obra literária brasileira.",
  },
  {
    index: 2,
    page: 2,
    text: "A segunda consideração destaca que escrever além da vida torna o relato mais livre, irônico e galante perante os leitores atentos.",
  },
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

  it("deve renderizar o Assistente de leitura sticky à direita e o FloatingAudioDock fixo na base", () => {
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

    const assistantPanel = document.querySelector('[data-cy="ai-assistant-panel"]') as HTMLElement;
    expect(assistantPanel).toBeInTheDocument();
    expect(assistantPanel).toHaveClass("lg:sticky");
    expect(within(assistantPanel).getByText("Assistente de leitura")).toBeInTheDocument();
    expect(within(assistantPanel).getByRole("button", { name: /conectar chave gemini/i })).toBeInTheDocument();

    const floatingDock = document.querySelector('[data-cy="floating-audio-dock"]') as HTMLElement;
    expect(floatingDock).toBeInTheDocument();
    expect(within(floatingDock).getByRole("button", { name: "Selecionar voz e motor" })).toBeInTheDocument();
  });

  it("NÃO deve renderizar o botão de conectar chave Gemini no header nem no dock quando já conectado", () => {
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

    expect(screen.getByText("Assistente de leitura")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /conectar chave gemini/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /chave gemini conectada/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /conectar som com ia/i })).not.toBeInTheDocument();
  });

  it("deve renderizar o Mini-Card A2UI, abrir o Quiz interativo, pontuar XP, sincronizar evidência e aceitar comando híbrido", () => {
    const onAddNoteMock = jest.fn();
    render(
      <AIStudyTemplate
        sentences={quizMockSentences}
        currentIndex={0}
        title="Dom Casmurro"
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
        onAddNote={onAddNoteMock}
      />
    );

    // Mini-Card A2UI removido; o Quiz abre pela aba de modo
    expect(screen.queryByText("A2UI · Widget nativo")).not.toBeInTheDocument();
    fireEvent.click(document.querySelector('[data-cy="assistant-tab-quiz"]') as HTMLElement);

    // Superfície A2UI aberta com barra de protocolo e SEM o chip/banner redundante de sincronia
    expect(screen.queryByText(/Catálogo nativo|Sequência:/)).not.toBeInTheDocument();
    expect(screen.getByText("Próxima (2/2)")).toBeInTheDocument();
    expect(screen.queryByText(/Superfície A2UI sincronizada/i)).not.toBeInTheDocument();
    expect(document.querySelector('[data-cy="a2ui-reader-sync-banner"]')).not.toBeInTheDocument();

    // Seleciona a alternativa B (correta para Q1: (0 + 1) % 4 = 1 -> B)
    fireEvent.click(screen.getByRole("radio", { name: /B\)/i }));
    expect(screen.getByText("+60 XP")).toBeInTheDocument();

    // Sem barra de certeza nem botão "Mais difícil"; destaca evidência no texto
    expect(screen.queryByRole("button", { name: /Certeza|Mais difícil/i })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /destacar ¶1 no texto/i }));
    expect(onSelectSentenceMock).toHaveBeenCalledWith(0);

    fireEvent.click(screen.getByRole("button", { name: /salvar card/i }));
    expect(onAddNoteMock).toHaveBeenCalled();

    // Comando híbrido avançando para a próxima questão
    const cmdInput = screen.getByLabelText("Comando para o Quiz A2UI");
    fireEvent.change(cmdInput, { target: { value: "próxima" } });
    fireEvent.submit(cmdInput.closest("form")!);
    expect(screen.getByText("Próxima (1/2)")).toBeInTheDocument();
  });

  it("deve adaptar o Quiz para 1 questão em documentos muito curtos (1 frase)", () => {
    render(
      <AIStudyTemplate
        sentences={[mockSentences[0]]}
        currentIndex={0}
        title="Nota curta"
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

    fireEvent.click(document.querySelector('[data-cy="assistant-tab-quiz"]') as HTMLElement);
    expect(screen.getByText("Questão única (1/1)")).toBeInTheDocument();
  });

  it("deve pausar a narração automaticamente ao abrir o Quiz enquanto toca e oferecer retomada em simbiose", () => {
    const { rerender } = render(
      <AIStudyTemplate
        sentences={mockSentences}
        currentIndex={0}
        title="Dom Casmurro"
        settings={mockSettings}
        isPlaying={true}
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

    // Abrir Quiz enquanto está tocando pausa automaticamente
    fireEvent.click(screen.getByRole("button", { name: "Quiz" }));
    expect(onToggleMock).toHaveBeenCalledTimes(1);

    // Volta para aba Conversar após o áudio pausar e valida o banner de retomada
    rerender(
      <AIStudyTemplate
        sentences={mockSentences}
        currentIndex={0}
        title="Dom Casmurro"
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

    fireEvent.click(screen.getByRole("button", { name: "Conversar" }));
    expect(screen.getByText(/Narração pausada em ¶1 enquanto você conversa/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^retomar$/i }));
    expect(onToggleMock).toHaveBeenCalledTimes(2);
  });
});
