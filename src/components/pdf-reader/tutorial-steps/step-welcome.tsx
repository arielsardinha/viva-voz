"use client";

import { AudioLines, Compass, Sparkles, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StepWelcomeProps {
  onStart: () => void;
}

export function StepWelcome({ onStart }: StepWelcomeProps) {
  return (
    <div className="space-y-3 sm:space-y-6 text-center py-0.5 sm:py-2">
      <div className="mx-auto flex size-11 sm:size-20 items-center justify-center rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-accent/20 via-accent/10 to-indigo-500/20 text-accent ring-1 ring-accent/30 shadow-inner">
        <AudioLines className="size-5 sm:size-10" aria-hidden="true" />
      </div>

      <div className="space-y-1 sm:space-y-2 max-w-lg mx-auto">
        <h3 className="text-base sm:text-2xl font-extrabold tracking-tight text-foreground">
          Transforme qualquer PDF em áudio inteligente
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Você pode configurar rapidamente seu estilo de leitor, temas visuais e velocidade de narração, ou começar direto com os padrões recomendados.
        </p>
      </div>

      {/* Grid com destaques do app */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-left max-w-xl mx-auto pt-0.5 sm:pt-2">
        <div className="p-2.5 sm:p-3.5 rounded-2xl bg-secondary/40 border border-border/60 space-y-0.5 sm:space-y-1">
          <div className="flex items-center gap-2 text-accent font-semibold text-xs">
            <Compass className="size-3.5" aria-hidden="true" />
            <span>3 Modos de Leitura</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Estúdio Clean, Assistente com IA Gemini ou Modo Zen imersivo.
          </p>
        </div>

        <div className="p-2.5 sm:p-3.5 rounded-2xl bg-secondary/40 border border-border/60 space-y-0.5 sm:space-y-1">
          <div className="flex items-center gap-2 text-amber-500 font-semibold text-xs">
            <Sparkles className="size-3.5" aria-hidden="true" />
            <span>Temas Confortáveis</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Clean, Papel Zen com tons quentes ou Modo Escuro suave.
          </p>
        </div>

        <div className="p-2.5 sm:p-3.5 rounded-2xl bg-secondary/40 border border-border/60 space-y-0.5 sm:space-y-1">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs">
            <Volume2 className="size-3.5" aria-hidden="true" />
            <span>Áudio Sincronizado</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Acompanhamento do texto em tempo real com narração fluida.
          </p>
        </div>
      </div>

      {/* Botões de Ação Inicial */}
      <div className="flex items-center justify-center pt-2 sm:pt-4 pb-1 sm:pb-3 max-w-sm mx-auto">
        <Button
          type="button"
          data-cy="start-journey-btn"
          data-testid="start-journey-btn"
          onClick={onStart}
          className="w-full gap-2 rounded-2xl bg-accent text-accent-foreground hover:bg-accent/90 py-3.5 sm:py-5 text-xs sm:text-sm font-bold shadow-lg shadow-accent/25 transition-all hover:scale-[1.02] cursor-pointer"
        >
          <Sparkles className="size-4" aria-hidden="true" />
          <span>Fazer a Jornada (Personalizar)</span>
        </Button>
      </div>
    </div>
  );
}
