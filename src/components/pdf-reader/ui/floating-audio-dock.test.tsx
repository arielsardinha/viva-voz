import { render, screen, fireEvent } from "@testing-library/react";
import { FloatingAudioDock } from "./floating-audio-dock";

const mockVoices = [
  { id: "voice-1", label: "Voz Padrão (pt-BR)" },
  { id: "Kore", label: "Kore (Google IA)" },
];

describe("FloatingAudioDock Component", () => {
  const onToggleMock = jest.fn();
  const onPreviousMock = jest.fn();
  const onNextMock = jest.fn();
  const onRestartMock = jest.fn();
  const onEngineChangeMock = jest.fn();
  const onVoiceChangeMock = jest.fn();
  const onSpeedChangeMock = jest.fn();
  const onApiKeyChangeMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve renderizar botão de Conectar Voz IA quando não houver chave conectada", () => {
    render(
      <FloatingAudioDock
        isPlaying={false}
        isBuffering={false}
        currentIndex={0}
        total={10}
        title="Documento de Teste"
        currentPage={1}
        voice="voice-1"
        speed="1"
        engine="system"
        voices={mockVoices}
        disabledEngines={[]}
        apiKey={null}
        onApiKeyChange={onApiKeyChangeMock}
        onEngineChange={onEngineChangeMock}
        onToggle={onToggleMock}
        onPrevious={onPreviousMock}
        onNext={onNextMock}
        onRestart={onRestartMock}
        onVoiceChange={onVoiceChangeMock}
        onSpeedChange={onSpeedChangeMock}
      />
    );

    const connectButtons = screen.getAllByRole("button", { name: /conectar som com ia|conectar chave gemini/i });
    expect(connectButtons.length).toBeGreaterThan(0);
  });

  it("deve abrir o modal de inserção de chave ao clicar no botão de conexão de IA do dock", () => {
    render(
      <FloatingAudioDock
        isPlaying={false}
        isBuffering={false}
        currentIndex={0}
        total={10}
        title="Documento de Teste"
        currentPage={1}
        voice="voice-1"
        speed="1"
        engine="system"
        voices={mockVoices}
        disabledEngines={[]}
        apiKey={null}
        onApiKeyChange={onApiKeyChangeMock}
        onEngineChange={onEngineChangeMock}
        onToggle={onToggleMock}
        onPrevious={onPreviousMock}
        onNext={onNextMock}
        onRestart={onRestartMock}
        onVoiceChange={onVoiceChangeMock}
        onSpeedChange={onSpeedChangeMock}
      />
    );

    const connectButton = screen.getAllByRole("button", { name: /conectar som com ia/i })[0];
    fireEvent.click(connectButton);

    expect(screen.getByText("Conectar conta do Gemini (Google AI Studio)")).toBeInTheDocument();
  });

  it("NÃO deve renderizar botões de conexão de IA nem 'Gerenciar chave Gemini' quando já conectado", () => {
    render(
      <FloatingAudioDock
        isPlaying={false}
        isBuffering={false}
        currentIndex={0}
        total={10}
        title="Documento de Teste"
        currentPage={1}
        voice="Kore"
        speed="1"
        engine="google"
        voices={mockVoices}
        disabledEngines={[]}
        apiKey="AIzaSyTestValidKey12345"
        onApiKeyChange={onApiKeyChangeMock}
        onEngineChange={onEngineChangeMock}
        onToggle={onToggleMock}
        onPrevious={onPreviousMock}
        onNext={onNextMock}
        onRestart={onRestartMock}
        onVoiceChange={onVoiceChangeMock}
        onSpeedChange={onSpeedChangeMock}
      />
    );

    expect(screen.queryByRole("button", { name: /conectar som com ia/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Gerenciar chave Gemini/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Conectar chave Gemini/i)).not.toBeInTheDocument();
  });
});
