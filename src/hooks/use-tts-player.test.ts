import { renderHook, act, waitFor } from "@testing-library/react";
import { useTtsPlayer } from "./use-tts-player";
import type { Sentence } from "@/lib/pdf-text";
import { clearAllAudioCache } from "@/lib/tts-audio-cache";

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

  describe("Motor de Narração por IA (Google Gemini TTS) - Cache & Prefetch", () => {
    const originalFetch = global.fetch;

    beforeEach(async () => {
      await clearAllAudioCache();
      global.fetch = jest.fn().mockImplementation((url, options) => {
        const body = options?.body ? JSON.parse(options.body as string) : {};
        return Promise.resolve({
          ok: true,
          status: 200,
          blob: () => Promise.resolve(new Blob([`audio-for-${body.text}-${body.voice}`], { type: "audio/wav" })),
          json: () => Promise.resolve({}),
        });
      });
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it("deve armazenar em cache os áudios gerados e reutilizá-los sem novas chamadas à API quando a voz for a mesma", async () => {
      const { result } = renderHook(() =>
        useTtsPlayer({
          sentences: mockSentences,
          engine: "google",
          voice: "Kore",
          speed: 1,
          userApiKey: "fake-key",
        })
      );

      act(() => {
        result.current.play();
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      const initialFetchCount = (global.fetch as jest.Mock).mock.calls.length;

      // Avança para a frase 1
      act(() => {
        result.current.next();
      });

      await waitFor(() => {
        expect(result.current.currentIndex).toBe(1);
      });

      const afterNextFetchCount = (global.fetch as jest.Mock).mock.calls.length;

      // Volta para a frase 0 (que já foi carregada)
      act(() => {
        result.current.previous();
      });

      await waitFor(() => {
        expect(result.current.currentIndex).toBe(0);
      });

      // Não deve ter feito novas requisições para a frase 0, pois ela já está no cache com a mesma voz
      expect((global.fetch as jest.Mock).mock.calls.length).toBe(afterNextFetchCount);
    });

    it("deve pré-carregar automaticamente SOMENTE os 2 próximos textos na fila", async () => {
      const fiveSentences: Sentence[] = [
        { index: 0, page: 1, text: "Frase 0" },
        { index: 1, page: 1, text: "Frase 1" },
        { index: 2, page: 1, text: "Frase 2" },
        { index: 3, page: 1, text: "Frase 3" },
        { index: 4, page: 1, text: "Frase 4" },
      ];

      const { result } = renderHook(() =>
        useTtsPlayer({
          sentences: fiveSentences,
          engine: "google",
          voice: "Kore",
          speed: 1,
          userApiKey: "fake-key",
        })
      );

      act(() => {
        result.current.play();
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      // Deve ter feito requisições para: Frase 0 (atual), Frase 1 (próxima) e Frase 2 (segunda próxima)
      const requestedTexts = (global.fetch as jest.Mock).mock.calls.map((call) => {
        const body = JSON.parse(call[1].body);
        return body.text;
      });

      expect(requestedTexts).toContain("Frase 0");
      expect(requestedTexts).toContain("Frase 1");
      expect(requestedTexts).toContain("Frase 2");
      // Não deve ter carregado além dos 2 próximos (Frase 3 e 4 não devem ser carregadas agora)
      expect(requestedTexts).not.toContain("Frase 3");
      expect(requestedTexts).not.toContain("Frase 4");
    });

    it("deve priorizar o cache quando a voz for a mesma e buscar novo áudio quando a voz mudar", async () => {
      const { result, rerender } = renderHook(
        ({ voice }) =>
          useTtsPlayer({
            sentences: mockSentences,
            engine: "google",
            voice,
            speed: 1,
            userApiKey: "fake-key",
          }),
        { initialProps: { voice: "Kore" } }
      );

      act(() => {
        result.current.play();
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      const koreCalls = (global.fetch as jest.Mock).mock.calls.filter((call) => {
        const body = JSON.parse(call[1].body);
        return body.voice === "Kore" && body.text === "Primeira frase para testar.";
      }).length;
      expect(koreCalls).toBe(1);

      // Troca a voz para "Puck"
      rerender({ voice: "Puck" });

      act(() => {
        result.current.play();
      });

      await waitFor(() => {
        const puckCalls = (global.fetch as jest.Mock).mock.calls.filter((call) => {
          const body = JSON.parse(call[1].body);
          return body.voice === "Puck" && body.text === "Primeira frase para testar.";
        }).length;
        expect(puckCalls).toBe(1);
      });

      // Retorna para a voz "Kore" - deve reaproveitar o cache já gerado anteriormente sem nova requisição
      rerender({ voice: "Kore" });

      act(() => {
        result.current.play();
      });

      const finalKoreCalls = (global.fetch as jest.Mock).mock.calls.filter((call) => {
        const body = JSON.parse(call[1].body);
        return body.voice === "Kore" && body.text === "Primeira frase para testar.";
      }).length;

      expect(finalKoreCalls).toBe(1); // Manteve 1, sem nova requisição!
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

    it("deve disparar onEngineUnavailable quando a API retornar 429 (cota/rate limit atingido)", async () => {
      const onEngineUnavailable = jest.fn();

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: jest.fn().mockResolvedValue({
          error: "Cota de narração com IA esgotada ou limite de requisições atingido.",
        }),
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
          expect.stringContaining("Cota de narração com IA esgotada")
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
