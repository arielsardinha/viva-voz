"use client";

import {
  AudioLines,
  FileText,
  Gauge,
  Loader2,
  Mic,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TTS_ENGINES, type TtsEngine, type VoiceOption } from "@/lib/tts-engines";
import { WaveformVisualizer } from "./waveform-visualizer";
import { cn } from "@/lib/utils";
import { SPEEDS } from "../player-controls";

interface FloatingAudioDockProps {
  isPlaying: boolean;
  isBuffering: boolean;
  currentIndex: number;
  total: number;
  title: string | null;
  currentPage: number;
  voice: string;
  speed: string;
  engine: TtsEngine;
  voices: VoiceOption[];
  disabledEngines: TtsEngine[];
  onEngineChange: (engine: TtsEngine) => void;
  onToggle: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onRestart: () => void;
  onVoiceChange: (voice: string) => void;
  onSpeedChange: (speed: string) => void;
  className?: string;
}

export function FloatingAudioDock({
  isPlaying,
  isBuffering,
  currentIndex,
  total,
  title,
  currentPage,
  voice,
  speed,
  engine,
  voices,
  disabledEngines,
  onEngineChange,
  onToggle,
  onPrevious,
  onNext,
  onRestart,
  onVoiceChange,
  onSpeedChange,
  className,
}: FloatingAudioDockProps) {
  const progressPercent = total > 0 ? Math.round(((currentIndex + 1) / total) * 100) : 0;
  const currentVoiceObj = voices.find((v) => v.id === voice);
  const voiceLabel = currentVoiceObj?.label ?? "Voz Padrão";
  const engineLabel = TTS_ENGINES.find((e) => e.id === engine)?.label ?? "Sistema";

  return (
    <div
      className={cn(
        "glass-panel fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-5xl rounded-3xl p-3 sm:p-4 shadow-2xl transition-all duration-300",
        className
      )}
    >
      {/* Barra de Progresso Fina no Topo */}
      <div className="absolute top-0 left-6 right-6 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-secondary/80">
        <div
          className="h-full bg-gradient-to-r from-accent to-accent/70 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
        {/* Info do Documento (Esquerda) */}
        <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
          <div className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-primary/10 text-accent ring-1 ring-accent/30 shadow-inner">
            <FileText className="size-5" />
            {isPlaying && (
              <span className="absolute -top-1 -right-1 flex size-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full size-3 bg-accent"></span>
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground tracking-tight">
              {title ?? "Documento sem título"}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Página {currentPage}</span>
              <span>•</span>
              <span>
                {currentIndex + 1} / {total} trechos ({progressPercent}%)
              </span>
            </div>
          </div>
        </div>

        {/* Controles Centrais + Waveform Visualizer */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onRestart}
            title="Reiniciar leitura"
            aria-label="Reiniciar"
            className="text-muted-foreground hover:bg-secondary hover:text-foreground flex size-9 shrink-0 items-center justify-center rounded-full transition-colors"
          >
            <RotateCcw className="size-4" />
          </button>

          <button
            type="button"
            onClick={onPrevious}
            disabled={currentIndex === 0}
            title="Trecho anterior"
            aria-label="Trecho anterior"
            className="text-foreground hover:bg-secondary flex size-9 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-30"
          >
            <SkipBack className="size-5" />
          </button>

          <button
            type="button"
            onClick={onToggle}
            aria-label={isPlaying ? "Pausar" : "Reproduzir"}
            className="bg-accent text-accent-foreground flex size-12 shrink-0 items-center justify-center rounded-full shadow-lg shadow-accent/25 transition-all hover:scale-105 active:scale-95"
          >
            {isBuffering ? (
              <Loader2 className="size-6 animate-spin" />
            ) : isPlaying ? (
              <Pause className="size-6" />
            ) : (
              <Play className="size-6 translate-x-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={currentIndex >= total - 1}
            title="Próximo trecho"
            aria-label="Próximo trecho"
            className="text-foreground hover:bg-secondary flex size-9 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-30"
          >
            <SkipForward className="size-5" />
          </button>

          {/* Forma de Onda Visual no Player Flutuante */}
          <div className="hidden md:block w-36 lg:w-44 px-1">
            <WaveformVisualizer isPlaying={isPlaying} isBuffering={isBuffering} barCount={26} />
          </div>
        </div>

        {/* Controles de Voz & Velocidade (Direita) */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
          {/* Seletor de Velocidade */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold bg-secondary/80 hover:bg-secondary text-foreground border border-border/60 transition-colors"
              >
                <Gauge className="size-3 text-accent" />
                <span>{speed}x</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-panel">
              <DropdownMenuLabel className="text-xs">Velocidade</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={speed} onValueChange={onSpeedChange}>
                {SPEEDS.map((s) => (
                  <DropdownMenuRadioItem key={s} value={s} className="cursor-pointer text-xs">
                    {s}x {s === "1" ? "(Normal)" : ""}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Seletor de Voz & Motor */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-secondary/80 hover:bg-secondary text-foreground border border-border/60 transition-colors max-w-[150px] truncate"
              >
                <Mic className="size-3 text-accent shrink-0" />
                <span className="truncate">{voiceLabel}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 max-h-72 overflow-y-auto glass-panel">
              <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase">
                Motor ({engineLabel})
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={engine}
                onValueChange={(val) => onEngineChange(val as TtsEngine)}
              >
                {TTS_ENGINES.map((eng) => (
                  <DropdownMenuRadioItem
                    key={eng.id}
                    value={eng.id}
                    disabled={disabledEngines.includes(eng.id)}
                    className="cursor-pointer text-xs"
                  >
                    {eng.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>

              <DropdownMenuSeparator className="my-1.5" />
              <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase">
                Voz
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup value={voice} onValueChange={onVoiceChange}>
                {voices.map((v) => (
                  <DropdownMenuRadioItem key={v.id} value={v.id} className="cursor-pointer text-xs">
                    {v.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
