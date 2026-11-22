"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Sentence } from "@/lib/pdf-text";
import type { AIEngineType, SendPromptOptions } from "@/hooks/useFirebaseAI";
import { isAppleMobileWebKit } from "@/lib/local-ai/domain/device";
import {
  applyA2uiUserAction,
  buildA2uiQuizSurface,
  buildA2uiSurfaceFromQuestions,
} from "@/lib/a2ui/a2ui-quiz.service";
import type {
  A2UIQuizQuestion,
  A2UIQuizSurfacePayload,
  A2UIUserAction,
  QuizCoverageInfo,
  QuizEngineKind,
  QuizGenerationStatus,
} from "@/lib/a2ui/a2ui-quiz.types";
import {
  buildCompactQuizSystemPrompt,
  buildCompactQuizUserPrompt,
  parseAndNormalizeAiQuizQuestions,
} from "@/lib/a2ui/quiz-ai-parser";
import {
  buildDocumentFingerprint,
  getQuizBudgetConfig,
  planQuizContent,
} from "@/lib/a2ui/quiz-content-planner";

export interface UseA2uiQuizOptions {
  sentences: readonly Sentence[];
  currentIndex: number;
  title: string | null;
  activeEngine: AIEngineType;
  apiKey: string | null;
  sendMessage: (
    prompt: string,
    options?: SendPromptOptions,
  ) => AsyncIterable<string>;
}

export interface UseA2uiQuizReturn {
  surface: A2UIQuizSurfacePayload;
  generationStatus: QuizGenerationStatus;
  generationNotice: string | null;
  plannedQuestionCount: number;
  plannedCoverage: QuizCoverageInfo;
  canUseAi: boolean;
  ensureQuizReady: () => Promise<void>;
  regenerateQuiz: () => Promise<void>;
  cancelGeneration: () => void;
  dispatchAction: (action: A2UIUserAction) => void;
}

function isMaskedKey(value: string | null): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  return trimmed === "connected" || trimmed.includes("...");
}

function isLiteDeviceProfile(): boolean {
  if (typeof navigator === "undefined") return false;
  if (isAppleMobileWebKit(navigator)) return true;
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return typeof deviceMemory === "number" && deviceMemory <= 4;
}

function resolveQuizEngineKind(activeEngine: AIEngineType): QuizEngineKind {
  switch (activeEngine) {
    case "vertex":
      return "cloud";
    case "gemini-nano":
      return "gemini-nano";
    case "litert-lm":
      return isLiteDeviceProfile() ? "litert-lm-lite" : "litert-lm-full";
    default:
      return "offline";
  }
}

/**
 * Questões por chamada nos motores on-device. Cada questão em JSON custa ~150-200
 * tokens; o Gemma local tem teto de 1024 (full) / 512 (lite) tokens de saída, então
 * pedir 8 de uma vez cortava o JSON no meio e derrubava o quiz no modo rápido.
 */
const ON_DEVICE_BATCH_SIZE: Partial<Record<QuizEngineKind, number>> = {
  "litert-lm-full": 3,
  "litert-lm-lite": 2,
  "gemini-nano": 3,
};

export interface OnDeviceQuizBatch {
  questionCount: number;
  context: string;
}

/** Divide o recorte planejado em lotes contíguos, um pedido de poucas questões cada. */
export function planOnDeviceQuizBatches(
  selected: readonly Sentence[],
  targetQuestionCount: number,
  engineKind: QuizEngineKind,
): OnDeviceQuizBatch[] {
  if (selected.length === 0 || targetQuestionCount <= 0) return [];
  const batchSize = ON_DEVICE_BATCH_SIZE[engineKind] ?? targetQuestionCount;
  const batchCount = Math.min(
    selected.length,
    Math.max(1, Math.ceil(targetQuestionCount / batchSize)),
  );
  const maxChars = getQuizBudgetConfig(engineKind).maxContextChars;
  const batches: OnDeviceQuizBatch[] = [];
  let remainingQuestions = targetQuestionCount;

  for (let b = 0; b < batchCount; b += 1) {
    const start = Math.floor((b * selected.length) / batchCount);
    const end = Math.floor(((b + 1) * selected.length) / batchCount);
    const questionCount = Math.ceil(remainingQuestions / (batchCount - b));
    remainingQuestions -= questionCount;
    const context = selected
      .slice(start, Math.max(start + 1, end))
      .map(
        (s) => `[¶${s.index + 1} p.${s.page}] ${s.text.replace(/\s+/g, " ").trim()}`,
      )
      .join("\n")
      .slice(0, maxChars);
    batches.push({ questionCount, context });
  }
  return batches;
}

async function fetchCloudQuiz(params: {
  sentences: readonly Sentence[];
  title: string | null;
  difficulty: "normal" | "hard";
  apiKey: string | null;
  signal: AbortSignal;
}): Promise<{ questions: A2UIQuizQuestion[]; coverage: QuizCoverageInfo }> {
  const payload: Record<string, unknown> = {
    title: params.title,
    sentences: params.sentences,
    difficulty: params.difficulty,
  };
  if (params.apiKey && !isMaskedKey(params.apiKey)) {
    payload.userApiKey = params.apiKey;
  }

  const response = await fetch("/api/quiz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: params.signal,
  });

  if (!response.ok) {
    throw new Error(`Quiz BFF status ${response.status}`);
  }
  return (await response.json()) as {
    questions: A2UIQuizQuestion[];
    coverage: QuizCoverageInfo;
  };
}

/** Gerencia geração sob demanda, cache sem desperdício de tokens e ações A2UI do Quiz. */
export function useA2uiQuiz({
  sentences,
  currentIndex,
  title,
  activeEngine,
  apiKey,
  sendMessage,
}: UseA2uiQuizOptions): UseA2uiQuizReturn {
  const engineKind = useMemo(
    () => resolveQuizEngineKind(activeEngine),
    [activeEngine],
  );
  const fingerprint = useMemo(
    () => buildDocumentFingerprint(sentences, title),
    [sentences, title],
  );
  const planned = useMemo(
    () => planQuizContent(sentences, engineKind),
    [sentences, engineKind],
  );

  const [surface, setSurface] = useState<A2UIQuizSurfacePayload>(() =>
    buildA2uiQuizSurface(sentences, currentIndex, title, { engine: engineKind }),
  );
  const [generationStatus, setGenerationStatus] =
    useState<QuizGenerationStatus>("idle");
  const [generationNotice, setGenerationNotice] = useState<string | null>(null);

  const cacheRef = useRef<Map<string, A2UIQuizSurfacePayload>>(new Map());
  const activeCacheKeyRef = useRef<string | null>(null);
  const prevFingerprintRef = useRef<string>(fingerprint);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (prevFingerprintRef.current === fingerprint) return;
    prevFingerprintRef.current = fingerprint;
    abortRef.current?.abort();
    abortRef.current = null;
    activeCacheKeyRef.current = null;
    setGenerationNotice(null);
    setGenerationStatus("idle");
    setSurface(
      buildA2uiQuizSurface(sentences, currentIndex, title, { engine: engineKind }),
    );
  }, [fingerprint, sentences, currentIndex, title, engineKind]);

  const generateWithAi = useCallback(
    async (difficulty: "normal" | "hard", forceRefresh: boolean) => {
      if (sentences.length === 0) {
        setGenerationStatus("ready");
        return;
      }

      if (activeEngine === "disconnected") {
        if (
          forceRefresh ||
          surface.surfaceUpdate.questions.length === 0 ||
          surface.dataModelUpdate.difficulty !== difficulty
        ) {
          setSurface(
            buildA2uiQuizSurface(sentences, currentIndex, title, {
              difficulty,
              engine: engineKind,
            }),
          );
        }
        setGenerationNotice(null);
        setGenerationStatus("ready");
        return;
      }

      const cacheKey = `${fingerprint}::${difficulty}::${activeEngine}`;
      if (!forceRefresh) {
        if (
          activeCacheKeyRef.current === cacheKey &&
          generationStatus === "ready"
        ) {
          return;
        }
        const cached = cacheRef.current.get(cacheKey);
        if (cached) {
          activeCacheKeyRef.current = cacheKey;
          setSurface(cached);
          setGenerationNotice(null);
          setGenerationStatus("ready");
          return;
        }
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setGenerationStatus("loading");
      setGenerationNotice(null);

      try {
        let nextSurface: A2UIQuizSurfacePayload;

        if (activeEngine === "vertex") {
          const data = await fetchCloudQuiz({
            sentences,
            title,
            difficulty,
            apiKey,
            signal: controller.signal,
          });
          if (controller.signal.aborted || !mountedRef.current) return;
          nextSurface = buildA2uiSurfaceFromQuestions({
            questions: data.questions,
            title,
            coverage: data.coverage,
            source: "ai-cloud",
            difficulty,
          });
        } else {
          const localPlan = planQuizContent(sentences, engineKind);
          const batches = planOnDeviceQuizBatches(
            localPlan.selectedSentences,
            localPlan.targetQuestionCount,
            engineKind,
          );
          const documentTitle = title?.trim() || "Leitura atual";
          const systemPrompt = buildCompactQuizSystemPrompt(difficulty);
          const collected: A2UIQuizQuestion[] = [];
          let lastBatchError: unknown = null;

          const runBatch = async (batch: OnDeviceQuizBatch, label: string) => {
            let rawOutput = "";
            try {
              for await (const chunk of sendMessage(
                buildCompactQuizUserPrompt({
                  title: documentTitle,
                  questionCount: batch.questionCount,
                }),
                { context: batch.context, fileName: title, systemPrompt },
              )) {
                if (controller.signal.aborted) return true;
                rawOutput += chunk;
              }
              if (controller.signal.aborted || !mountedRef.current) return true;
              collected.push(
                ...parseAndNormalizeAiQuizQuestions(rawOutput, sentences, {
                  maxQuestions: batch.questionCount,
                  difficulty,
                }),
              );
              return true;
            } catch (batchErr) {
              if (
                controller.signal.aborted ||
                (batchErr as Error)?.name === "AbortError"
              ) {
                throw batchErr;
              }
              // Um lote ruim não derruba o quiz: seguimos com os demais.
              lastBatchError = batchErr;
              console.warn(
                `[VivaVoz Quiz] Lote ${label} falhou (${engineKind}).`,
                batchErr,
                { rawOutput: rawOutput.slice(0, 4000), rawLength: rawOutput.length },
              );
              return false;
            }
          };

          const failedBatches: OnDeviceQuizBatch[] = [];
          for (const [batchIdx, batch] of batches.entries()) {
            const ok = await runBatch(batch, `${batchIdx + 1}/${batches.length}`);
            if (controller.signal.aborted || !mountedRef.current) return;
            if (!ok) failedBatches.push(batch);
          }
          // Modelos pequenos erram o formato de vez em quando: uma segunda chance por lote.
          for (const [retryIdx, batch] of failedBatches.entries()) {
            if (collected.length >= localPlan.targetQuestionCount) break;
            await runBatch(batch, `retry ${retryIdx + 1}/${failedBatches.length}`);
            if (controller.signal.aborted || !mountedRef.current) return;
          }

          if (collected.length === 0) {
            throw lastBatchError ?? new Error("Nenhuma questão válida retornada pela IA.");
          }
          // Completa a meta com questões do modo rápido em parágrafos ainda não cobertos.
          if (collected.length < localPlan.targetQuestionCount) {
            const usedSentences = new Set(collected.map((q) => q.sentenceIndex));
            const offline = buildA2uiQuizSurface(sentences, currentIndex, title, {
              difficulty,
              engine: engineKind,
            }).surfaceUpdate.questions.filter((q) => !usedSentences.has(q.sentenceIndex));
            collected.push(
              ...offline.slice(0, localPlan.targetQuestionCount - collected.length),
            );
            collected.sort((a, b) => a.sentenceIndex - b.sentenceIndex);
          }
          const questions = collected.map((q, idx) => ({
            ...q,
            id: `q-${idx + 1}`,
            index: idx,
          }));
          nextSurface = buildA2uiSurfaceFromQuestions({
            questions,
            title,
            coverage: localPlan.coverage,
            source: activeEngine === "litert-lm" ? "ai-local" : "ai-nano",
            difficulty,
          });
        }

        cacheRef.current.set(cacheKey, nextSurface);
        activeCacheKeyRef.current = cacheKey;
        setSurface(nextSurface);
        setGenerationStatus("ready");
      } catch (err) {
        if (
          controller.signal.aborted ||
          (err as Error)?.name === "AbortError" ||
          !mountedRef.current
        ) {
          return;
        }
        console.warn(
          `[VivaVoz Quiz] Geração com IA falhou (${activeEngine}); usando modo rápido.`,
          err,
        );
        setSurface(
          buildA2uiQuizSurface(sentences, currentIndex, title, {
            difficulty,
            engine: engineKind,
          }),
        );
        setGenerationStatus("fallback");
        setGenerationNotice(
          "Não foi possível gerar com a IA agora. Montamos um quiz rápido sobre o conteúdo.",
        );
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    },
    [
      sentences,
      activeEngine,
      surface.surfaceUpdate.questions.length,
      surface.dataModelUpdate.difficulty,
      currentIndex,
      title,
      fingerprint,
      generationStatus,
      apiKey,
      engineKind,
      sendMessage,
    ],
  );

  const ensureQuizReady = useCallback(async () => {
    await generateWithAi(surface.dataModelUpdate.difficulty, false);
  }, [generateWithAi, surface.dataModelUpdate.difficulty]);

  const regenerateQuiz = useCallback(async () => {
    await generateWithAi(surface.dataModelUpdate.difficulty, true);
  }, [generateWithAi, surface.dataModelUpdate.difficulty]);

  const cancelGeneration = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setSurface(
      buildA2uiQuizSurface(sentences, currentIndex, title, {
        difficulty: surface.dataModelUpdate.difficulty,
        engine: engineKind,
      }),
    );
    setGenerationNotice(null);
    setGenerationStatus("ready");
  }, [sentences, currentIndex, title, surface.dataModelUpdate.difficulty, engineKind]);

  const dispatchAction = useCallback((action: A2UIUserAction) => {
    setSurface((prev) => ({
      ...prev,
      dataModelUpdate: applyA2uiUserAction(
        prev.dataModelUpdate,
        prev.surfaceUpdate.questions,
        action,
      ),
    }));
  }, []);

  return {
    surface,
    generationStatus,
    generationNotice,
    plannedQuestionCount: planned.targetQuestionCount,
    plannedCoverage: planned.coverage,
    canUseAi: activeEngine !== "disconnected",
    ensureQuizReady,
    regenerateQuiz,
    cancelGeneration,
    dispatchAction,
  };
}
