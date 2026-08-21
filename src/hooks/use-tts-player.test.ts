import { renderHook, act, waitFor } from "@testing-library/react";
import { useTtsPlayer } from "./use-tts-player";
import type { Sentence } from "@/lib/pdf-text";

const mockSentences: Sentence[] = [
  { index: 0, page: 1, text: "Primeira frase para testar." },
  { index: 1, page: 1, text: "Segunda frase do documento." },
  { index: 2, page: 2, text: "Terceira frase na página dois." },
];

describe("useTtsPlayer Hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Navegação e Controles Básicos", () => {
    it("deve iniciar com estado inicial correto", () => {
      const { result } = renderHook(() =>
        useTtsPlayer({
          sentences: mockSentences,
          engine: "system",
          voice: "",
          speed: 1,
        })
      );

      expect(result.current.currentIndex).toBe(0);
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.isBuffering).toBe(false);
    });

    it("deve alternar reprodução com play, pause e toggle", () => {
      const { result } = renderHook(() =>
        useTtsPlayer({
          sentences: mockSentences,
          engine: "system",
          voice: "",
          speed: 1,
        })
      );

      act(() => {
        result.current.play();
      });
      expect(result.current.isPlaying).toBe(true);

      act(() => {
        result.current.pause();
      });
      expect(result.current.isPlaying).toBe(false);

      act(() => {
        result.current.toggle();
      });
      expect(result.current.isPlaying).toBe(true);
    });

    it("deve navegar entre frases com next, previous e restart respeitando limites", () => {
      const { result } = renderHook(() =>
        useTtsPlayer({
          sentences: mockSentences,
          engine: "system",
          voice: "",
          speed: 1,
        })
      );

      act(() => {
        result.current.next();
      });
      expect(result.current.currentIndex).toBe(1);

      act(() => {
        result.current.next();
      });
      expect(result.current.currentIndex).toBe(2);

      // Não deve ultrapassar o último índice
      act(() => {
        result.current.next();
      });
      expect(result.current.currentIndex).toBe(2);

      act(() => {
        result.current.previous();
      });
      expect(result.current.currentIndex).toBe(1);

      act(() => {
        result.current.restart();
      });
      expect(result.current.currentIndex).toBe(0);
    });

    it("deve saltar para uma frase específica e iniciar reprodução com jumpTo", () => {
      const { result } = renderHook(() =>
        useTtsPlayer({
          sentences: mockSentences,
          engine: "system",
          voice: "",
          speed: 1,
        })
      );

      act(() => {
        result.current.jumpTo(2);
      });
      expect(result.current.currentIndex).toBe(2);
      expect(result.current.isPlaying).toBe(true);
    });

    it("deve atualizar posição sem iniciar reprodução com seekTo", () => {
      const { result } = renderHook(() =>
        useTtsPlayer({
          sentences: mockSentences,
          engine: "system",
          voice: "",
          speed: 1,
        })
      );

      act(() => {
        result.current.seekTo(1);
      });
      expect(result.current.currentIndex).toBe(1);
      expect(result.current.isPlaying).toBe(false);
    });
  });

  describe("Motor de Narração do Sistema (SpeechSynthesis)", () => {
    it("deve chamar window.speechSynthesis.speak ao reproduzir no motor 'system'", () => {
      const { result } = renderHook(() =>
        useTtsPlayer({
          sentences: mockSentences,
          engine: "system",
          voice: "",
          speed: 1.25,
        })
      );

      act(() => {
        result.current.play();
      });

      expect(window.speechSynthesis.speak).toHaveBeenCalled();
    });

    it("deve aplicar a taxa (rate) correta de acordo com a propriedade speed", () => {
      interface MockUtterance {
        text: string;
        rate?: number;
        voice?: SpeechSynthesisVoice | null;
        lang?: string;
        onend?: (() => void) | null;
        onerror?: (() => void) | null;
      }
      const createdUtteranceRef: { current: MockUtterance | null } = { current: null };
      const originalUtterance = globalThis.SpeechSynthesisUtterance;
      globalThis.SpeechSynthesisUtterance = jest.fn().mockImplementation((text: string) => {
        const obj: MockUtterance = { text, rate: 1, voice: null, lang: "", onend: null, onerror: null };
        createdUtteranceRef.current = obj;
        return obj;
      }) as unknown as typeof SpeechSynthesisUtterance;

      const { result } = renderHook(() =>
        useTtsPlayer({
          sentences: mockSentences,
          engine: "system",
          voice: "",
          speed: 1.5,
        })
      );

      act(() => {
        result.current.play();
      });

      expect(createdUtteranceRef.current?.rate).toBe(1.5);
      globalThis.SpeechSynthesisUtterance = originalUtterance;
    });

    it("deve atualizar dinamicamente a taxa (rate) quando a propriedade speed mudar", () => {
      interface MockUtterance {
        text: string;
        rate?: number;
        voice?: SpeechSynthesisVoice | null;
        lang?: string;
        onend?: (() => void) | null;
        onerror?: (() => void) | null;
      }
      const createdUtteranceRef: { current: MockUtterance | null } = { current: null };
      const originalUtterance = globalThis.SpeechSynthesisUtterance;
      globalThis.SpeechSynthesisUtterance = jest.fn().mockImplementation((text: string) => {
        const obj: MockUtterance = { text, rate: 1, voice: null, lang: "", onend: null, onerror: null };
        createdUtteranceRef.current = obj;
        return obj;
      }) as unknown as typeof SpeechSynthesisUtterance;

      const { result, rerender } = renderHook(
        ({ speed }) =>
          useTtsPlayer({
            sentences: mockSentences,
            engine: "system",
            voice: "",
            speed,
          }),
        { initialProps: { speed: 1.0 } }
      );

      act(() => {
        result.current.play();
      });
      expect(createdUtteranceRef.current?.rate).toBe(1.0);

      // Altera velocidade para 0.8x
      rerender({ speed: 0.8 });
      expect(createdUtteranceRef.current?.rate).toBe(0.8);

      // Altera velocidade para 1.5x
      rerender({ speed: 1.5 });
      expect(createdUtteranceRef.current?.rate).toBe(1.5);

      globalThis.SpeechSynthesisUtterance = originalUtterance;
    });
  });

  describe("Motor de Narração por IA (Google)", () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it("deve disparar onEngineUnavailable quando a API retornar 402 (créditos esgotados)", async () => {
      const onEngineUnavailable = jest.fn();

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 402,
        json: jest.fn().mockResolvedValue({ error: "Créditos esgotados" }),
      });

      const { result } = renderHook(() =>
        useTtsPlayer({
          sentences: mockSentences,
          engine: "google",
          voice: "Kore",
          speed: 1,
          userApiKey: "fake-key",
          onEngineUnavailable,
        })
      );

      act(() => {
        result.current.play();
      });

      await waitFor(() => {
        expect(onEngineUnavailable).toHaveBeenCalledWith(
          "google",
          expect.stringContaining("Créditos esgotados")
        );
      });
    });

    it("deve disparar onError quando houver falha de rede na geração do áudio", async () => {
      const onError = jest.fn();

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({ error: "Erro interno no servidor" }),
      });

      const { result } = renderHook(() =>
        useTtsPlayer({
          sentences: mockSentences,
          engine: "google",
          voice: "Kore",
          speed: 1,
          userApiKey: "fake-key",
          onError,
        })
      );

      act(() => {
        result.current.play();
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.stringContaining("Erro interno no servidor"));
      });
    });
  });
});
