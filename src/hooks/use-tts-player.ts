import { useCallback, useEffect, useRef, useState } from "react";
import type { Sentence } from "@/lib/pdf-text";
import type { TtsEngine } from "@/lib/tts-engines";
import {
  getCachedAudioBlob,
  saveCachedAudio,
  buildAudioCacheKey,
} from "@/lib/tts-audio-cache";

interface UseTtsPlayerOptions {
  sentences: Sentence[];
  engine: TtsEngine;
  voice: string;
  speed: number;
  userApiKey?: string | null;
  documentId?: string | null;
  onError?: (message: string) => void;
  /** Disparado quando o motor de IA fica indisponível (sem créditos/permissão). */
  onEngineUnavailable?: (engine: TtsEngine, message: string) => void;
}

class TtsHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function fetchAudioBlob(
  text: string,
  engine: TtsEngine,
  voice: string,
  userApiKey?: string | null,
): Promise<Blob> {
  const response = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, engine, voice, userApiKey: userApiKey ?? undefined }),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new TtsHttpError(
      data?.error ?? `Falha ao gerar áudio (${response.status}).`,
      response.status,
    );
  }
  return await response.blob();
}

function getCacheKey(engine: TtsEngine, voice: string, text: string): string {
  return `${engine}::${voice}::${text.trim()}`;
}

export function useTtsPlayer({
  sentences,
  engine,
  voice,
  speed,
  userApiKey,
  documentId,
  onError,
  onEngineUnavailable,
}: UseTtsPlayerOptions) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cacheRef = useRef<Map<string, string>>(new Map());
  const inFlightRef = useRef<Map<string, Promise<string>>>(new Map());
  const requestIdRef = useRef(0);
  const settingsRef = useRef({ engine, voice, userApiKey, documentId });

  const isSystem = engine === "system";

  const clearCache = useCallback(() => {
    for (const url of cacheRef.current.values()) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // Ignora caso a URL já tenha sido revogada
      }
    }
    cacheRef.current.clear();
    inFlightRef.current.clear();
  }, []);

  const stopAll = useCallback(() => {
    audioRef.current?.pause();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const getAudioUrl = useCallback(
    async (index: number, targetEngine = engine, targetVoice = voice) => {
      const sentence = sentences[index];
      if (!sentence) throw new Error("Trecho inexistente.");

      const cacheKey = getCacheKey(targetEngine, targetVoice, sentence.text);

      // 1. Nível 1: Cache em Memória RAM (0ms de latência)
      const cached = cacheRef.current.get(cacheKey);
      if (cached) return cached;

      // 2. Deduplicação de requisições em andamento
      const inFlight = inFlightRef.current.get(cacheKey);
      if (inFlight) return inFlight;

      const promise = (async () => {
        try {
          // 3. Nível 2: Cache Persistente no IndexedDB (se for IA)
          if (targetEngine !== "system") {
            const persistedBlob = await getCachedAudioBlob(
              documentId,
              targetEngine,
              targetVoice,
              sentence.text,
            );
            if (persistedBlob) {
              const url = URL.createObjectURL(persistedBlob);
              cacheRef.current.set(cacheKey, url);
              return url;
            }
          }

          // 4. Se não estiver em cache, faz a requisição na API
          const blob = await fetchAudioBlob(sentence.text, targetEngine, targetVoice, userApiKey);
          const url = URL.createObjectURL(blob);
          cacheRef.current.set(cacheKey, url);

          // 5. Salva no IndexedDB em background com fallback transparente
          if (targetEngine !== "system") {
            const trackKey = buildAudioCacheKey(documentId, targetEngine, targetVoice, sentence.text);
            void saveCachedAudio({
              id: trackKey,
              documentId: documentId && documentId.trim().length > 0 ? documentId.trim() : "general",
              engine: targetEngine,
              voice: targetVoice,
              sentenceIndex: index,
              text: sentence.text,
              audioBlob: blob,
              sizeBytes: blob.size,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            }).catch(() => undefined);
          }

          return url;
        } finally {
          inFlightRef.current.delete(cacheKey);
        }
      })();

      inFlightRef.current.set(cacheKey, promise);
      return promise;
    },
    [sentences, engine, voice, userApiKey, documentId],
  );

  /** Pré-carrega SOMENTE os dois próximos textos na fila para garantir reprodução fluida */
  const prefetchNextSentences = useCallback(
    (startIndex: number, targetEngine = engine, targetVoice = voice) => {
      if (targetEngine === "system") return;

      const targetIndices = [startIndex + 1, startIndex + 2].filter(
        (idx) => idx >= 0 && idx < sentences.length,
      );

      for (const idx of targetIndices) {
        const sentence = sentences[idx];
        if (!sentence) continue;
        const key = getCacheKey(targetEngine, targetVoice, sentence.text);
        if (!cacheRef.current.has(key) && !inFlightRef.current.has(key)) {
          void getAudioUrl(idx, targetEngine, targetVoice).catch(() => undefined);
        }
      }
    },
    [sentences, engine, voice, getAudioUrl],
  );

  // Reinicia tudo e esvazia cache de URLs quando o documento muda
  useEffect(() => {
    setIsPlaying(false);
    setIsBuffering(false);
    clearCache();
    stopAll();
  }, [sentences, clearCache, stopAll]);

  // Motor/voz/conta mudaram: pausa a narração atual mantendo cache disponível para reutilização futura
  useEffect(() => {
    const prev = settingsRef.current;
    if (prev.engine === engine && prev.voice === voice && prev.userApiKey === userApiKey) return;
    settingsRef.current = { engine, voice, userApiKey };
    setIsPlaying(false);
    setIsBuffering(false);
    stopAll();
    if (audioRef.current) audioRef.current.removeAttribute("src");
  }, [engine, voice, userApiKey, stopAll]);

  useEffect(() => {
    return () => {
      clearCache();
      stopAll();
    };
  }, [clearCache, stopAll]);

  const advance = useCallback(() => {
    setCurrentIndex((index) => {
      if (index >= sentences.length - 1) {
        setIsPlaying(false);
        setIsBuffering(false);
        return index;
      }
      return index + 1;
    });
  }, [sentences.length]);

  // Narração com as vozes do navegador/sistema
  useEffect(() => {
    if (!isSystem) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    if (!isPlaying) {
      synth.cancel();
      setIsBuffering(false);
      return;
    }
    const sentence = sentences[currentIndex];
    if (!sentence) {
      setIsPlaying(false);
      setIsBuffering(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(sentence.text);
    const selected = synth.getVoices().find((item) => item.voiceURI === voice);
    if (selected) {
      utterance.voice = selected;
      utterance.lang = selected.lang;
    } else {
      utterance.lang = "pt-BR";
    }
    // Atribuição de rate OBRIGATORIAMENTE após a voz para evitar que o navegador resete para 1.0
    utterance.rate = Number(speed) || 1.0;
    utterance.onend = () => {
      if (requestId !== requestIdRef.current) return;
      advance();
    };
    utterance.onerror = () => {
      if (requestId !== requestIdRef.current) return;
      setIsPlaying(false);
      setIsBuffering(false);
      onError?.("Não foi possível narrar com as vozes do sistema.");
    };
    setIsBuffering(false);
    synth.speak(utterance);

    return () => {
      synth.cancel();
    };
  }, [isSystem, isPlaying, currentIndex, sentences, voice, speed, advance, onError]);

  // Narração com IA (Google Gemini TTS)
  useEffect(() => {
    if (isSystem) return;
    if (!isPlaying) {
      audioRef.current?.pause();
      setIsBuffering(false);
      return;
    }
    const sentence = sentences[currentIndex];
    if (!sentence) {
      setIsPlaying(false);
      setIsBuffering(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    let cancelled = false;
    setIsBuffering(true);

    void (async () => {
      try {
        // Dispara em paralelo o prefetch dos 2 próximos trechos na fila
        prefetchNextSentences(currentIndex, engine, voice);

        const url = await getAudioUrl(currentIndex, engine, voice);
        if (cancelled || requestId !== requestIdRef.current) return;

        const audio = audioRef.current ?? new Audio();
        audioRef.current = audio;
        audio.src = url;
        const numericSpeed = Math.max(0.5, Math.min(2.0, Number(speed) || 1.0));
        audio.defaultPlaybackRate = numericSpeed;
        audio.playbackRate = numericSpeed;

        audio.onplay = () => {
          if (audioRef.current) audioRef.current.playbackRate = numericSpeed;
          if (!cancelled && requestId === requestIdRef.current) {
            setIsBuffering(false);
          }
        };
        audio.onwaiting = () => {
          if (!cancelled && requestId === requestIdRef.current) {
            setIsBuffering(true);
          }
        };
        audio.onplaying = () => {
          if (!cancelled && requestId === requestIdRef.current) {
            setIsBuffering(false);
          }
        };
        audio.onended = () => {
          if (requestId !== requestIdRef.current) return;
          advance();
        };

        await audio.play();
        if (!cancelled && requestId === requestIdRef.current) {
          setIsBuffering(false);
        }
      } catch (error) {
        if (cancelled || requestId !== requestIdRef.current) return;
        setIsBuffering(false);
        setIsPlaying(false);
        const message =
          error instanceof Error ? error.message : "Não foi possível narrar este trecho.";
        if (error instanceof TtsHttpError && [402, 403, 404].includes(error.status)) {
          onEngineUnavailable?.(engine, message);
        } else {
          onError?.(message);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    isSystem,
    isPlaying,
    currentIndex,
    sentences,
    speed,
    engine,
    voice,
    getAudioUrl,
    prefetchNextSentences,
    advance,
    onError,
    onEngineUnavailable,
  ]);

  // Velocidade em tempo real no áudio já carregado
  useEffect(() => {
    const numericSpeed = Math.max(0.5, Math.min(2.0, Number(speed) || 1.0));
    if (audioRef.current) {
      audioRef.current.defaultPlaybackRate = numericSpeed;
      audioRef.current.playbackRate = numericSpeed;
    }
  }, [speed]);

  const play = useCallback(() => {
    if (sentences.length > 0) {
      setIsPlaying(true);
    }
  }, [sentences.length]);

  const pause = useCallback(() => {
    requestIdRef.current++;
    setIsPlaying(false);
    setIsBuffering(false);
    stopAll();
  }, [stopAll]);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
      return;
    }
    if (!isSystem) {
      const audio = audioRef.current;
      if (audio && audio.src && audio.currentTime > 0 && !audio.ended) {
        setIsPlaying(true);
        void audio.play().catch(() => setIsPlaying(false));
        return;
      }
    }
    play();
  }, [isPlaying, isSystem, pause, play]);

  const goTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, Math.max(sentences.length - 1, 0)));
      requestIdRef.current++;
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.onended = null;
        audio.removeAttribute("src");
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setCurrentIndex(clamped);
    },
    [sentences.length],
  );

  const previous = useCallback(() => goTo(currentIndex - 1), [goTo, currentIndex]);
  const next = useCallback(() => goTo(currentIndex + 1), [goTo, currentIndex]);
  const restart = useCallback(() => goTo(0), [goTo]);

  const jumpTo = useCallback(
    (index: number) => {
      goTo(index);
      setIsPlaying(true);
    },
    [goTo],
  );

  const seekTo = useCallback((index: number) => goTo(index), [goTo]);

  return {
    currentIndex,
    isPlaying,
    isBuffering,
    play,
    pause,
    toggle,
    previous,
    next,
    restart,
    jumpTo,
    seekTo,
  };
}
