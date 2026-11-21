"use client";

import { useState } from "react";
import {
  FileText,
  Gauge,
  Loader2,
  Mic,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TTS_ENGINES, type TtsEngine, type VoiceOption } from "@/lib/tts-engines";
import type { ActiveTtsModelInfo } from "@/lib/tts-models";
import { TtsModelIndicator } from "./tts-model-indicator";
import {
  TtsEngineMenuItems,
  getEngineVoicesHeading,
} from "./tts-engine-menu-items";
import { WaveformVisualizer } from "./waveform-visualizer";
import { GeminiKeyDialog } from "../gemini-key-dialog";
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
  activeTtsModel?: ActiveTtsModelInfo | null;
  voices: VoiceOption[];
  disabledEngines: TtsEngine[];
  apiKey?: string | null;
  onApiKeyChange?: (key: string | null) => void;
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
  activeTtsModel = null,
  voices,
  disabledEngines,
  apiKey = null,
  onApiKeyChange = () => {},
  onEngineChange,
  onToggle,
  onPrevious,
  onNext,
  onRestart,
  onVoiceChange,
  onSpeedChange,
  className,
}: FloatingAudioDockProps) {
  const [geminiDialogOpen, setGeminiDialogOpen] = useState(false);
  const progressPercent = total > 0 ? Math.round(((currentIndex + 1) / total) * 100) : 0;
  const currentVoiceObj = voices.find((v) => v.id === voice);
  const voiceLabel = currentVoiceObj?.label ?? "Voz Padrão";
  const engineLabel = TTS_ENGINES.find((e) => e.id === engine)?.label ?? "Sistema";
  const hasApiKey = Boolean(apiKey && apiKey.length >= 10);

  const handleSelectEngine = (nextEngine: TtsEngine) => {
    if (nextEngine === "google" && !hasApiKey) {
      onEngineChange("system");
      setGeminiDialogOpen(true);
      return;
    }
    onEngineChange(nextEngine);
  };

  return (
    <div
      className={cn(
        "glass-panel fixed bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-5xl rounded-[28px] sm:rounded-full border border-border p-2.5 sm:py-2 sm:pl-2.5 sm:pr-4 shadow-[0_18px_48px_-8px_rgba(30,34,48,0.22)] backdrop-blur-md transition-all duration-300",
        className
      )}
    >
      {/* Diálogo Centralizado de Chave Gemini */}
      <GeminiKeyDialog
        apiKey={apiKey}
        onChange={onApiKeyChange}
        open={geminiDialogOpen}
        onOpenChange={setGeminiDialogOpen}
        trigger={<span className="hidden" />}
      />

      {/* Barra de Progresso Fina no Topo */}
      <div className="absolute top-0 left-8 right-8 sm:left-14 sm:right-14 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-voice transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Layout Desktop (sm e acima): 1 linha fluida */}
      <div className="hidden sm:flex items-center justify-between gap-4">
        {/* Info do Documento (Esquerda) */}
        <div className="flex flex-1 items-center gap-3 min-w-0 max-w-xs lg:max-w-sm">
          <div className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-voice-soft text-voice-ink">
            <FileText className="size-5" />
            {isPlaying && (
              <span className="absolute -top-1 -right-1 flex size-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-voice opacity-75 motion-reduce:animate-none"></span>
                <span className="relative inline-flex rounded-full size-3 bg-voice"></span>
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground tracking-tight">
              {title ?? "Documento sem título"}
            </p>
            <div className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap text-xs text-muted-foreground">
              <span>Página {currentPage}</span>
              <span>•</span>
              <span>
                {currentIndex + 1} / {total} trechos ({progressPercent}%)
              </span>
            </div>
          </div>
        </div>

        {/* Controles Centrais + Waveform Visualizer */}
        <div className="flex items-center gap-2 lg:gap-3 shrink-0">
          <button
            type="button"
            onClick={onRestart}
            title="Reiniciar leitura"
            aria-label="Reiniciar"
            className="text-muted-foreground hover:bg-secondary hover:text-foreground flex size-9 shrink-0 items-center justify-center rounded-full transition-colors cursor-pointer"
          >
            <RotateCcw className="size-4" />
          </button>

          <button
            type="button"
            onClick={onPrevious}
            disabled={currentIndex === 0}
            title="Trecho anterior"
            aria-label="Trecho anterior"
            className="text-foreground hover:bg-secondary flex size-9 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-30 cursor-pointer"
          >
            <SkipBack className="size-5" />
          </button>

          <button
            type="button"
            onClick={onToggle}
            aria-label={isPlaying ? "Pausar" : "Reproduzir"}
            className="bg-primary text-primary-foreground flex size-12 shrink-0 items-center justify-center rounded-full shadow-md transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
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
            className="text-foreground hover:bg-secondary flex size-9 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-30 cursor-pointer"
          >
            <SkipForward className="size-5" />
          </button>

          {/* Forma de Onda Visual no Player Flutuante */}
          <div className="hidden md:block w-32 lg:w-44 px-1">
            <WaveformVisualizer isPlaying={isPlaying} isBuffering={isBuffering} barCount={24} />
          </div>
        </div>

        {/* Controles de Voz, IA & Velocidade (Direita) */}
        <div className="flex items-center gap-1.5 justify-end">
          <TtsModelIndicator engine={engine} activeModel={activeTtsModel} />

          {/* Botão de Conectar/Gerenciar IA TTS */}
          {!hasApiKey && (
            <GeminiKeyDialog
              apiKey={apiKey}
              onChange={onApiKeyChange}
              variant="audio"
            />
          )}

          {/* Seletor de Velocidade */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold bg-secondary/80 hover:bg-secondary text-foreground border border-border/60 transition-colors cursor-pointer"
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
                aria-label="Selecionar voz e motor"
                data-cy="floating-voice-trigger"
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-secondary/80 hover:bg-secondary text-foreground border border-border/60 transition-colors max-w-[140px] truncate cursor-pointer"
              >
                <Mic className="size-3 text-accent shrink-0" />
                <span className="truncate">{voiceLabel}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 max-h-80 overflow-y-auto glass-panel">
              <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase">
                Motor ({engineLabel})
              </DropdownMenuLabel>
              <TtsEngineMenuItems
                engine={engine}
                hasApiKey={hasApiKey}
                disabledEngines={disabledEngines}
                onSelectEngine={handleSelectEngine}
                onOpenGeminiDialog={() => setGeminiDialogOpen(true)}
              />

              <DropdownMenuSeparator className="my-1.5" />
              <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase">
                Vozes ({getEngineVoicesHeading(engine, activeTtsModel)})
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

      {/* Layout Mobile (< sm): 2 linhas ultra compactas e ergonômicas */}
      <div className="flex sm:hidden flex-col gap-2">
        {/* Linha 1 Mobile: Info do PDF + Botão IA + Velocidade & Voz */}
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-1.5">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-voice-soft text-voice-ink">
              <FileText className="size-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">
                {title ?? "Documento"}
              </p>
              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                <p className="text-[10px] text-muted-foreground">
                  Pág. {currentPage} • {currentIndex + 1}/{total} ({progressPercent}%)
                </p>
                <TtsModelIndicator engine={engine} activeModel={activeTtsModel} compact />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Ícone de Conectar IA Mobile */}
            {!hasApiKey && (
              <GeminiKeyDialog
                apiKey={apiKey}
                onChange={onApiKeyChange}
                variant="icon"
              />
            )}

            {/* Velocidade Mobile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-0.5 rounded-lg px-2 py-1 text-[11px] font-bold bg-secondary/90 text-foreground border border-border/60 cursor-pointer"
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

            {/* Voz Mobile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Selecionar voz e motor mobile"
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium bg-secondary/90 text-foreground border border-border/60 max-w-[85px] truncate cursor-pointer"
                >
                  <Mic className="size-3 text-accent shrink-0" />
                  <span className="truncate">{voiceLabel}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 max-h-72 overflow-y-auto glass-panel">
                <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase">
                  Motor ({engineLabel})
                </DropdownMenuLabel>
                <TtsEngineMenuItems
                  engine={engine}
                  hasApiKey={hasApiKey}
                  disabledEngines={disabledEngines}
                  onSelectEngine={handleSelectEngine}
                  onOpenGeminiDialog={() => setGeminiDialogOpen(true)}
                />

                <DropdownMenuSeparator className="my-1.5" />
                <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase">
                  Vozes ({getEngineVoicesHeading(engine, activeTtsModel)})
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

        {/* Linha 2 Mobile: Controles de Playback Centralizados */}
        <div className="flex items-center justify-center gap-4 py-0.5">
          <button
            type="button"
            onClick={onRestart}
            title="Reiniciar leitura"
            aria-label="Reiniciar"
            className="text-muted-foreground hover:text-foreground flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-secondary transition-colors cursor-pointer"
          >
            <RotateCcw className="size-4" />
          </button>

          <button
            type="button"
            onClick={onPrevious}
            disabled={currentIndex === 0}
            title="Trecho anterior"
            aria-label="Trecho anterior"
            className="text-foreground hover:bg-secondary flex size-9 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-30 cursor-pointer"
          >
            <SkipBack className="size-4.5" />
          </button>

          <button
            type="button"
            onClick={onToggle}
            aria-label={isPlaying ? "Pausar" : "Reproduzir"}
            className="bg-primary text-primary-foreground flex size-11 shrink-0 items-center justify-center rounded-full shadow-md transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          >
            {isBuffering ? (
              <Loader2 className="size-5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="size-5" />
            ) : (
              <Play className="size-5 translate-x-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={currentIndex >= total - 1}
            title="Próximo trecho"
            aria-label="Próximo trecho"
            className="text-foreground hover:bg-secondary flex size-9 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-30 cursor-pointer"
          >
            <SkipForward className="size-4.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
