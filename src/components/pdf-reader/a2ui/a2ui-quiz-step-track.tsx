"use client";

import { cn } from "@/lib/utils";
import type {
  A2UIQuestionAnswer,
  A2UIQuizQuestion,
} from "@/lib/a2ui/a2ui-quiz.types";

interface A2UIQuizStepTrackProps {
  questions: readonly A2UIQuizQuestion[];
  answers: Record<string, A2UIQuestionAnswer>;
  currentQuestionIndex: number;
  onSelectQuestion: (questionIndex: number) => void;
}

function resolveGridClass(count: number): string {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-2";
  if (count === 3) return "grid-cols-3";
  if (count === 4 || count === 7 || count === 8) return "grid-cols-4";
  return "grid-cols-5";
}

function getStatusLabel(
  answer: A2UIQuestionAnswer | undefined,
  isCurrent: boolean,
): { symbol: string; stateText: string } {
  if (answer?.isCorrect) return { symbol: "✓", stateText: "acertada" };
  if (answer && !answer.isCorrect) return { symbol: "✕", stateText: "respondida" };
  if (isCurrent) return { symbol: "●", stateText: "atual" };
  return { symbol: "○", stateText: "pendente" };
}

/** Trilha segmentada adaptativa de 1 a 10 questões sem overflow em mobile (370px+). */
export function A2UIQuizStepTrack({
  questions,
  answers,
  currentQuestionIndex,
  onSelectQuestion,
}: A2UIQuizStepTrackProps) {
  if (questions.length === 0) return null;

  const isCompact = questions.length >= 4;

  return (
    <div
      data-cy="a2ui-step-track"
      className={cn("grid gap-1.5", resolveGridClass(questions.length))}
    >
      {questions.map((q, idx) => {
        const qAns = answers[q.id];
        const isCurrent = idx === currentQuestionIndex;
        const { symbol, stateText } = getStatusLabel(qAns, isCurrent);

        return (
          <button
            key={q.id}
            type="button"
            data-cy={`a2ui-step-${idx + 1}`}
            title={q.topic}
            aria-current={isCurrent ? "step" : undefined}
            aria-label={`Questão ${idx + 1} de ${questions.length}, parágrafo ${q.paragraphRef} — ${stateText}`}
            onClick={() => onSelectQuestion(idx)}
            className={cn(
              "min-w-0 truncate rounded-lg border px-1.5 sm:px-2 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer",
              qAns?.isCorrect
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                : qAns && !qAns.isCorrect
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : isCurrent
                    ? "border-accent/50 bg-accent/12 text-accent"
                    : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground",
            )}
          >
            {isCompact
              ? `${symbol} Q${idx + 1}`
              : `${symbol} Q${idx + 1} · ¶${q.paragraphRef}`}
          </button>
        );
      })}
    </div>
  );
}
