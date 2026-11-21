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
  buildQuizSystemPrompt,
  parseAndNormalizeAiQuizQuestions,
} from "@/lib/a2ui/quiz-ai-parser";
import {
  buildDocumentFingerprint,
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

function buildOnDeviceQuizPrompt(params: {
  title: string;
  questionCount: number;
  difficulty: "normal" | "hard";
  wasBudgetLimited: boolean;
  coveragePercent: number;
}): string {
  const coverageInfo = params.wasBudgetLimited
    ? `Cobertura distribuída (~${params.coveragePercent}%) do início ao fim.`
    : "Cobertura integral do texto.";

  return [
    buildQuizSystemPrompt(params.difficulty),
    `Documento: "${params.title}"`,
    `Quantidade exata de questões: ${params.questionCount}`,
    coverageInfo,
    'Responda SOMENTE com JSON válido no formato {"questions":[{"topic":"","sentenceIndex":0,"prompt":"","evidenceQuote":"","explanation":"","hint":"","options":[{"id":"A","label":"","isCorrect":true}]}]}.',
  ].join("\n");
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
    buildA2uiQuizSurface(sentences, currentIndex, title),
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
    setSurface(buildA2uiQuizSurface(sentences, currentIndex, title));
  }, [fingerprint, sentences, currentIndex, title]);

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
            buildA2uiQuizSurface(sentences, currentIndex, title, { difficulty }),
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
          const prompt = buildOnDeviceQuizPrompt({
            title: title?.trim() || "Leitura atual",
            questionCount: localPlan.targetQuestionCount,
            difficulty,
            wasBudgetLimited: localPlan.coverage.wasBudgetLimited,
            coveragePercent: localPlan.coverage.coveragePercent,
          });
          let rawOutput = "";
          for await (const chunk of sendMessage(prompt, {
            context: localPlan.formattedContext,
            fileName: title,
          })) {
            if (controller.signal.aborted) return;
            rawOutput += chunk;
          }
          if (controller.signal.aborted || !mountedRef.current) return;
          const questions = parseAndNormalizeAiQuizQuestions(
            rawOutput,
            sentences,
            { maxQuestions: localPlan.targetQuestionCount, difficulty },
          );
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
        setSurface(
          buildA2uiQuizSurface(sentences, currentIndex, title, { difficulty }),
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
      }),
    );
    setGenerationNotice(null);
    setGenerationStatus("ready");
  }, [sentences, currentIndex, title, surface.dataModelUpdate.difficulty]);

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
