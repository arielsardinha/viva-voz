import { useCallback, useEffect, useRef, useState } from "react";
import type { Sentence } from "@/lib/pdf-text";
import type { TtsEngine } from "@/lib/tts-engines";

interface UseTtsPlayerOptions {
  sentences: Sentence[];
  engine: TtsEngine;
  voice: string;
  speed: number;
  userApiKey?: string | null;
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

async function fetchAudioUrl(
  text: string,
  engine: TtsEngine,
  voice: string,
  userApiKey?: string | null,
): Promise<string> {
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
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export function useTtsPlayer({
  sentences,
  engine,
  voice,
  speed,
  userApiKey,
  onError,
  onEngineUnavailable,
}: UseTtsPlayerOptions) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cacheRef = useRef(new Map<number, string>());
  const requestIdRef = useRef(0);
  const settingsRef = useRef({ engine, voice, userApiKey });

  const isSystem = engine === "system";

  const clearCache = useCallback(() => {
    for (const url of cacheRef.current.values()) URL.revokeObjectURL(url);
    cacheRef.current.clear();
  }, []);

  const stopAll = useCallback(() => {
    audioRef.current?.pause();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const getAudioUrl = useCallback(
    async (index: number) => {
      const cached = cacheRef.current.get(index);
      if (cached) return cached;
      const sentence = sentences[index];
      if (!sentence) throw new Error("Trecho inexistente.");
      const url = await fetchAudioUrl(sentence.text, engine, voice, userApiKey);
      cacheRef.current.set(index, url);
      return url;
    },
    [sentences, engine, voice, userApiKey],
  );

  // Reinicia tudo quando o documento muda
  useEffect(() => {
    setIsPlaying(false);
    clearCache();
    stopAll();
  }, [sentences, clearCache, stopAll]);

  // Motor/voz/conta mudaram: o áudio em cache não vale mais
  useEffect(() => {
    const prev = settingsRef.current;
    if (prev.engine === engine && prev.voice === voice && prev.userApiKey === userApiKey) return;
    settingsRef.current = { engine, voice, userApiKey };
    clearCache();
    setIsPlaying(false);
    stopAll();
    if (audioRef.current) audioRef.current.removeAttribute("src");
  }, [engine, voice, userApiKey, clearCache, stopAll]);

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
      return;
    }
    const sentence = sentences[currentIndex];
    if (!sentence) {
      setIsPlaying(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(sentence.text);
    utterance.rate = speed;
    const selected = synth.getVoices().find((item) => item.voiceURI === voice);
    if (selected) {
      utterance.voice = selected;
      utterance.lang = selected.lang;
    } else {
      utterance.lang = "pt-BR";
    }
    utterance.onend = () => {
      if (requestId !== requestIdRef.current) return;
      advance();
    };
    utterance.onerror = () => {
      if (requestId !== requestIdRef.current) return;
      setIsPlaying(false);
      onError?.("Não foi possível narrar com as vozes do sistema.");
    };
    setIsBuffering(false);
    synth.speak(utterance);

    return () => {
      synth.cancel();
    };
  }, [isSystem, isPlaying, currentIndex, sentences, voice, speed, advance, onError]);

  // Narração com IA (Google/Lovable)
  useEffect(() => {
    if (isSystem) return;
    if (!isPlaying) {
      audioRef.current?.pause();
      return;
    }
    const sentence = sentences[currentIndex];
    if (!sentence) {
      setIsPlaying(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    let cancelled = false;
    setIsBuffering(true);

    void (async () => {
      try {
        const url = await getAudioUrl(currentIndex);
        if (cancelled || requestId !== requestIdRef.current) return;

        const audio = audioRef.current ?? new Audio();
        audioRef.current = audio;
        audio.src = url;
        audio.playbackRate = speed;
        audio.onended = () => {
          if (requestId !== requestIdRef.current) return;
          advance();
        };
        await audio.play();
        if (!cancelled) setIsBuffering(false);

        const next = currentIndex + 1;
        if (next < sentences.length && !cacheRef.current.has(next)) {
          void getAudioUrl(next).catch(() => undefined);
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
    getAudioUrl,
    advance,
    onError,
    onEngineUnavailable,
  ]);

  // Velocidade em tempo real no áudio já carregado
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  const play = useCallback(() => {
    if (sentences.length > 0) setIsPlaying(true);
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
