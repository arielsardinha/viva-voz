"use client";

import { Check } from "lucide-react";
import { DialogDescription } from "@/components/ui/dialog";
import { READING_FONTS, type ReadingFont } from "@/context/reader-settings-context";
import { FONT_SIZE_PRESETS } from "./tutorial-constants";
import { cn } from "@/lib/utils";

interface StepFontProps {
  selectedFont: ReadingFont;
  onSelectFont: (font: ReadingFont) => void;
  selectedFontSize: number;
  onSelectFontSize: (size: number) => void;
}

export function StepFont({
  selectedFont,
  onSelectFont,
  selectedFontSize,
  onSelectFontSize,
}: StepFontProps) {
  return (
    <div className="space-y-4 sm:space-y-5">
      <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
        Selecione a fonte ideal e o tamanho do texto para uma leitura sem cansaço visual.
      </DialogDescription>

      {/* Escolha da Família da Fonte */}
      <div className="space-y-1.5 sm:space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Família da Fonte Google
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-2.5">
          {READING_FONTS.map((font) => {
            const isSelected = selectedFont === font.id;
            return (
              <div
                key={font.id}
                data-cy={`font-option-${font.id}`}
                data-testid={`font-option-${font.id}`}
                onClick={() => onSelectFont(font.id)}
                className={cn(
                  "p-2.5 sm:p-3 rounded-2xl border-2 cursor-pointer transition-all duration-200",
                  isSelected
                    ? "border-accent bg-accent/5 ring-1 ring-accent"
                    : "border-border/70 bg-card/60 hover:bg-secondary/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn("text-sm sm:text-base font-bold text-foreground", font.fontClass)}
                  >
                    {font.name}
                  </span>
                  {isSelected && <Check className="size-3.5 text-accent stroke-[3]" aria-hidden="true" />}
                </div>
                <span className="text-[10px] text-accent font-semibold">
                  {font.category}
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5 sm:mt-1 leading-tight line-clamp-2">
                  {font.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Escolha do Tamanho do Texto */}
      <div className="space-y-1.5 sm:space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Tamanho do Texto
          </label>
          <span className="text-xs font-bold text-accent">{selectedFontSize}px</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
          {FONT_SIZE_PRESETS.map((preset) => (
            <button
              key={preset.size}
              type="button"
              onClick={() => onSelectFontSize(preset.size)}
              className={cn(
                "py-2 px-2.5 sm:px-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-between cursor-pointer",
                selectedFontSize === preset.size
                  ? "border-accent bg-accent/10 text-accent ring-1 ring-accent"
                  : "border-border bg-card/60 text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              )}
            >
              <span>{preset.label}</span>
              <span className="text-[10px] sm:text-[11px] opacity-70">{preset.size}px</span>
            </button>
          ))}
        </div>
      </div>

      {/* Caixa de Exemplo ao Vivo */}
      <div className="p-3 sm:p-4 rounded-2xl bg-secondary/50 border border-border/80 space-y-1 sm:space-y-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Prévia em Tempo Real
        </span>
        <p
          className={cn(
            "text-foreground leading-relaxed transition-all",
            READING_FONTS.find((f) => f.id === selectedFont)?.fontClass
          )}
          style={{ fontSize: `${selectedFontSize}px` }}
        >
          “A leitura engrandece a alma e a narração em áudio dá vida e ritmo a cada palavra escrita.”
        </p>
      </div>
    </div>
  );
}
