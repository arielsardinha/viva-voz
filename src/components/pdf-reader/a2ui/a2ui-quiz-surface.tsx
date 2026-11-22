"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookmarkPlus,
  Check,
  Flame,
  Lightbulb,
  Loader2,
  Mic,
  Quote,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { computeA2uiQuizSummary } from "@/lib/a2ui/a2ui-quiz.service";
import type {
  A2UIQuizDataModel,
  A2UIQuizQuestion,
  A2UIUserAction,
  QuizCoverageInfo,
  QuizGenerationSource,
  QuizGenerationStatus,
} from "@/lib/a2ui/a2ui-quiz.types";
import { InlineVoiceReply } from "../ui/inline-voice-reply";
import { A2UIQuizStepTrack } from "./a2ui-quiz-step-track";
import { A2UIQuizSummary } from "./a2ui-quiz-summary";

interface A2UIQuizSurfaceProps {
  questions: readonly A2UIQuizQuestion[];
  dataModel: A2UIQuizDataModel;
  coverage: QuizCoverageInfo;
  source: QuizGenerationSource;
  generationStatus: QuizGenerationStatus;
  generationNotice: string | null;
  plannedQuestionCount: number;
  canUseAi: boolean;
  onUserAction: (action: A2UIUserAction) => void;
  onHighlightEvidence: (sentenceIndex: number) => void;
  onSaveCardToNotes: (question: A2UIQuizQuestion) => void;
  onRegenerate: () => void;
  onCancelGeneration: () => void;
}

const SOURCE_LABELS: Record<QuizGenerationSource, string> = {
  "ai-cloud": "IA Nuvem",
  "ai-local": "IA Local",
  "ai-nano": "IA Local",
  "local-smart": "Modo rápido",
};

function formatCoverageText(coverage: QuizCoverageInfo): string {
  if (coverage.wasBudgetLimited) {
    return `Cobertura distribuída (~${coverage.coveragePercent}% · economia de tokens)`;
  }
  return "100% do conteúdo";
}

/** Superfície declarativa A2UI para o Quiz interativo de 1 a 10 questões. */
export function A2UIQuizSurface({
  questions,
  dataModel,
  coverage,
  source,
  generationStatus,
  generationNotice,
  plannedQuestionCount,
  canUseAi,
  onUserAction,
  onHighlightEvidence,
  onSaveCardToNotes,
  onRegenerate,
  onCancelGeneration,
}: A2UIQuizSurfaceProps) {
  const [voiceInput, setVoiceInput] = useState("");
  const activeQuestion = questions[dataModel.currentQuestionIndex] ?? questions[0];

  const summary = useMemo(
    () => computeA2uiQuizSummary(dataModel, questions),
    [dataModel, questions],
  );

  const handleVoiceSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleaned = voiceInput.trim();
    if (!cleaned) return;
    onUserAction({ type: "voiceCommand", transcript: cleaned });
    setVoiceInput("");
  };

  if (generationStatus === "loading") {
    return (
      <div className="flex flex-1 min-h-0 flex-col justify-center gap-4 px-3 sm:px-4 py-6 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
        <div
          role="status"
          aria-live="polite"
          data-cy="a2ui-quiz-loading"
          className="rounded-2xl border border-accent/30 bg-accent/10 p-4 sm:p-5 text-center space-y-3"
        >
          <Loader2
            className="size-6 animate-spin text-accent mx-auto"
            aria-hidden="true"
          />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Preparando {plannedQuestionCount}{" "}
              {plannedQuestionCount === 1 ? "pergunta" : "perguntas"} sobre o conteúdo…
            </p>
            <p className="text-xs text-muted-foreground">
              {coverage.wasBudgetLimited
                ? "Aplicando cobertura distribuída com economia de tokens."
                : "Analisando todo o documento lido."}
            </p>
          </div>
          <button
            type="button"
            data-cy="a2ui-cancel-generation-btn"
            onClick={onCancelGeneration}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary cursor-pointer"
          >
            Usar modo rápido
          </button>
        </div>
      </div>
    );
  }

  if (!activeQuestion) return null;

  const answer = dataModel.answers[activeQuestion.id];
  const isHintOpen = dataModel.activeHintQuestionId === activeQuestion.id;
  const nextNumber = ((dataModel.currentQuestionIndex + 1) % questions.length) + 1;
  const isSingleQuestion = questions.length <= 1;

  return (
    <div className="flex flex-1 min-h-0 flex-col justify-between gap-3 overflow-y-auto px-3 sm:px-4 py-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
      <div className="space-y-2.5">
        <div
          data-cy="a2ui-surface-header"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-secondary/70 px-3 py-2 text-[11px]"
        >
          <span className="inline-flex items-center gap-1.5 font-bold text-accent">
            <Zap className="size-3.5 shrink-0" aria-hidden="true" />
            <span>A2UI Surface · Catálogo nativo</span>
          </span>
          <div className="flex flex-wrap items-center gap-2 font-semibold tabular-nums">
            <span className="inline-flex items-center gap-1 text-voice-ink">
              <Flame className="size-3 text-voice" aria-hidden="true" />
              Sequência: {dataModel.streak}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              {dataModel.totalXp} XP
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-foreground">
              {dataModel.currentQuestionIndex + 1} de {questions.length}
            </span>
          </div>
        </div>

        {/* Barra de origem e cobertura de tokens */}
        <div
          data-cy="a2ui-coverage-badge"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-secondary/40 px-2.5 py-1.5 text-[11px]"
        >
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <span className="rounded-full bg-accent/15 px-2 py-0.5 font-bold text-accent shrink-0">
              {SOURCE_LABELS[source]}
            </span>
            <span className="text-muted-foreground truncate">
              {formatCoverageText(coverage)}
            </span>
          </div>
          <button
            type="button"
            data-cy="a2ui-regenerate-btn"
            aria-label="Gerar novas perguntas"
            onClick={onRegenerate}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] font-semibold text-foreground hover:bg-secondary cursor-pointer shrink-0"
          >
            <RefreshCw className="size-3" aria-hidden="true" />
            <span>Novas perguntas</span>
          </button>
        </div>

        {generationStatus === "fallback" && generationNotice && (
          <div
            role="status"
            data-cy="a2ui-fallback-notice"
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-voice/40 bg-voice-soft px-3 py-2 text-xs text-voice-ink"
          >
            <span>{generationNotice}</span>
            {canUseAi && (
              <button
                type="button"
                onClick={onRegenerate}
                className="rounded-full bg-card px-2.5 py-0.5 text-[11px] font-semibold text-foreground border border-border hover:bg-secondary cursor-pointer"
              >
                Tentar com IA
              </button>
            )}
          </div>
        )}

        <A2UIQuizStepTrack
          questions={questions}
          answers={dataModel.answers}
          currentQuestionIndex={dataModel.currentQuestionIndex}
          onSelectQuestion={(idx) =>
            onUserAction({ type: "selectQuestion", questionIndex: idx })
          }
        />

        <section
          data-cy="a2ui-quiz-card"
          data-webmcp-tool="a2uiQuizSurface"
          data-webmcp-action="answerQuizQuestion"
          aria-label={`Questão ${activeQuestion.index + 1} do Quiz A2UI`}
          className="rounded-2xl border border-accent/30 bg-secondary/40 p-3 sm:p-4 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-0.5 text-[11px] font-semibold text-accent">
              <Sparkles className="size-3" aria-hidden="true" />
              <span>
                {activeQuestion.topic} · ¶{activeQuestion.paragraphRef}
              </span>
            </span>
            <InlineVoiceReply
              text={activeQuestion.prompt}
              label="Ouvir pergunta"
              dataCy="a2ui-listen-question"
            />
          </div>

          <p className="text-sm font-semibold text-foreground leading-snug">
            {activeQuestion.prompt}
          </p>

          <div className="space-y-1.5" role="radiogroup" aria-label="Alternativas do Quiz">
            {activeQuestion.options.map((opt) => {
              const isSelected = answer?.selectedOptionId === opt.id;
              const isCorrectChosen = isSelected && opt.isCorrect;
              const isWrongChosen = isSelected && !opt.isCorrect;
              const isRevealCorrect = Boolean(answer && !answer.isCorrect && opt.isCorrect);
              const xpAmount =
                dataModel.difficulty === "hard" ? 90 : activeQuestion.xpReward;

              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  data-cy={`a2ui-choice-${opt.id}`}
                  onClick={() =>
                    onUserAction({
                      type: "selectOption",
                      questionId: activeQuestion.id,
                      optionId: opt.id,
                    })
                  }
                  className={cn(
                    "w-full flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-colors cursor-pointer",
                    isCorrectChosen
                      ? "border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 font-semibold"
                      : isWrongChosen
                        ? "border-destructive bg-destructive/10 text-destructive font-medium"
                        : isRevealCorrect
                          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 font-medium"
                          : "border-border bg-card text-foreground hover:border-accent/50",
                  )}
                >
                  <span className="min-w-0 flex items-start gap-2">
                    <span className="font-bold shrink-0">{opt.id})</span>
                    <span className="break-words">{opt.label}</span>
                  </span>
                  {isCorrectChosen && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                      <Check className="size-3" aria-hidden="true" />
                      +{xpAmount} XP
                    </span>
                  )}
                  {isRevealCorrect && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                      Correta
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {isHintOpen && !answer && (
            <div className="rounded-xl border border-voice/40 bg-voice-soft px-3 py-2 text-xs text-voice-ink">
              <strong>Dica:</strong> {activeQuestion.hint}
            </div>
          )}

          {answer && (
            <div
              data-cy="a2ui-explanation-card"
              className="rounded-xl border border-accent/30 bg-accent/10 p-2.5 space-y-2"
            >
              <p className="text-xs leading-relaxed text-foreground">
                {activeQuestion.explanation}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <InlineVoiceReply
                  text={activeQuestion.explanation}
                  label="Ouvir"
                  dataCy="a2ui-listen-explanation"
                />
                <button
                  type="button"
                  data-cy="a2ui-highlight-evidence"
                  onClick={() => {
                    onUserAction({
                      type: "highlightEvidence",
                      sentenceIndex: activeQuestion.sentenceIndex,
                    });
                    onHighlightEvidence(activeQuestion.sentenceIndex);
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground cursor-pointer hover:opacity-90"
                >
                  <Quote className="size-3" aria-hidden="true" />
                  <span>Destacar ¶{activeQuestion.paragraphRef} no texto</span>
                </button>
                <button
                  type="button"
                  data-cy="a2ui-save-card"
                  onClick={() => {
                    onUserAction({
                      type: "saveCardToNotes",
                      questionId: activeQuestion.id,
                    });
                    onSaveCardToNotes(activeQuestion);
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-secondary cursor-pointer"
                >
                  <BookmarkPlus className="size-3 text-accent" aria-hidden="true" />
                  <span>{answer.savedToNotes ? "Salvo nas notas" : "Salvar card"}</span>
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                data-cy="a2ui-hint-btn"
                onClick={() =>
                  onUserAction({ type: "requestHint", questionId: activeQuestion.id })
                }
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-secondary cursor-pointer"
              >
                <Lightbulb className="size-3 text-voice" aria-hidden="true" />
                <span>Dica</span>
              </button>
              <button
                type="button"
                onClick={() => onUserAction({ type: "resetQuiz" })}
                aria-label="Reiniciar quiz"
                className="inline-flex items-center justify-center rounded-full border border-border bg-card size-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <RotateCcw className="size-3" aria-hidden="true" />
              </button>
            </div>

            <button
              type="button"
              data-cy="a2ui-next-btn"
              disabled={isSingleQuestion}
              onClick={() => onUserAction({ type: "nextQuestion" })}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-xs font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              <span>
                {isSingleQuestion
                  ? "Questão única (1/1)"
                  : `Próxima (${nextNumber}/${questions.length})`}
              </span>
              {!isSingleQuestion && <ArrowRight className="size-3.5" aria-hidden="true" />}
            </button>
          </div>
        </section>

        <A2UIQuizSummary
          summary={summary}
          canUseAi={canUseAi}
          onReset={() => onUserAction({ type: "resetQuiz" })}
          onRegenerate={onRegenerate}
        />
      </div>

      <form
        data-cy="a2ui-voice-command-form"
        data-webmcp-tool="a2uiQuizCommand"
        data-webmcp-action="executeQuizCommand"
        onSubmit={handleVoiceSubmit}
        className="flex items-center gap-2 rounded-2xl border border-accent/40 bg-accent/5 px-2.5 py-1.5"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Mic className="size-4" aria-hidden="true" />
        </span>
        <input
          id="a2ui-voice-command-input"
          name="quizVoiceCommand"
          type="text"
          value={voiceInput}
          onChange={(e) => setVoiceInput(e.target.value)}
          data-cy="a2ui-voice-command-input"
          aria-label="Comando para o Quiz A2UI"
          placeholder="Diga “letra B”, “dica”, “certeza” ou “próxima”…"
          className="min-w-0 flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <button
          type="submit"
          disabled={!voiceInput.trim()}
          aria-label="Aplicar comando A2UI"
          className="rounded-full bg-accent px-3 py-1 text-[11px] font-semibold text-accent-foreground disabled:opacity-40 cursor-pointer"
        >
          Aplicar
        </button>
      </form>
    </div>
  );
}
