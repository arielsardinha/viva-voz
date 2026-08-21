"use client";

import { CheckCircle2 } from "lucide-react";
import { READING_FONTS, type ReaderTemplateId, type ReadingFont, type ReadingTheme } from "@/context/reader-settings-context";
import { TEMPLATE_CHOICES, THEME_CHOICES } from "./tutorial-constants";

interface StepSummaryProps {
  selectedTemplate: ReaderTemplateId;
  selectedTheme: ReadingTheme;
  selectedFont: ReadingFont;
  selectedFontSize: number;
  selectedSpeed: number;
}

export function StepSummary({
  selectedTemplate,
  selectedTheme,
  selectedFont,
  selectedFontSize,
  selectedSpeed,
}: StepSummaryProps) {
  return (
    <div className="space-y-6 text-center py-2">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500 ring-4 ring-emerald-500/10">
        <CheckCircle2 className="size-7" aria-hidden="true" />
      </div>

      <div className="space-y-1 max-w-md mx-auto">
        <h3 className="text-lg sm:text-xl font-extrabold text-foreground">
          Configurações salvas com sucesso!
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Aqui está o resumo da sua experiência personalizada no VivaVoz:
        </p>
      </div>

      {/* Resumo das escolhas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 max-w-xl mx-auto text-left">
        <div className="p-2.5 sm:p-3 rounded-2xl bg-secondary/50 border border-border/60">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            Modo
          </span>
          <span className="text-xs font-bold text-foreground truncate block">
            {TEMPLATE_CHOICES.find((t) => t.id === selectedTemplate)?.title}
          </span>
        </div>

        <div className="p-2.5 sm:p-3 rounded-2xl bg-secondary/50 border border-border/60">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            Tema
          </span>
          <span className="text-xs font-bold text-foreground truncate block">
            {THEME_CHOICES.find((th) => th.id === selectedTheme)?.title}
          </span>
        </div>

        <div className="p-2.5 sm:p-3 rounded-2xl bg-secondary/50 border border-border/60">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            Fonte
          </span>
          <span className="text-xs font-bold text-foreground truncate block">
            {READING_FONTS.find((f) => f.id === selectedFont)?.name} ({selectedFontSize}px)
          </span>
        </div>

        <div className="p-2.5 sm:p-3 rounded-2xl bg-secondary/50 border border-border/60">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            Velocidade
          </span>
          <span className="text-xs font-bold text-foreground">{selectedSpeed}x</span>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
        Você pode alterar qualquer uma dessas opções a qualquer momento no topo do leitor ou reabrir este tutorial.
      </p>
    </div>
  );
}
