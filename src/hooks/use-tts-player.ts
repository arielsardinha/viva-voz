import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import type { Sentence } from "@/lib/pdf-text";
import type { TtsEngine } from "@/lib/tts-engines";
import { LocalModelNotDownloadedError } from "@/lib/local-ai/domain/local-model.types";
import { getLocalModelById, isPiperVoiceId } from "@/lib/local-ai/domain/local-model-catalog";
import {
  cancelAllLocalTts,
  getLocalTtsEngineForVoice,
} from "@/lib/local-ai/engines/local-tts.router";
import {
  TTS_FALLBACK_HEADER,
  TTS_MODEL_HEADER,
  TTS_MODEL_LABEL_HEADER,
  resolveActiveTtsModelInfo,
  type ActiveTtsModelInfo,
} from "@/lib/tts-models";
import {
  findBlockForSentence,
  findSentenceAtRatio,
  getSentenceStartRatio,
  planTtsAudioBlocks,
  type TtsAudioBlock,
} from "@/lib/domain/tts-chunk-planner";

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
  /** Disparado quando ocorre fallback automático para um modelo alternativo de TTS. */
  onModelFallback?: (model: ActiveTtsModelInfo) => void;
}

interface CachedBlockAudio {
  url: string;
  model: ActiveTtsModelInfo | null;
}

interface FetchedBlockAudio {
  blob: Blob;
  model: ActiveTtsModelInfo | null;
}

class TtsHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function fetchAudioBlock(
  text: string,
  engine: TtsEngine,
  voice: string,
  userApiKey?: string | null,
): Promise<FetchedBlockAudio> {
  const response = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, engine, voice, userApiKey: userApiKey ?? undefined }),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new TtsHttpError(
      data?.error ??
        "Não foi possível gerar o áudio no momento. Por favor, tente novamente em instantes.",
      response.status,
    );
  }

  const model = resolveActiveTtsModelInfo(
    response.headers?.get(TTS_MODEL_HEADER) ?? null,
    response.headers?.get(TTS_MODEL_LABEL_HEADER) ?? null,
    response.headers?.get(TTS_FALLBACK_HEADER) ?? null,
  );
  const blob = await response.blob();
  return { blob, model };
}

function getBlockCacheKey(
  engine: TtsEngine,
  voice: string,
  blockIndex: number,
  text: string,
): string {
  return `${engine}::${voice}::block:${blockIndex}::${text.trim()}`;
}

function clampPlaybackRate(speed: number): number {
  return Math.max(0.5, Math.min(2.0, Number(speed) || 1.0));
}

function applySeekIfPending(
  audio: HTMLAudioElement,
  block: TtsAudioBlock,
  pendingSentence: number | null,
): boolean {
  if (
    pendingSentence === null ||
    pendingSentence < block.startSentenceIndex ||
    pendingSentence > block.endSentenceIndex
  ) {
    return false;
  }
  if (Number.isFinite(audio.duration) && audio.duration > 0) {
    audio.currentTime = getSentenceStartRatio(block, pendingSentence) * audio.duration;
    return true;
  }
  return false;
}

interface AttachAudioParams {
  audio: HTMLAudioElement;
  url: string;
  block: TtsAudioBlock;
  totalSentences: number;
  requestId: number;
  isCancelled: () => boolean;
  requestIdRef: MutableRefObject<number>;
  currentLoadedBlockIndexRef: MutableRefObject<number | null>;
  pendingSeekSentenceRef: MutableRefObject<number | null>;
  speedRef: MutableRefObject<number>;
  setIsBuffering: (val: boolean) => void;
  setIsPlaying: (val: boolean) => void;
  setCurrentIndex: (updater: number | ((prev: number) => number)) => void;
}

function configureGoogleAudioElement(params: AttachAudioParams): void {
  const {
    audio,
    url,
    block,
    totalSentences,
    requestId,
    isCancelled,
    requestIdRef,
    currentLoadedBlockIndexRef,
    pendingSeekSentenceRef,
    speedRef,
    setIsBuffering,
    setIsPlaying,
    setCurrentIndex,
  } = params;

  const isSameLoaded =
    audio.src === url &&
    currentLoadedBlockIndexRef.current === block.blockIndex &&
    !audio.ended;

  if (!isSameLoaded) {
    audio.src = url;
    currentLoadedBlockIndexRef.current = block.blockIndex;
  }

  const numericSpeed = clampPlaybackRate(speedRef.current);
  audio.defaultPlaybackRate = numericSpeed;
  audio.playbackRate = numericSpeed;

  if (applySeekIfPending(audio, block, pendingSeekSentenceRef.current)) {
    pendingSeekSentenceRef.current = null;
  }

  audio.onloadedmetadata = () => {
    if (isCancelled() || requestId !== requestIdRef.current) return;
    if (applySeekIfPending(audio, block, pendingSeekSentenceRef.current)) {
      pendingSeekSentenceRef.current = null;
    }
  };
  audio.onplay = () => {
    audio.playbackRate = clampPlaybackRate(speedRef.current);
    if (!isCancelled() && requestId === requestIdRef.current) setIsBuffering(false);
  };
  audio.onwaiting = () => {
    if (!isCancelled() && requestId === requestIdRef.current) setIsBuffering(true);
  };
  audio.onplaying = () => {
    if (!isCancelled() && requestId === requestIdRef.current) setIsBuffering(false);
  };
  audio.ontimeupdate = () => {
    if (isCancelled() || requestId !== requestIdRef.current) return;
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const nextSentence = findSentenceAtRatio(block, audio.currentTime / audio.duration);
    setCurrentIndex((prev) => (prev === nextSentence ? prev : nextSentence));
  };
  audio.onended = () => {
    if (requestId !== requestIdRef.current) return;
    pendingSeekSentenceRef.current = null;
    const nextStart = block.endSentenceIndex + 1;
    if (nextStart >= totalSentences) {
      setIsPlaying(false);
      setIsBuffering(false);
      return;
    }
    setCurrentIndex(nextStart);
  };
}

/** Modelo local (Kokoro ou Piper) exibido no indicador para a voz escolhida. */
function getLocalTtsModelInfo(voiceId: string): ActiveTtsModelInfo {
  return isPiperVoiceId(voiceId)
    ? { id: "piper-cadu", label: "Piper · Cadu (Offline)", shortLabel: "Piper Local", isFallback: false }
    : { id: "kokoro-82m", label: "Kokoro 82M (Offline)", shortLabel: "Kokoro Local", isFallback: false };
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
  onModelFallback,
}: UseTtsPlayerOptions) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [activeTtsModel, setActiveTtsModel] = useState<ActiveTtsModelInfo | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cacheRef = useRef<Map<string, CachedBlockAudio>>(new Map());
  const inFlightRef = useRef<Map<string, Promise<CachedBlockAudio>>>(new Map());
  const requestIdRef = useRef(0);
  const settingsRef = useRef({ engine, voice, userApiKey, documentId });
  const currentLoadedBlockIndexRef = useRef<number | null>(null);
  const pendingSeekSentenceRef = useRef<number | null>(null);
  const lastNotifiedFallbackModelRef = useRef<string | null>(null);
  const speedRef = useRef(speed);
  const onModelFallbackRef = useRef(onModelFallback);

  useEffect(() => {
    onModelFallbackRef.current = onModelFallback;
  }, [onModelFallback]);

  useEffect(() => {
    speedRef.current = speed;
    const numericSpeed = clampPlaybackRate(speed);
    if (audioRef.current) {
      audioRef.current.defaultPlaybackRate = numericSpeed;
      audioRef.current.playbackRate = numericSpeed;
    }
  }, [speed]);

  const isSystem = engine === "system";

  const audioBlocks = useMemo(() => planTtsAudioBlocks(sentences), [sentences]);
  const activeBlock = useMemo(
    () => (isSystem ? null : findBlockForSentence(audioBlocks, currentIndex)),
    [isSystem, audioBlocks, currentIndex],
  );
  const activeBlockIndex = activeBlock?.blockIndex ?? -1;
  const activeBlockRange = activeBlock
    ? { start: activeBlock.startSentenceIndex, end: activeBlock.endSentenceIndex }
    : null;

  const clearCache = useCallback(() => {
    for (const entry of cacheRef.current.values()) {
      try {
        URL.revokeObjectURL(entry.url);
      } catch {
        // Ignora caso a URL já tenha sido revogada
      }
    }
    cacheRef.current.clear();
    inFlightRef.current.clear();
  }, []);

  const stopAll = useCallback(() => {
    audioRef.current?.pause();
    if (engine === "litert") {
      cancelAllLocalTts();
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, [engine]);

  const applyActiveModel = useCallback((model: ActiveTtsModelInfo | null) => {
    if (!model) return;
    setActiveTtsModel(model);
    if (model.isFallback) {
      if (lastNotifiedFallbackModelRef.current !== model.id) {
        lastNotifiedFallbackModelRef.current = model.id;
        onModelFallbackRef.current?.(model);
      }
    } else {
      lastNotifiedFallbackModelRef.current = null;
    }
  }, []);

  const getBlockAudio = useCallback(
    async (
      block: TtsAudioBlock,
      targetEngine = engine,
      targetVoice = voice,
    ): Promise<CachedBlockAudio> => {
      const cacheKey = getBlockCacheKey(targetEngine, targetVoice, block.blockIndex, block.text);
      const cached = cacheRef.current.get(cacheKey);
      if (cached) return cached;

      const inFlight = inFlightRef.current.get(cacheKey);
      if (inFlight) return inFlight;

      const promise = (async () => {
        try {
          if (targetEngine === "litert") {
            const localVoice = targetVoice || "pf_dora";
            const { blob } = await getLocalTtsEngineForVoice(localVoice).synthesizeToWavBlob(
              block.text,
              localVoice,
            );
            const entry: CachedBlockAudio = {
              url: URL.createObjectURL(blob),
              model: getLocalTtsModelInfo(localVoice),
            };
            cacheRef.current.set(cacheKey, entry);
            return entry;
          }

          const { blob, model } = await fetchAudioBlock(
            block.text,
            targetEngine,
            targetVoice,
            userApiKey,
          );
          const entry: CachedBlockAudio = { url: URL.createObjectURL(blob), model };
          cacheRef.current.set(cacheKey, entry);
          return entry;
        } finally {
          inFlightRef.current.delete(cacheKey);
        }
      })();

      inFlightRef.current.set(cacheKey, promise);
      return promise;
    },
    [engine, voice, userApiKey],
  );

  /** Pré-carrega APENAS o próximo bloco após o bloco atual ser obtido com sucesso. */
  const prefetchNextBlock = useCallback(
    (blockIndex: number, targetEngine = engine, targetVoice = voice) => {
      if (targetEngine === "system") return;
      const nextBlock = audioBlocks[blockIndex + 1];
      if (!nextBlock) return;

      const key = getBlockCacheKey(targetEngine, targetVoice, nextBlock.blockIndex, nextBlock.text);
      if (!cacheRef.current.has(key) && !inFlightRef.current.has(key)) {
        void getBlockAudio(nextBlock, targetEngine, targetVoice).catch(() => undefined);
      }
    },
    [audioBlocks, engine, voice, getBlockAudio],
  );

  useEffect(() => {
    setIsPlaying(false);
    setIsBuffering(false);
    setActiveTtsModel(null);
    lastNotifiedFallbackModelRef.current = null;
    currentLoadedBlockIndexRef.current = null;
    pendingSeekSentenceRef.current = null;
    clearCache();
    stopAll();
  }, [sentences, clearCache, stopAll]);

  useEffect(() => {
    const prev = settingsRef.current;
    if (
      prev.engine === engine &&
      prev.voice === voice &&
      prev.userApiKey === userApiKey &&
      prev.documentId === documentId
    ) {
      return;
    }
    settingsRef.current = { engine, voice, userApiKey, documentId };
    setIsPlaying(false);
    setIsBuffering(false);
    setActiveTtsModel(null);
    lastNotifiedFallbackModelRef.current = null;
    currentLoadedBlockIndexRef.current = null;
    pendingSeekSentenceRef.current = null;
    stopAll();
    if (audioRef.current) audioRef.current.removeAttribute("src");
  }, [engine, voice, userApiKey, documentId, stopAll]);

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

  // Narração com IA (Google Gemini TTS em blocos)
  useEffect(() => {
    if (isSystem) return;
    if (!isPlaying) {
      audioRef.current?.pause();
      setIsBuffering(false);
      return;
    }
    const block = activeBlockIndex >= 0 ? audioBlocks[activeBlockIndex] : undefined;
    if (!block) {
      setIsPlaying(false);
      setIsBuffering(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    let cancelled = false;
    setIsBuffering(true);

    void (async () => {
      try {
        const entry = await getBlockAudio(block, engine, voice);
        if (cancelled || requestId !== requestIdRef.current) return;

        applyActiveModel(entry.model);
        prefetchNextBlock(block.blockIndex, engine, voice);

        const audio = audioRef.current ?? new Audio();
        audioRef.current = audio;

        configureGoogleAudioElement({
          audio,
          url: entry.url,
          block,
          totalSentences: sentences.length,
          requestId,
          isCancelled: () => cancelled,
          requestIdRef,
          currentLoadedBlockIndexRef,
          pendingSeekSentenceRef,
          speedRef,
          setIsBuffering,
          setIsPlaying,
          setCurrentIndex,
        });

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
        if (error instanceof LocalModelNotDownloadedError) {
          const missing = getLocalModelById(error.modelId)?.shortName ?? "Kokoro 82M";
          onEngineUnavailable?.(
            "litert",
            `Baixe o modelo ${missing} para narrar offline com IA Local.`,
          );
        } else if (error instanceof TtsHttpError && [402, 403, 404, 429].includes(error.status)) {
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
    activeBlockIndex,
    audioBlocks,
    sentences.length,
    engine,
    voice,
    getBlockAudio,
    prefetchNextBlock,
    applyActiveModel,
    onError,
    onEngineUnavailable,
  ]);

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
        return;
      }
    }
    play();
  }, [isPlaying, isSystem, pause, play]);

  const goTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, Math.max(sentences.length - 1, 0)));
      if (!isSystem) {
        const targetBlock = findBlockForSentence(audioBlocks, clamped);
        const audio = audioRef.current;
        if (
          targetBlock &&
          audio &&
          audio.src &&
          currentLoadedBlockIndexRef.current === targetBlock.blockIndex
        ) {
          if (Number.isFinite(audio.duration) && audio.duration > 0) {
            audio.currentTime = getSentenceStartRatio(targetBlock, clamped) * audio.duration;
            pendingSeekSentenceRef.current = null;
          } else {
            pendingSeekSentenceRef.current = clamped;
          }
          setCurrentIndex(clamped);
          return;
        }
      }

      requestIdRef.current++;
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.onended = null;
        audio.ontimeupdate = null;
        audio.removeAttribute("src");
      }
      currentLoadedBlockIndexRef.current = null;
      pendingSeekSentenceRef.current = clamped;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setCurrentIndex(clamped);
    },
    [sentences.length, isSystem, audioBlocks],
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

  const seekTo = useCallback(
    (index: number) => {
      setIsPlaying(false);
      setIsBuffering(false);
      goTo(index);
    },
    [goTo],
  );

  return {
    currentIndex,
    isPlaying,
    isBuffering,
    // Na IA local o modelo é definido pela voz: mostra o certo antes do primeiro play.
    activeTtsModel: engine === "litert" ? getLocalTtsModelInfo(voice || "pf_dora") : activeTtsModel,
    activeBlockRange,
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
