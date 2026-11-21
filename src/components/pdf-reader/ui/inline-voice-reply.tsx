"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface InlineVoiceReplyProps {
  text: string;
  label?: string;
  dataCy?: string;
  className?: string;
}

const MINI_BAR_HEIGHTS = [5, 10, 14, 8, 12, 6, 13, 9, 11, 6];

function estimateDurationLabel(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const seconds = Math.max(4, Math.round((words / 2.4)));
  const mins = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${mins}:${String(rem).padStart(2, "0")}`;
}

/** Mini-player âmbar embutido para ouvir respostas da IA ou enunciados do Quiz sem perder o ponto do livro. */
export function InlineVoiceReply({
  text,
  label = "Ouvir explicação",
  dataCy = "inline-voice-reply",
  className,
}: InlineVoiceReplyProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const durationLabel = useMemo(() => estimateDurationLabel(text), [text]);

  useEffect(() => {
    return () => {
      if (activeUtteranceRef.current && typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      activeUtteranceRef.current = null;
    };
  }, []);

  const handleToggle = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setIsSpeaking((prev) => !prev);
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      activeUtteranceRef.current = null;
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    utterance.onend = () => {
      activeUtteranceRef.current = null;
      setIsSpeaking(false);
    };
    utterance.onerror = () => {
      activeUtteranceRef.current = null;
      setIsSpeaking(false);
    };

    window.speechSynthesis.cancel();
    activeUtteranceRef.current = utterance;
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      data-cy={dataCy}
      aria-label={isSpeaking ? `Pausar áudio: ${label}` : `${label} (${durationLabel})`}
      aria-pressed={isSpeaking}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-voice/40 bg-voice-soft px-2.5 py-1 text-xs font-semibold text-voice-ink transition-colors hover:bg-voice/20 cursor-pointer shrink-0",
        className,
      )}
    >
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-voice text-primary">
        {isSpeaking ? (
          <Pause className="size-3 fill-current" aria-hidden="true" />
        ) : (
          <Play className="size-3 translate-x-[0.5px] fill-current" aria-hidden="true" />
        )}
      </span>
      <span>{isSpeaking ? "Ouvindo…" : label}</span>
      <span className="flex items-center gap-[2px]" aria-hidden="true">
        {MINI_BAR_HEIGHTS.map((h, idx) => (
          <span
            key={idx}
            style={{ height: `${h}px` }}
            className={cn(
              "w-[2px] rounded-full transition-colors",
              isSpeaking || idx < 4 ? "bg-voice-ink" : "bg-voice-ink/30",
            )}
          />
        ))}
      </span>
      <span className="tabular-nums opacity-85">{durationLabel}</span>
    </button>
  );
}
