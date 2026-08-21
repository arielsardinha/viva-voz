"use client";

import { Check, Headphones, Volume2, VolumeX } from "lucide-react";
import { DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SPEED_PRESETS } from "./tutorial-constants";
import { cn } from "@/lib/utils";

interface StepSpeedProps {
  selectedSpeed: number;
  onSelectSpeed: (speed: number) => void;
  isPlayingTestVoice: boolean;
  onPlayVoiceSample: (speed?: number) => void;
}

export function StepSpeed({
  selectedSpeed,
  onSelectSpeed,
  isPlayingTestVoice,
  onPlayVoiceSample,
}: StepSpeedProps) {
  return (
    <div className="space-y-4 sm:space-y-5">
      <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
        Defina o ritmo de audição padrão e experimente o áudio com um teste sonoro.
      </DialogDescription>

      {/* Seletor de Velocidade */}
      <div className="space-y-1.5 sm:space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Velocidade de Reprodução Padrão
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
          {SPEED_PRESETS.map((sp) => {
            const isSelected = selectedSpeed === sp.value;
            return (
              <button
                key={sp.label}
                type="button"
                data-cy={`speed-option-${sp.label}`}
                data-testid={`speed-option-${sp.label}`}
                onClick={() => onSelectSpeed(sp.value)}
                className={cn(
                  "p-2.5 sm:p-3 rounded-2xl border-2 text-left transition-all cursor-pointer",
                  isSelected
                    ? "border-accent bg-accent/10 text-accent ring-1 ring-accent"
                    : "border-border bg-card/60 text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm sm:text-base font-extrabold">{sp.label}</div>
                  {isSelected && <Check className="size-3.5 text-accent stroke-[3]" aria-hidden="true" />}
                </div>
                <div className="text-[10px] sm:text-[11px] opacity-80">{sp.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Demonstração Sonora com Web Speech */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-secondary/50 border border-border/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3 text-left">
          <div className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-accent/20 text-accent">
            <Headphones className="size-4 sm:size-5" aria-hidden="true" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-foreground">Teste Sonoro Instantâneo</h5>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground">
              Ouça uma frase de demonstração na velocidade selecionada ({selectedSpeed}x).
            </p>
          </div>
        </div>

        <Button
          type="button"
          data-cy="voice-test-btn"
          data-testid="voice-test-btn"
          onClick={() => onPlayVoiceSample()}
          variant="outline"
          className={cn(
            "w-full sm:w-auto gap-2 rounded-xl border-accent/40 bg-accent/10 hover:bg-accent/20 text-accent font-bold text-xs shrink-0 cursor-pointer py-2.5 sm:py-2",
            isPlayingTestVoice && "animate-pulse ring-2 ring-accent bg-accent/20"
          )}
        >
          {isPlayingTestVoice ? (
            <>
              <VolumeX className="size-3.5 text-destructive" aria-hidden="true" />
              <span>Parar demonstração</span>
            </>
          ) : (
            <>
              <Volume2 className="size-3.5" aria-hidden="true" />
              <span>Ouvir demonstração ({selectedSpeed}x)</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
