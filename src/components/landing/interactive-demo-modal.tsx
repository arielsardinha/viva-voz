"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, Volume2, Sparkles, AudioLines } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { WaveformVisualizer } from "@/components/pdf-reader/ui/waveform-visualizer";
import { cn } from "@/lib/utils";

interface InteractiveDemoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface DemoSentence {
  id: number;
  text: string;
  audioSrc: string;
}

export const DEMO_SENTENCES: readonly DemoSentence[] = [
  {
    id: 1,
    text: "VivaVoz é uma plataforma aberta para audição inteligente de documentos e livros digitais.",
    audioSrc: "/audio/01.mp3",
  },
  {
    id: 2,
    text: "Cada frase é sincronizada visualmente na tela enquanto a voz neural pronuncia cada termo com clareza.",
    audioSrc: "/audio/02.mp3",
  },
  {
    id: 3,
    text: "Você pode ajustar a velocidade de reprodução, alternar entre temas tipográficos e tirar dúvidas com o Gemini.",
    audioSrc: "/audio/03.mp3",
  },
  {
    id: 4,
    text: "Tudo funciona com privacidade absoluta: seus dados são seus e armazenados com segurança no navegador e no Google Drive.",
    audioSrc: "/audio/04.mp3",
  },
] as const;

export function InteractiveDemoModal({ open, onOpenChange }: InteractiveDemoModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Pausa e reseta quando o modal fecha
  useEffect(() => {
    if (!open) {
      setIsPlaying(false);
      setCurrentIndex(0);
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        } catch {
          // Ignora se o elemento já estiver desconectado
        }
      }
    }
  }, [open]);

  // Atualiza a taxa de reprodução de áudio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, [speed]);

  // Gerencia play / pause no elemento de áudio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.playbackRate = speed;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Trata bloqueio de autoplay ou interrupção de play
        });
      }
    } else {
      try {
        audio.pause();
      } catch {
        // Ignora erro de pausa
      }
    }
  }, [isPlaying, currentIndex, speed]);

  // Avança para a próxima frase quando o áudio atual terminar
  const handleAudioEnded = useCallback(() => {
    if (currentIndex < DEMO_SENTENCES.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsPlaying(false);
      setCurrentIndex(0);
    }
  }, [currentIndex]);

  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch {
        // Ignora erro
      }
    }
  };

  const handleSelectSentence = (idx: number) => {
    setCurrentIndex(idx);
    setIsPlaying(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-cy="interactive-demo-modal"
        data-testid="interactive-demo-modal"
        className="max-w-2xl p-0 overflow-hidden border-border/80 glass-panel shadow-2xl rounded-3xl"
      >
        {/* Áudio nativo conectado aos arquivos de alta fidelidade */}
        <audio
          ref={audioRef}
          src={DEMO_SENTENCES[currentIndex]?.audioSrc}
          preload="auto"
          onEnded={handleAudioEnded}
          data-testid="demo-audio-element"
        />

        {/* Header com badge */}
        <div className="bg-gradient-to-r from-accent/20 via-indigo-500/15 to-purple-500/20 p-5 border-b border-border/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-md shadow-accent/30">
              <AudioLines className="size-5" aria-hidden="true" />
            </div>
            <div>
              <DialogTitle className="text-base font-extrabold tracking-tight text-foreground sm:text-lg">
                Demonstração Interativa VivaVoz
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Experimente o realce dinâmico de texto sincronizado com voz neural de alta fidelidade
              </DialogDescription>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-bold text-accent">
            <Sparkles className="size-3" />
            Áudio HD
          </span>
        </div>

        {/* Corpo: Texto com realce sincronizado */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="rounded-2xl border border-border/80 bg-background/60 p-4 sm:p-5 shadow-inner">
            <p className="text-sm sm:text-base leading-relaxed tracking-wide text-foreground space-y-2">
              {DEMO_SENTENCES.map((sentence, idx) => (
                <span
                  key={sentence.id}
                  data-testid={`demo-sentence-${idx}`}
                  data-cy={`demo-sentence-${idx}`}
                  onClick={() => handleSelectSentence(idx)}
                  className={cn(
                    "cursor-pointer transition-all duration-300 rounded px-1.5 py-0.5 inline-block mr-1",
                    idx === currentIndex
                      ? "sentence-highlight-active text-foreground font-semibold scale-[1.01]"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  )}
                >
                  {sentence.text}{" "}
                </span>
              ))}
            </p>
          </div>

          {/* Visualizador de Onda Sonora */}
          <div className="rounded-xl border border-border/60 bg-secondary/40 p-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Volume2 className="size-4 text-accent" />
              <span>Voz Neural VivaVoz HD: Português (Brasil)</span>
            </div>
            <WaveformVisualizer isPlaying={isPlaying} barCount={18} />
          </div>

          {/* Controles de Reprodução da Demo */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-cy="demo-play-btn"
                data-testid="demo-play-btn"
                onClick={handleTogglePlay}
                aria-label={isPlaying ? "Pausar demonstração" : "Reproduzir demonstração"}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-accent to-indigo-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-accent-foreground shadow-lg shadow-accent/25 hover:opacity-95 active:scale-95 transition-all cursor-pointer"
              >
                {isPlaying ? (
                  <>
                    <Pause className="size-4 fill-current" />
                    <span>Pausar</span>
                  </>
                ) : (
                  <>
                    <Play className="size-4 fill-current" />
                    <span>Ouvir Exemplo</span>
                  </>
                )}
              </button>

              <button
                type="button"
                data-cy="demo-reset-btn"
                data-testid="demo-reset-btn"
                onClick={handleReset}
                aria-label="Reiniciar demonstração"
                className="flex items-center gap-1.5 rounded-2xl border border-border/80 bg-background/80 px-3.5 py-2.5 text-xs font-semibold text-foreground hover:bg-secondary active:scale-95 transition-all cursor-pointer"
              >
                <RotateCcw className="size-3.5" />
                <span>Reiniciar</span>
              </button>
            </div>

            {/* Ajuste de Velocidade */}
            <div className="flex items-center gap-1 rounded-2xl bg-secondary/70 p-1 border border-border/70">
              {[1, 1.25, 1.5, 2].map((s) => (
                <button
                  key={s}
                  type="button"
                  data-cy={`demo-speed-${s}`}
                  data-testid={`demo-speed-${s}`}
                  onClick={() => setSpeed(s)}
                  className={cn(
                    "rounded-xl px-2.5 py-1 text-xs font-bold transition-all cursor-pointer",
                    speed === s
                      ? "bg-accent text-accent-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="bg-secondary/30 px-5 py-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
          <span>Sentença {currentIndex + 1} de {DEMO_SENTENCES.length}</span>
          <button
            type="button"
            data-cy="demo-close-btn"
            data-testid="demo-close-btn"
            onClick={() => onOpenChange(false)}
            className="font-semibold text-accent hover:underline cursor-pointer"
          >
            Fechar demonstração
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
