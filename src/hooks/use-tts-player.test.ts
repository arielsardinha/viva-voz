import { renderHook, act, waitFor } from "@testing-library/react";
import { useTtsPlayer } from "./use-tts-player";
import type { Sentence } from "@/lib/pdf-text";
import { clearAllAudioCache } from "@/lib/tts-audio-cache";
import {
  TTS_FALLBACK_HEADER,
  TTS_MODEL_HEADER,
  TTS_MODEL_LABEL_HEADER,
} from "@/lib/tts-models";

const mockSentences: Sentence[] = [
  { index: 0, page: 1, text: "Primeira frase para testar." },
  { index: 1, page: 1, text: "Segunda frase do documento." },
  { index: 2, page: 2, text: "Terceira frase na página dois." },
];

function createDefaultTtsHeaders(overrides?: Record<string, string>) {
  return new Headers({
    [TTS_MODEL_HEADER]: "gemini-3.8-flash-tts",
    [TTS_MODEL_LABEL_HEADER]: "Gemini 3.8 Flash TTS",
    [TTS_FALLBACK_HEADER]: "false",
    ...overrides,
  });
}

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
        }),
      );

      expect(result.current.currentIndex).toBe(0);
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.isBuffering).toBe(false);
      expect(result.current.activeTtsModel).toBeNull();
      expect(result.current.activeBlockRange).toBeNull();
    });

    it("deve alternar reprodução com play, pause e toggle", () => {
      const { result } = renderHook(() =>
        useTtsPlayer({
          sentences: mockSentences,
          engine: "system",
          voice: "",
          speed: 1,
        }),
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
        }),
      );

      act(() => {
        result.current.next();
      });
      expect(result.current.currentIndex).toBe(1);

      act(() => {
        result.current.next();
      });
      expect(result.current.currentIndex).toBe(2);

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
        }),
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
        }),
      );

      act(() => {
        result.current.seekTo(1);
      });
      expect(result.current.currentIndex).toBe(1);
      expect(result.current.isPlaying).toBe(false);
    });

    it("deve atualizar posição e pausar reprodução se estiver tocando ao chamar seekTo", () => {
      const { result } = renderHook(() =>
        useTtsPlayer({
          sentences: mockSentences,
          engine: "system",
          voice: "",
          speed: 1,
        }),
      );

      act(() => {
        result.current.play();
      });
      expect(result.current.isPlaying).toBe(true);

      act(() => {
        result.current.seekTo(2);
      });
      expect(result.current.currentIndex).toBe(2);
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
        }),
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
        }),
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
        { initialProps: { speed: 1.0 } },
      );

      act(() => {
        result.current.play();
      });
      expect(createdUtteranceRef.current?.rate).toBe(1.0);

      rerender({ speed: 0.8 });
      expect(createdUtteranceRef.current?.rate).toBe(0.8);

      rerender({ speed: 1.5 });
      expect(createdUtteranceRef.current?.rate).toBe(1.5);

      globalThis.SpeechSynthesisUtterance = originalUtterance;
    });
  });

  describe("Motor de Narração por IA (Google Gemini TTS) - Blocos, Prefetch +1 e Fallback", () => {
    const originalFetch = global.fetch;

    beforeEach(async () => {
      await clearAllAudioCache();
      global.fetch = jest.fn().mockImplementation((_url, options) => {
        const body = options?.body ? JSON.parse(options.body as string) : {};
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: createDefaultTtsHeaders(),
          blob: () => Promise.resolve(new Blob([`audio-for-${body.text}-${body.voice}`], { type: "audio/wav" })),
          json: () => Promise.resolve({}),
        });
      });
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it("deve agrupar frases da mesma página em um bloco único e reutilizar cache ao voltar", async () => {
      const { result } = renderHook(() =>
        useTtsPlayer({
          sentences: mockSentences,
          engine: "google",
          voice: "Kore",
          speed: 1,
          userApiKey: "fake-key",
        }),
      );

      expect(result.current.activeBlockRange).toEqual({ start: 0, end: 1 });

      act(() => {
        result.current.play();
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2); // Bloco 0 + prefetch sequencial do Bloco 1
        expect(result.current.isBuffering).toBe(false);
      });

      const firstCallBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body as string);
      expect(firstCallBody.text).toBe("Primeira frase para testar. Segunda frase do documento.");
      expect(result.current.activeTtsModel).toEqual({
        id: "gemini-3.8-flash-tts",
        label: "Gemini 3.8 Flash TTS",
        shortLabel: "3.8 Flash",
        isFallback: false,
      });

      // Avança para o bloco da página 2 (índice 2), já pré-carregado
      act(() => {
        result.current.jumpTo(2);
      });

      await waitFor(() => {
        expect(result.current.currentIndex).toBe(2);
        expect(result.current.activeBlockRange).toEqual({ start: 2, end: 2 });
        expect(result.current.isBuffering).toBe(false);
      });

      const callsAtBlock1 = (global.fetch as jest.Mock).mock.calls.length;

      // Volta para a sentença 0 (bloco 0 já em cache)
      act(() => {
        result.current.jumpTo(0);
      });

      await waitFor(() => {
        expect(result.current.currentIndex).toBe(0);
        expect(result.current.isBuffering).toBe(false);
      });

      expect((global.fetch as jest.Mock).mock.calls.length).toBe(callsAtBlock1);
    });

    it("deve fazer prefetch sequencial de APENAS 1 próximo bloco somente após o bloco atual resolver", async () => {
      const fourPageSentences: Sentence[] = [
        { index: 0, page: 1, text: "Bloco 0 página 1." },
        { index: 1, page: 2, text: "Bloco 1 página 2." },
        { index: 2, page: 3, text: "Bloco 2 página 3." },
        { index: 3, page: 4, text: "Bloco 3 página 4." },
      ];

      let resolveBlock0!: (val: unknown) => void;
      const block0Promise = new Promise((resolve) => {
        resolveBlock0 = resolve;
      });

      global.fetch = jest.fn().mockImplementation((_url, options) => {
        const body = JSON.parse(options.body as string) as { text: string; voice: string };
        if (body.text === "Bloco 0 página 1.") {
          return block0Promise;
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: createDefaultTtsHeaders(),
          blob: () => Promise.resolve(new Blob([`audio-${body.text}`], { type: "audio/wav" })),
          json: () => Promise.resolve({}),
        });
      });

      const { result } = renderHook(() =>
        useTtsPlayer({
          sentences: fourPageSentences,
          engine: "google",
          voice: "Kore",
          speed: 1,
          userApiKey: "fake-key",
        }),
      );

      act(() => {
        result.current.play();
      });

      // Enquanto bloco 0 está pendente, NENHUM prefetch deve ser disparado (zero rajada inicial)
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });
      expect(JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body).text).toBe("Bloco 0 página 1.");

      // Agora resolve o bloco 0
      act(() => {
        resolveBlock0({
          ok: true,
          status: 200,
          headers: createDefaultTtsHeaders(),
          blob: () => Promise.resolve(new Blob(["audio-0"], { type: "audio/wav" })),
          json: () => Promise.resolve({}),
        });
      });

      await waitFor(() => {
        expect(result.current.isBuffering).toBe(false);
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });

      const requestedTexts = (global.fetch as jest.Mock).mock.calls.map((call) => {
        const body = JSON.parse(call[1].body as string);
        return body.text;
      });

      expect(requestedTexts).toEqual(["Bloco 0 página 1.", "Bloco 1 página 2."]);
      expect(requestedTexts).not.toContain("Bloco 2 página 3.");
      expect(requestedTexts).not.toContain("Bloco 3 página 4.");
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
        { initialProps: { voice: "Kore" } },
      );

      act(() => {
        result.current.play();
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
        expect(result.current.isBuffering).toBe(false);
      });

      const koreCalls = (global.fetch as jest.Mock).mock.calls.filter((call) => {
        const body = JSON.parse(call[1].body as string);
        return body.voice === "Kore" && body.text.includes("Primeira frase para testar.");
      }).length;
      expect(koreCalls).toBe(1);

      rerender({ voice: "Puck" });

      act(() => {
        result.current.play();
      });

      await waitFor(() => {
        const puckCalls = (global.fetch as jest.Mock).mock.calls.filter((call) => {
          const body = JSON.parse(call[1].body as string);
          return body.voice === "Puck" && body.text.includes("Primeira frase para testar.");
        }).length;
        expect(puckCalls).toBe(1);
        expect(result.current.isBuffering).toBe(false);
      });

      rerender({ voice: "Kore" });

      act(() => {
        result.current.play();
      });

      await waitFor(() => {
        expect(result.current.isBuffering).toBe(false);
      });

      const finalKoreCalls = (global.fetch as jest.Mock).mock.calls.filter((call) => {
        const body = JSON.parse(call[1].body as string);
        return body.voice === "Kore" && body.text.includes("Primeira frase para testar.");
      }).length;
      expect(finalKoreCalls).toBe(1);
    });

    it("deve ler headers X-TTS-* de fallback, preencher activeTtsModel e notificar onModelFallback apenas 1 vez por modelo alternativo", async () => {
      const onModelFallback = jest.fn();

      global.fetch = jest.fn().mockImplementation((_url, options) => {
        const body = JSON.parse(options.body as string) as { text: string };
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: createDefaultTtsHeaders({
            [TTS_MODEL_HEADER]: "gemini-3.8-flash-lite-tts",
            [TTS_MODEL_LABEL_HEADER]: "Gemini 3.8 Flash-Lite TTS",
            [TTS_FALLBACK_HEADER]: "true",
          }),
          blob: () => Promise.resolve(new Blob([`audio-${body.text}`], { type: "audio/wav" })),
          json: () => Promise.resolve({}),
        });
      });

      const { result } = renderHook(() =>
        useTtsPlayer({
          sentences: mockSentences,
          engine: "google",
          voice: "Kore",
          speed: 1,
          userApiKey: "fake-key",
          onModelFallback,
        }),
      );

      act(() => {
        result.current.play();
      });

      await waitFor(() => {
        expect(result.current.activeTtsModel).toEqual({
          id: "gemini-3.8-flash-lite-tts",
          label: "Gemini 3.8 Flash-Lite TTS",
          shortLabel: "3.8 Lite",
          isFallback: true,
        });
      });

      // Avança para o Bloco 1 (mesmo modelo alternativo)
      act(() => {
        result.current.jumpTo(2);
      });

      await waitFor(() => {
        expect(result.current.currentIndex).toBe(2);
      });

      expect(onModelFallback).toHaveBeenCalledTimes(1);
      expect(onModelFallback).toHaveBeenCalledWith({
        id: "gemini-3.8-flash-lite-tts",
        label: "Gemini 3.8 Flash-Lite TTS",
        shortLabel: "3.8 Lite",
        isFallback: true,
      });
    });

    it("deve sincronizar currentIndex via ontimeupdate dentro do bloco sem novas requisições e avançar bloco em onended", async () => {
      const createdAudios: HTMLAudioElement[] = [];
      const OriginalAudio = global.Audio;
      global.Audio = jest.fn().mockImplementation(() => {
        const audio = new OriginalAudio();
        Object.defineProperty(audio, "duration", { writable: true, value: 10 });
        Object.defineProperty(audio, "currentTime", { writable: true, value: 0 });
        createdAudios.push(audio);
        return audio;
      }) as unknown as typeof Audio;

      const { result } = renderHook(() =>
        useTtsPlayer({
          sentences: mockSentences,
          engine: "google",
          voice: "Kore",
          speed: 1,
          userApiKey: "fake-key",
        }),
      );

      act(() => {
        result.current.play();
      });

      await waitFor(() => {
        expect(createdAudios.length).toBeGreaterThan(0);
        expect(result.current.isBuffering).toBe(false);
      });

      const fetchCountBeforeTimeUpdate = (global.fetch as jest.Mock).mock.calls.length;
      const audio = createdAudios[0];

      // Avança tempo para 70% do bloco -> deve destacar sentença 1 sem nova chamada à API
      act(() => {
        audio.currentTime = 7;
        audio.ontimeupdate?.(new Event("timeupdate"));
      });

      expect(result.current.currentIndex).toBe(1);
      expect((global.fetch as jest.Mock).mock.calls.length).toBe(fetchCountBeforeTimeUpdate);

      // Finaliza o áudio do bloco 0 -> deve avançar para índice 2 (primeiro do bloco 1)
      act(() => {
        audio.onended?.(new Event("ended"));
      });

      await waitFor(() => {
        expect(result.current.currentIndex).toBe(2);
      });

      global.Audio = OriginalAudio;
    });

    it("deve disparar onEngineUnavailable quando a API retornar 402 (créditos esgotados) sem prefetch", async () => {
      const onEngineUnavailable = jest.fn();

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 402,
        headers: new Headers(),
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
        }),
      );

      act(() => {
        result.current.play();
      });

      await waitFor(() => {
        expect(onEngineUnavailable).toHaveBeenCalledWith(
          "google",
          expect.stringContaining("Créditos esgotados"),
        );
        expect(result.current.isBuffering).toBe(false);
      });
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("deve disparar onEngineUnavailable quando a API retornar 429 (cota/rate limit atingido) sem prefetch", async () => {
      const onEngineUnavailable = jest.fn();

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Headers(),
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
        }),
      );

      act(() => {
        result.current.play();
      });

      await waitFor(() => {
        expect(onEngineUnavailable).toHaveBeenCalledWith(
          "google",
          expect.stringContaining("Cota de narração com IA esgotada"),
        );
        expect(result.current.isBuffering).toBe(false);
      });
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("deve disparar onError quando houver falha de rede na geração do áudio", async () => {
      const onError = jest.fn();

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers(),
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
        }),
      );

      act(() => {
        result.current.play();
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.stringContaining("Erro interno no servidor"));
        expect(result.current.isBuffering).toBe(false);
      });
    });
  });
});
