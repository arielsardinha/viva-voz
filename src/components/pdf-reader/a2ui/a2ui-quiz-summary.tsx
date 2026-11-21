"use client";

import { Award, RotateCcw, Sparkles } from "lucide-react";
import type { QuizSummaryStats } from "@/lib/a2ui/a2ui-quiz.types";

interface A2UIQuizSummaryProps {
  summary: QuizSummaryStats;
  canUseAi: boolean;
  onReset: () => void;
  onRegenerate: () => void;
}

/** Card de resumo exibido após concluir todas as questões do Quiz. */
export function A2UIQuizSummary({
  summary,
  canUseAi,
  onReset,
  onRegenerate,
}: A2UIQuizSummaryProps) {
  if (!summary.isCompleted) return null;

  return (
    <section
      data-cy="a2ui-quiz-summary"
      aria-label="Resumo do Quiz"
      className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 p-3 sm:p-4 space-y-2.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
          <Award className="size-4 shrink-0" aria-hidden="true" />
          <span className="text-xs sm:text-sm font-bold">
            Quiz concluído · {summary.correctCount} de {summary.totalQuestions} acertos (
            {summary.accuracyPercent}%)
          </span>
        </div>
        <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-bold text-white tabular-nums">
          {summary.totalXp} XP
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span>Certeza: {summary.confidenceBreakdown.certain}</span>
        <span>·</span>
        <span>Com dúvida: {summary.confidenceBreakdown.unsure}</span>
        <span>·</span>
        <span>Chutei: {summary.confidenceBreakdown.guess}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary cursor-pointer"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          <span>Refazer quiz</span>
        </button>
        <button
          type="button"
          data-cy="a2ui-summary-regenerate-btn"
          onClick={onRegenerate}
          className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:opacity-90 cursor-pointer"
        >
          <Sparkles className="size-3.5" aria-hidden="true" />
          <span>{canUseAi ? "Novas perguntas com IA" : "Novas perguntas"}</span>
        </button>
      </div>
    </section>
  );
}
