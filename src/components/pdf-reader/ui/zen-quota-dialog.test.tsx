import { render, screen, fireEvent } from "@testing-library/react";
import { ZenQuotaDialog } from "./zen-quota-dialog";
import type { VoiceOption } from "@/lib/tts-engines";

const mockSystemVoices: VoiceOption[] = [
  { id: "voice-pt-1", label: "Maria (pt-BR)" },
  { id: "voice-pt-2", label: "Pedro (pt-BR)" },
  { id: "voice-en-1", label: "David (en-US)" },
];

describe("ZenQuotaDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    systemVoices: mockSystemVoices,
    currentVoice: "voice-pt-1",
    onContinueWithFree: jest.fn(),
    onOpenGeminiKey: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve renderizar o título e a mensagem de tokens/cota esgotados", () => {
    render(<ZenQuotaDialog {...defaultProps} />);

    expect(screen.getByText(/Limite de Tokens Atingido/i)).toBeInTheDocument();
    expect(
      screen.getByText(/A cota de narração com IA da sua conta Gemini foi atingida/i)
    ).toBeInTheDocument();
  });

  it("deve listar as vozes do sistema disponíveis para seleção", () => {
    render(<ZenQuotaDialog {...defaultProps} />);

    expect(screen.getByText("Maria (pt-BR)")).toBeInTheDocument();
    expect(screen.getByText("Pedro (pt-BR)")).toBeInTheDocument();
  });

  it("deve conter atributo de ferramenta WebMCP no formulário", () => {
    render(<ZenQuotaDialog {...defaultProps} />);
    const form = document.querySelector("form[data-webmcp-tool='configureFreeAudioFallback']");
    expect(form).toBeInTheDocument();
  });

  it("deve chamar onContinueWithFree com a voz selecionada ao clicar em Continuar", () => {
    render(<ZenQuotaDialog {...defaultProps} />);

    // Troca a voz para Pedro
    const select = screen.getByLabelText(/Voz gratuita do sistema/i);
    fireEvent.change(select, { target: { value: "voice-pt-2" } });

    // Clica no botão Continuar
    const continueBtn = screen.getByRole("button", { name: /Continuar no Gratuito/i });
    fireEvent.click(continueBtn);

    expect(defaultProps.onContinueWithFree).toHaveBeenCalledWith("voice-pt-2");
  });

  it("deve abrir o diálogo de chave Gemini ao clicar na opção secundária", () => {
    render(<ZenQuotaDialog {...defaultProps} />);

    const keyBtn = screen.getByRole("button", { name: /Inserir outra chave Gemini/i });
    fireEvent.click(keyBtn);

    expect(defaultProps.onOpenGeminiKey).toHaveBeenCalled();
  });
});
