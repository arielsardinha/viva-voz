"use client";

import { ArrowRight, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface A2UISuggestCardProps {
  onStartQuiz: () => void;
  disabled?: boolean;
  questionCount?: number;
  wasBudgetLimited?: boolean;
  className?: string;
}

/** Mini-card declarativo A2UI sugerido pelo assistente para iniciar o Quiz interativo. */
export function A2UISuggestCard({
  onStartQuiz,
  disabled = false,
  questionCount = 3,
  wasBudgetLimited = false,
  className,
}: A2UISuggestCardProps) {
  const safeCount = Math.max(1, Math.min(10, questionCount));
  const estimatedMinutes = Math.max(1, Math.ceil(safeCount * 0.4));
  const countLabel = `${safeCount} ${safeCount === 1 ? "questão" : "questões"} · ~${estimatedMinutes} min`;

  return (
    <div
      data-cy="a2ui-suggest-card"
      className={cn(
        "rounded-2xl border border-accent/30 bg-accent/5 p-3 space-y-2 transition-colors",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-0.5 text-[11px] font-bold text-accent">
          <Zap className="size-3" aria-hidden="true" />
          <span>A2UI · Widget nativo</span>
        </span>
        <span
          data-cy="a2ui-suggest-count"
          className="text-[11px] font-medium text-muted-foreground"
        >
          {countLabel}
        </span>
      </div>

      <p className="text-xs sm:text-sm font-semibold text-foreground leading-snug">
        Quer testar o que absorveu de todo o conteúdo?
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
        <span className="text-[11px] text-muted-foreground">
          {wasBudgetLimited
            ? "Amostragem inteligente · economia de tokens"
            : "Todo o conteúdo · áudio + citação"}
        </span>
        <button
          type="button"
          onClick={onStartQuiz}
          disabled={disabled}
          data-cy="a2ui-open-quiz-btn"
          data-webmcp-action="openA2uiQuiz"
          className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-xs font-semibold text-accent-foreground shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
        >
          <span>Gerar Quiz interativo</span>
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
