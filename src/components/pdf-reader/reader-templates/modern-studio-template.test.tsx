import { render, screen, fireEvent, act } from "@testing-library/react";
import { ModernStudioTemplate } from "./modern-studio-template";
import type { ReaderSettings } from "../ui/template-switcher";

// Mocks de subcomponentes para isolamento nos testes
jest.mock("../ui/floating-audio-dock", () => ({
  FloatingAudioDock: () => <div data-testid="floating-audio-dock" />,
}));
jest.mock("../ui/text-selection-menu", () => ({
  TextSelectionMenu: () => <div data-testid="text-selection-menu" />,
}));
jest.mock("../ui/pages-drawer", () => ({
  PagesDrawer: () => <div data-testid="pages-drawer" />,
}));

const mockSettings: ReaderSettings = {
  template: "modern",
  theme: "light",
  font: "sans",
  fontSize: 16,
  lineHeight: 1.8,
  speed: 1.0,
  hasCompletedOnboarding: true,
};

const mockSentences = [
  { index: 0, text: "O sol brilha fortemente no horizonte pela manhã.", page: 1 },
  { index: 1, text: "As árvores balançam calmamente com o vento.", page: 1 },
  { index: 2, text: "No fim da tarde, o sol se põe com cores douradas.", page: 2 },
  { index: 3, text: "A noite traz um céu repleto de estrelas brilhantes.", page: 2 },
];

const mockVoices = [
  { id: "voice-1", label: "Voz 1 (pt-BR)" },
];

describe("ModernStudioTemplate - Sistema de Busca e Navegação de Ocorrências", () => {
  let scrollIntoViewMock: jest.Mock;

  const defaultProps = {
    sentences: mockSentences,
    currentIndex: 0,
    title: "Documento de Teste",
    settings: mockSettings,
    isPlaying: false,
    isBuffering: false,
    voice: "voice-1",
    speed: "1",
    engine: "system" as const,
    voices: mockVoices,
    disabledEngines: [],
    apiKey: null,
    onEngineChange: jest.fn(),
    onSelectSentence: jest.fn(),
    onToggle: jest.fn(),
    onPrevious: jest.fn(),
    onNext: jest.fn(),
    onRestart: jest.fn(),
    onVoiceChange: jest.fn(),
    onSpeedChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    scrollIntoViewMock = jest.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;
  });

  it("deve rolar automaticamente para a primeira ocorrência ao digitar um termo e exibir contador", () => {
    render(<ModernStudioTemplate {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText(/buscar\.\.\./i);

    act(() => {
      fireEvent.change(searchInput, { target: { value: "sol" } });
    });

    // "sol" aparece nas sentenças 0 e 2 (2 ocorrências)
    expect(screen.getByText("1/2")).toBeInTheDocument();
    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
    });

    // Sentença 0 deve ter destaque ativo
    const sentenceButtons = screen.getAllByRole("button").filter((btn) =>
      btn.hasAttribute("data-sentence-index")
    );
    expect(sentenceButtons[0]).toHaveAttribute("data-search-active", "true");
    expect(sentenceButtons[2]).toHaveAttribute("data-search-match", "true");
  });

  it("deve navegar para a próxima ocorrência ao clicar no botão descer e rolar a tela", () => {
    render(<ModernStudioTemplate {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText(/buscar\.\.\./i);

    act(() => {
      fireEvent.change(searchInput, { target: { value: "sol" } });
    });

    const nextButton = screen.getByRole("button", { name: /próxima ocorrência/i });

    act(() => {
      fireEvent.click(nextButton);
    });

    // Contador deve atualizar para 2/2 e acionar scroll para a segunda sentença correspondente (index 2)
    expect(screen.getByText("2/2")).toBeInTheDocument();
    expect(scrollIntoViewMock).toHaveBeenCalledTimes(2);

    const sentenceButtons = screen.getAllByRole("button").filter((btn) =>
      btn.hasAttribute("data-sentence-index")
    );
    expect(sentenceButtons[2]).toHaveAttribute("data-search-active", "true");
  });

  it("deve fazer wrap-around para o primeiro resultado ao avançar além do último", () => {
    render(<ModernStudioTemplate {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText(/buscar\.\.\./i);

    act(() => {
      fireEvent.change(searchInput, { target: { value: "sol" } });
    });

    const nextButton = screen.getByRole("button", { name: /próxima ocorrência/i });

    // 1 -> 2
    act(() => {
      fireEvent.click(nextButton);
    });
    expect(screen.getByText("2/2")).toBeInTheDocument();

    // 2 -> 1 (wrap-around)
    act(() => {
      fireEvent.click(nextButton);
    });
    expect(screen.getByText("1/2")).toBeInTheDocument();
    expect(scrollIntoViewMock).toHaveBeenCalledTimes(3);
  });

  it("deve navegar para a ocorrência anterior ao clicar no botão subir com wrap-around", () => {
    render(<ModernStudioTemplate {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText(/buscar\.\.\./i);

    act(() => {
      fireEvent.change(searchInput, { target: { value: "sol" } });
    });

    const prevButton = screen.getByRole("button", { name: /ocorrência anterior/i });

    // De 1/2 ao clicar em voltar, deve ir para a última (2/2)
    act(() => {
      fireEvent.click(prevButton);
    });
    expect(screen.getByText("2/2")).toBeInTheDocument();
    expect(scrollIntoViewMock).toHaveBeenCalledTimes(2);
  });

  it("deve navegar com as teclas Enter e Shift+Enter no input de busca", () => {
    render(<ModernStudioTemplate {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText(/buscar\.\.\./i);

    act(() => {
      fireEvent.change(searchInput, { target: { value: "sol" } });
    });

    expect(screen.getByText("1/2")).toBeInTheDocument();

    // Enter -> Próxima ocorrência
    act(() => {
      fireEvent.keyDown(searchInput, { key: "Enter", shiftKey: false });
    });
    expect(screen.getByText("2/2")).toBeInTheDocument();

    // Shift + Enter -> Ocorrência anterior
    act(() => {
      fireEvent.keyDown(searchInput, { key: "Enter", shiftKey: true });
    });
    expect(screen.getByText("1/2")).toBeInTheDocument();
  });

  it("deve exibir 0/0 e desabilitar botões quando nenhuma ocorrência for encontrada", () => {
    render(<ModernStudioTemplate {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText(/buscar\.\.\./i);

    act(() => {
      fireEvent.change(searchInput, { target: { value: "termo_inexistente" } });
    });

    expect(screen.getByText("0/0")).toBeInTheDocument();

    const prevButton = screen.getByRole("button", { name: /ocorrência anterior/i });
    const nextButton = screen.getByRole("button", { name: /próxima ocorrência/i });

    expect(prevButton).toBeDisabled();
    expect(nextButton).toBeDisabled();
  });

  it("deve limpar a busca ao clicar no botão de limpar ou pressionar Escape", () => {
    render(<ModernStudioTemplate {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText(/buscar\.\.\./i);

    act(() => {
      fireEvent.change(searchInput, { target: { value: "sol" } });
    });

    expect(screen.getByText("1/2")).toBeInTheDocument();

    const clearButton = screen.getByRole("button", { name: /limpar busca/i });
    act(() => {
      fireEvent.click(clearButton);
    });

    expect((searchInput as HTMLInputElement).value).toBe("");
    expect(screen.queryByText("1/2")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /próxima ocorrência/i })).not.toBeInTheDocument();

    // Testar com Escape
    act(() => {
      fireEvent.change(searchInput, { target: { value: "sol" } });
    });
    expect(screen.getByText("1/2")).toBeInTheDocument();

    act(() => {
      fireEvent.keyDown(searchInput, { key: "Escape" });
    });
    expect((searchInput as HTMLInputElement).value).toBe("");
    expect(screen.queryByText("1/2")).not.toBeInTheDocument();
  });
});
