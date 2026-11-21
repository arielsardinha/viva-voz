"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_VOICE, type TtsEngine } from "@/lib/tts-engines";
import { getLocalTtsEngineForVoice } from "@/lib/local-ai/engines/local-tts.router";
import { useVoiceReplySettings } from "./voice-reply-context";

interface InlineVoiceReplyProps {
  text: string;
  label?: string;
  dataCy?: string;
  className?: string;
}

type ReplyStatus = "idle" | "loading" | "playing";

const MINI_BAR_HEIGHTS = [5, 10, 14, 8, 12, 6, 13, 9, 11, 6];

function estimateDurationLabel(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const seconds = Math.max(4, Math.round((words / 2.4)));
  const mins = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${mins}:${String(rem).padStart(2, "0")}`;
}

function clampRate(speed: number): number {
  return Math.max(0.5, Math.min(2.0, Number(speed) || 1.0));
}

/** Gera o áudio da explicação com o mesmo motor/voz usados na leitura do conteúdo. */
async function synthesizeReplyAudio(
  text: string,
  engine: Exclude<TtsEngine, "system">,
  voice: string,
  userApiKey?: string | null,
): Promise<Blob> {
  if (engine === "litert") {
    const localVoice = voice || DEFAULT_VOICE.litert;
    const { blob } = await getLocalTtsEngineForVoice(localVoice).synthesizeToWavBlob(text, localVoice);
    return blob;
  }

  const response = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, engine, voice, userApiKey: userApiKey ?? undefined }),
  });
  if (!response.ok) {
    throw new Error(`Falha ao gerar o áudio (${response.status}).`);
  }
  return response.blob();
}

/** Mini-player âmbar embutido para ouvir respostas da IA ou enunciados do Quiz sem perder o ponto do livro. */
export function InlineVoiceReply({
  text,
  label = "Ouvir explicação",
  dataCy = "inline-voice-reply",
  className,
}: InlineVoiceReplyProps) {
  const settings = useVoiceReplySettings();
  const engine: TtsEngine = settings?.engine ?? "system";
  const voice = settings?.voice ?? "";
  const rate = clampRate(settings?.speed ?? 1);
  const userApiKey = settings?.userApiKey;

  const [status, setStatus] = useState<ReplyStatus>("idle");
  const isActive = status !== "idle";
  const durationLabel = useMemo(() => estimateDurationLabel(text), [text]);

  const requestIdRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const usingSpeechRef = useRef(false);
  const cachedAudioRef = useRef<{ key: string; url: string } | null>(null);

  const stopPlayback = () => {
    requestIdRef.current++;
    audioRef.current?.pause();
    if (usingSpeechRef.current && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    usingSpeechRef.current = false;
  };

  // Para o áudio ao trocar de texto/voz e ao desmontar; libera o blob em cache.
  useEffect(() => {
    return () => {
      stopPlayback();
      if (cachedAudioRef.current) {
        URL.revokeObjectURL(cachedAudioRef.current.url);
        cachedAudioRef.current = null;
      }
      setStatus("idle");
    };
  }, [text, engine, voice]);

  const speakWithSystem = (requestId: number, voiceUri: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setStatus("idle");
      return;
    }
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    const selected = voiceUri ? synth.getVoices().find((item) => item.voiceURI === voiceUri) : undefined;
    if (selected) {
      utterance.voice = selected;
      utterance.lang = selected.lang;
    } else {
      utterance.lang = "pt-BR";
    }
    utterance.rate = rate;
    const finish = () => {
      if (requestId !== requestIdRef.current) return;
      usingSpeechRef.current = false;
      setStatus("idle");
    };
    utterance.onend = finish;
    utterance.onerror = finish;

    synth.cancel();
    usingSpeechRef.current = true;
    setStatus("playing");
    synth.speak(utterance);
  };

  const playWithAiVoice = async (requestId: number, aiEngine: Exclude<TtsEngine, "system">) => {
    const cacheKey = `${aiEngine}::${voice}::${text}`;
    setStatus("loading");
    try {
      let url = cachedAudioRef.current?.key === cacheKey ? cachedAudioRef.current.url : null;
      if (!url) {
        const blob = await synthesizeReplyAudio(text, aiEngine, voice, userApiKey);
        if (cachedAudioRef.current) URL.revokeObjectURL(cachedAudioRef.current.url);
        url = URL.createObjectURL(blob);
        cachedAudioRef.current = { key: cacheKey, url };
      }
      if (requestId !== requestIdRef.current) return;

      audioRef.current?.pause();
      const audio = new Audio(url);
      audioRef.current = audio;
      const finish = () => {
        if (requestId !== requestIdRef.current) return;
        setStatus("idle");
      };
      audio.onended = finish;
      audio.onerror = finish;
      audio.defaultPlaybackRate = rate;
      audio.playbackRate = rate;
      await audio.play();
      if (requestId === requestIdRef.current) setStatus("playing");
    } catch {
      if (requestId !== requestIdRef.current) return;
      // Sem créditos, modelo local ausente ou falha de rede: ainda narra com a voz do sistema.
      speakWithSystem(requestId, "");
    }
  };

  const handleToggle = () => {
    if (isActive) {
      stopPlayback();
      setStatus("idle");
      return;
    }

    const requestId = ++requestIdRef.current;
    if (engine === "system") {
      speakWithSystem(requestId, voice);
    } else {
      void playWithAiVoice(requestId, engine);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      data-cy={dataCy}
      aria-label={isActive ? `Pausar áudio: ${label}` : `${label} (${durationLabel})`}
      aria-pressed={isActive}
      aria-busy={status === "loading"}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-voice/40 bg-voice-soft px-2.5 py-1 text-xs font-semibold text-voice-ink transition-colors hover:bg-voice/20 cursor-pointer shrink-0",
        className,
      )}
    >
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-voice text-primary">
        {status === "loading" ? (
          <Loader2 className="size-3 animate-spin" aria-hidden="true" />
        ) : status === "playing" ? (
          <Pause className="size-3 fill-current" aria-hidden="true" />
        ) : (
          <Play className="size-3 translate-x-[0.5px] fill-current" aria-hidden="true" />
        )}
      </span>
      <span>{status === "loading" ? "Gerando áudio…" : status === "playing" ? "Ouvindo…" : label}</span>
      <span className="flex items-center gap-[2px]" aria-hidden="true">
        {MINI_BAR_HEIGHTS.map((h, idx) => (
          <span
            key={idx}
            style={{ height: `${h}px` }}
            className={cn(
              "w-[2px] rounded-full transition-colors",
              status === "playing" || idx < 4 ? "bg-voice-ink" : "bg-voice-ink/30",
            )}
          />
        ))}
      </span>
      <span className="tabular-nums opacity-85">{durationLabel}</span>
    </button>
  );
}
