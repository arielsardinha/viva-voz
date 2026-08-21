import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { PreferencesTutorialDialog } from "./preferences-tutorial-dialog";
import {
  ReaderSettingsProvider,
  READER_SETTINGS_STORAGE,
} from "@/context/reader-settings-context";

// Mock de speechSynthesis
const mockSpeak = jest.fn();
const mockCancel = jest.fn();

beforeAll(() => {
  window.speechSynthesis = {
    speak: mockSpeak,
    cancel: mockCancel,
    paused: false,
    pending: false,
    speaking: false,
    onvoiceschanged: null,
    getVoices: jest.fn().mockReturnValue([]),
    pause: jest.fn(),
    resume: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  } as unknown as SpeechSynthesis;

  globalThis.SpeechSynthesisUtterance = jest.fn().mockImplementation((text) => ({
    text,
    lang: "pt-BR",
    rate: 1,
    pitch: 1,
    volume: 1,
    voice: null,
    onstart: null,
    onend: null,
    onerror: null,
    onpause: null,
    onresume: null,
    onmark: null,
    onboundary: null,
  })) as unknown as typeof SpeechSynthesisUtterance;
});

describe("PreferencesTutorialDialog Component", () => {
  beforeEach(() => {
    localStorage.clear();
    mockSpeak.mockClear();
    mockCancel.mockClear();
    document.documentElement.removeAttribute("data-reading-theme");
  });

  it("deve renderizar a tela de boas-vindas para usuário novo", () => {
    render(
      <ReaderSettingsProvider>
        <PreferencesTutorialDialog forceOpen={true} />
      </ReaderSettingsProvider>
    );

    expect(screen.getByText("Personalize sua experiência de leitura")).toBeInTheDocument();
    expect(screen.getByText("Fazer a Jornada (Personalizar)")).toBeInTheDocument();
    expect(screen.getByTestId("skip-onboarding-top-btn")).toBeInTheDocument();
  });

  it("deve fechar e marcar onboarding como completo ao clicar em 'Pular tudo' no topo", () => {
    const handleClose = jest.fn();
    render(
      <ReaderSettingsProvider>
        <PreferencesTutorialDialog forceOpen={true} onClose={handleClose} />
      </ReaderSettingsProvider>
    );

    const skipBtn = screen.getByTestId("skip-onboarding-top-btn");
    fireEvent.click(skipBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
    const saved = JSON.parse(localStorage.getItem(READER_SETTINGS_STORAGE) ?? "{}");
    expect(saved.hasCompletedOnboarding).toBe(true);
  });

  it("deve navegar por todas as etapas da jornada, selecionar opções e concluir", () => {
    jest.useFakeTimers();
    const handleClose = jest.fn();
    render(
      <ReaderSettingsProvider>
        <PreferencesTutorialDialog forceOpen={true} onClose={handleClose} />
      </ReaderSettingsProvider>
    );

    // 1. Inicia a jornada
    fireEvent.click(screen.getByTestId("start-journey-btn"));
    expect(screen.getByText("Escolha seu Modo de Leitura Favorito")).toBeInTheDocument();

    // Seleciona Modo Zen
    fireEvent.click(screen.getByTestId("template-option-zen"));

    // Avança para Etapa 2: Tema
    fireEvent.click(screen.getByTestId("next-step-btn"));
    expect(screen.getByText("Selecione o Ambiente & Tema Visual")).toBeInTheDocument();

    // Seleciona Papel Zen (Sépia)
    fireEvent.click(screen.getByTestId("theme-option-sepia"));
    expect(document.documentElement.getAttribute("data-reading-theme")).toBe("sepia");

    // Avança para Etapa 3: Tipografia
    fireEvent.click(screen.getByTestId("next-step-btn"));
    expect(screen.getByText("Ajuste a Tipografia & Conforto Visual")).toBeInTheDocument();

    // Seleciona Merriweather e tamanho 20px
    fireEvent.click(screen.getByTestId("font-option-merriweather"));
    fireEvent.click(screen.getByText("Ampliado")); // preset 20px

    // Avança para Etapa 4: Velocidade e Áudio
    fireEvent.click(screen.getByTestId("next-step-btn"));
    expect(screen.getByText("Configure a Velocidade de Narração")).toBeInTheDocument();

    // Seleciona 1.25x
    fireEvent.click(screen.getByTestId("speed-option-1.25x"));

    // Clica no teste de voz e avança timer
    fireEvent.click(screen.getByTestId("voice-test-btn"));
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(mockSpeak).toHaveBeenCalled();

    // Avança para Etapa 5: Conclusão
    fireEvent.click(screen.getByTestId("next-step-btn"));
    expect(screen.getByText("Configurações salvas com sucesso!")).toBeInTheDocument();
    expect(screen.getByText("Modo Zen Imersivo")).toBeInTheDocument();
    expect(screen.getByText("Papel Zen (Sépia)")).toBeInTheDocument();

    // Conclui e finaliza
    fireEvent.click(screen.getByTestId("finish-onboarding-btn"));
    expect(handleClose).toHaveBeenCalled();

    const saved = JSON.parse(localStorage.getItem(READER_SETTINGS_STORAGE) ?? "{}");
    expect(saved.template).toBe("zen");
    expect(saved.theme).toBe("sepia");
    expect(saved.font).toBe("merriweather");
    expect(saved.fontSize).toBe(20);
    expect(saved.speed).toBe(1.25);
    expect(saved.hasCompletedOnboarding).toBe(true);
    jest.useRealTimers();
  });

  it("deve permitir voltar entre as etapas", () => {
    render(
      <ReaderSettingsProvider>
        <PreferencesTutorialDialog forceOpen={true} />
      </ReaderSettingsProvider>
    );

    // Entra na etapa 1
    fireEvent.click(screen.getByTestId("start-journey-btn"));
    expect(screen.getByText("Escolha seu Modo de Leitura Favorito")).toBeInTheDocument();

    // Avança para etapa 2
    fireEvent.click(screen.getByTestId("next-step-btn"));
    expect(screen.getByText("Selecione o Ambiente & Tema Visual")).toBeInTheDocument();

    // Clica em Voltar
    fireEvent.click(screen.getByTestId("prev-step-btn"));
    expect(screen.getByText("Escolha seu Modo de Leitura Favorito")).toBeInTheDocument();

    // Clica em Voltar ao início
    fireEvent.click(screen.getByTestId("prev-step-btn"));
    expect(screen.getByText("Transforme qualquer PDF em áudio inteligente")).toBeInTheDocument();
  });

  it("deve reproduzir a demonstração sonora na velocidade selecionada (0.8x, 1.5x)", () => {
    interface MockUtterance {
      text: string;
      rate?: number;
      voice?: SpeechSynthesisVoice | null;
      lang?: string;
      onstart?: (() => void) | null;
      onend?: (() => void) | null;
      onerror?: (() => void) | null;
    }
    const lastUtteranceRef: { current: MockUtterance | null } = { current: null };
    globalThis.SpeechSynthesisUtterance = jest.fn().mockImplementation((text: string) => {
      const obj: MockUtterance = { text, rate: 1, voice: null, lang: "pt-BR", onstart: null, onend: null, onerror: null };
      lastUtteranceRef.current = obj;
      return obj;
    }) as unknown as typeof SpeechSynthesisUtterance;

    render(
      <ReaderSettingsProvider>
        <PreferencesTutorialDialog forceOpen={true} />
      </ReaderSettingsProvider>
    );

    // Navega até a etapa 4 (Velocidade)
    fireEvent.click(screen.getByTestId("start-journey-btn")); // Etapa 1
    fireEvent.click(screen.getByTestId("next-step-btn")); // Etapa 2
    fireEvent.click(screen.getByTestId("next-step-btn")); // Etapa 3
    fireEvent.click(screen.getByTestId("next-step-btn")); // Etapa 4

    // Clica em 1.5x
    fireEvent.click(screen.getByTestId("speed-option-1.5x"));
    expect(screen.getByText("Ouvir demonstração (1.5x)")).toBeInTheDocument();

    // Dispara teste sonoro
    fireEvent.click(screen.getByTestId("voice-test-btn"));
    expect(lastUtteranceRef.current?.rate).toBe(1.5);
    expect(lastUtteranceRef.current?.text).toContain("1.5x");

    // Clica em 0.8x
    fireEvent.click(screen.getByTestId("speed-option-0.8x"));
    expect(screen.getByText("Ouvir demonstração (0.8x)")).toBeInTheDocument();

    // Dispara teste sonoro
    fireEvent.click(screen.getByTestId("voice-test-btn"));
    expect(lastUtteranceRef.current?.rate).toBe(0.8);
    expect(lastUtteranceRef.current?.text).toContain("0.8x");
  });
});
