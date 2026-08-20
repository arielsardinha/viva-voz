"use client";

import { AudioLines, Gauge, Loader2, Pause, Play, RotateCcw, SkipBack, SkipForward, Speech } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { TTS_ENGINES, type TtsEngine, type VoiceOption } from "@/lib/tts-engines";

export const SPEEDS = ["0.75", "1", "1.25", "1.5"];

interface PlayerControlsProps {
  isPlaying: boolean;
  isBuffering: boolean;
  currentIndex: number;
  total: number;
  page: number;
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
}

export function PlayerControls({
  isPlaying,
  isBuffering,
  currentIndex,
  total,
  page,
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
}: PlayerControlsProps) {
  const progress = total > 0 ? ((currentIndex + 1) / total) * 100 : 0;
  const engineLabel = TTS_ENGINES.find((item) => item.id === engine)?.label ?? "Sistema";

  const engineMenu = (
    <>
      <DropdownMenuLabel>Motor de narração</DropdownMenuLabel>
      <DropdownMenuRadioGroup
        value={engine}
        onValueChange={(value) => onEngineChange(value as TtsEngine)}
      >
        {TTS_ENGINES.map((item) => (
          <DropdownMenuRadioItem
            key={item.id}
            value={item.id}
            disabled={disabledEngines.includes(item.id)}
          >
            {item.label}
            {disabledEngines.includes(item.id) ? " — indisponível" : ""}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </>
  );

  return (
    <div className="border-border bg-card min-w-0 rounded-2xl border p-3 sm:p-5">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="bg-accent h-full rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-4 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-4">
        <div className="flex min-w-0 flex-wrap items-center justify-center gap-1 sm:gap-2 md:justify-start">
          <button
            type="button"
            onClick={onRestart}
            title="Reiniciar"
            aria-label="Reiniciar"
            className="text-muted-foreground hover:bg-secondary hover:text-foreground inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-colors sm:size-10"
          >
            <RotateCcw className="size-4" />
          </button>
          <button
            type="button"
            onClick={onPrevious}
            disabled={currentIndex === 0}
            title="Trecho anterior"
            aria-label="Trecho anterior"
            className="text-foreground hover:bg-secondary inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40 sm:size-10"
          >
            <SkipBack className="size-5" />
          </button>
          <button
            type="button"
            onClick={onToggle}
            aria-label={isPlaying ? "Pausar" : "Reproduzir"}
            className="bg-accent text-accent-foreground inline-flex size-12 shrink-0 items-center justify-center rounded-full shadow-sm transition-opacity hover:opacity-90 sm:size-14"
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
            className="text-foreground hover:bg-secondary inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40 sm:size-10"
          >
            <SkipForward className="size-5" />
          </button>

          {/* Compactos (estilo YouTube) até lg */}
          <div className="ml-auto flex items-center gap-1 lg:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  title={`Motor de narração: ${engineLabel}`}
                  aria-label="Motor de narração"
                  className="text-foreground hover:bg-secondary inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-colors sm:size-10"
                >
                  <Speech className="size-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">{engineMenu}</DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  title="Voz da narração"
                  aria-label="Voz da narração"
                  className="text-foreground hover:bg-secondary inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-colors sm:size-10"
                >
                  <AudioLines className="size-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Voz</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={voice} onValueChange={onVoiceChange}>
                  {voices.map((item) => (
                    <DropdownMenuRadioItem key={item.id} value={item.id}>
                      {item.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  title="Velocidade"
                  aria-label="Velocidade"
                  className="text-foreground hover:bg-secondary inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-full px-2 text-xs font-semibold transition-colors sm:h-10"
                >
                  <Gauge className="size-5" />
                  {speed}x
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Velocidade</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={speed} onValueChange={onSpeedChange}>
                  {SPEEDS.map((item) => (
                    <DropdownMenuRadioItem key={item} value={item}>
                      {item}x
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="text-muted-foreground order-last min-w-0 text-center text-xs sm:text-sm md:order-none md:text-left">
          Trecho <span className="text-foreground font-semibold">{total > 0 ? currentIndex + 1 : 0}</span>{" "}
          de {total} · Página {page}
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <Select value={engine} onValueChange={(value) => onEngineChange(value as TtsEngine)}>
            <SelectTrigger className="w-[168px]" aria-label="Motor de narração">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TTS_ENGINES.map((item) => (
                <SelectItem
                  key={item.id}
                  value={item.id}
                  disabled={disabledEngines.includes(item.id)}
                >
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={voice} onValueChange={onVoiceChange} disabled={voices.length === 0}>
            <SelectTrigger className="w-[172px]" aria-label="Voz da narração">
              <SelectValue placeholder="Voz padrão" />
            </SelectTrigger>
            <SelectContent>
              {voices.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={speed} onValueChange={onSpeedChange}>
            <SelectTrigger className="w-[92px]" aria-label="Velocidade">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPEEDS.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}x
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
