import { z } from "zod";
import type { Sentence } from "@/lib/pdf-text";
import type { A2UIQuizQuestion, QuizCoverageInfo } from "../a2ui-quiz.types";
import { planQuizContent } from "../quiz-content-planner";
import {
  buildQuizSystemPrompt,
  buildQuizUserPrompt,
  parseAndNormalizeAiQuizQuestions,
} from "../quiz-ai-parser";

export const GEMINI_QUIZ_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
] as const;

export const QuizSentenceSchema = z.object({
  index: z.number().int().min(0),
  page: z.number().int().min(1),
  text: z.string().min(1).max(2000),
});

export const QuizRequestSchema = z.object({
  title: z.string().max(200).optional().nullable(),
  sentences: z.array(QuizSentenceSchema).min(1).max(25000),
  difficulty: z.enum(["normal", "hard"]).default("normal"),
  userApiKey: z.string().trim().min(10).max(200).optional(),
});

export const GEMINI_QUIZ_RESPONSE_SCHEMA = {
  type: "OBJECT",
  required: ["questions"],
  properties: {
    questions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        required: [
          "topic",
          "sentenceIndex",
          "prompt",
          "evidenceQuote",
          "explanation",
          "hint",
          "options",
        ],
        properties: {
          topic: { type: "STRING" },
          sentenceIndex: { type: "INTEGER" },
          prompt: { type: "STRING" },
          evidenceQuote: { type: "STRING" },
          explanation: { type: "STRING" },
          hint: { type: "STRING" },
          options: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              required: ["id", "label", "isCorrect"],
              properties: {
                id: { type: "STRING" },
                label: { type: "STRING" },
                isCorrect: { type: "BOOLEAN" },
              },
            },
          },
        },
      },
    },
  },
} as const;

export interface QuizTokenUsage {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

export type CloudQuizResult =
  | {
      ok: true;
      questions: A2UIQuizQuestion[];
      coverage: QuizCoverageInfo;
      modelId: string;
      tokenUsage?: QuizTokenUsage;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  usageMetadata?: QuizTokenUsage;
}

/** Detecta strings mascaradas enviadas pelo hook de cliente para evitar sobrescrever cookie real. */
export function isMaskedClientApiKey(value?: string | null): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  return trimmed === "connected" || trimmed.includes("...");
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 503 || status === 504;
}

function mapStatusToError(status: number): string {
  if (status === 401 || status === 403) {
    return "A chave do Gemini informada foi recusada. Verifique sua chave no Google AI Studio e tente novamente.";
  }
  if (status === 429) {
    return "Limite temporário de uso da IA atingido. Tente novamente em instantes.";
  }
  if (status >= 500) {
    return "O serviço do Gemini está temporariamente indisponível. Tente novamente em instantes.";
  }
  return "Não foi possível gerar o quiz com a IA no momento. Tente novamente em instantes.";
}

function buildGeminiRequestBody(params: {
  title: string;
  difficulty: "normal" | "hard";
  questionCount: number;
  formattedContext: string;
  wasBudgetLimited: boolean;
  coveragePercent: number;
}): string {
  return JSON.stringify({
    systemInstruction: {
      parts: [{ text: buildQuizSystemPrompt(params.difficulty) }],
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: buildQuizUserPrompt({
              title: params.title,
              questionCount: params.questionCount,
              difficulty: params.difficulty,
              formattedContext: params.formattedContext,
              wasBudgetLimited: params.wasBudgetLimited,
              coveragePercent: params.coveragePercent,
            }),
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: GEMINI_QUIZ_RESPONSE_SCHEMA,
      temperature: 0.35,
      maxOutputTokens: 4096,
    },
  });
}

async function requestSingleModel(params: {
  modelId: string;
  apiKey: string;
  requestBody: string;
  fetchImpl: typeof fetch;
  signal?: AbortSignal;
}): Promise<
  | { ok: true; data: GeminiGenerateResponse }
  | { ok: false; status: number; retryable: boolean }
> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${params.modelId}:generateContent`;
  const response = await params.fetchImpl(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": params.apiKey,
    },
    body: params.requestBody,
    signal: params.signal,
  });

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      retryable: isRetryableStatus(response.status),
    };
  }

  const data = (await response.json()) as GeminiGenerateResponse;
  return { ok: true, data };
}

/** Gera de 1 a 10 questões sobre todo o documento via Gemini BYOK respeitando orçamento de 6000 tokens. */
export async function generateCloudQuiz(options: {
  sentences: readonly Sentence[];
  title?: string | null;
  difficulty: "normal" | "hard";
  apiKey: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}): Promise<CloudQuizResult> {
  const planned = planQuizContent(options.sentences, "cloud");
  if (planned.targetQuestionCount === 0 || planned.selectedSentences.length === 0) {
    return {
      ok: false,
      status: 400,
      error: "Documento sem conteúdo textual suficiente para gerar perguntas.",
    };
  }

  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const docTitle = options.title?.trim() || "Leitura atual";
  const requestBody = buildGeminiRequestBody({
    title: docTitle,
    difficulty: options.difficulty,
    questionCount: planned.targetQuestionCount,
    formattedContext: planned.formattedContext,
    wasBudgetLimited: planned.coverage.wasBudgetLimited,
    coveragePercent: planned.coverage.coveragePercent,
  });

  let lastFailure: { status: number; error: string } = {
    status: 502,
    error: "Não foi possível gerar o quiz com a IA no momento.",
  };

  for (const modelId of GEMINI_QUIZ_MODELS) {
    const attempt = await requestSingleModel({
      modelId,
      apiKey: options.apiKey,
      requestBody,
      fetchImpl,
      signal: options.signal,
    });

    if (!attempt.ok) {
      lastFailure = {
        status: attempt.status,
        error: mapStatusToError(attempt.status),
      };
      if (attempt.retryable) continue;
      return { ok: false, ...lastFailure };
    }

    const rawText = attempt.data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    try {
      const questions = parseAndNormalizeAiQuizQuestions(rawText, options.sentences, {
        maxQuestions: planned.targetQuestionCount,
        difficulty: options.difficulty,
      });
      return {
        ok: true,
        questions,
        coverage: planned.coverage,
        modelId,
        tokenUsage: attempt.data.usageMetadata,
      };
    } catch {
      lastFailure = {
        status: 502,
        error: "A IA retornou um formato inesperado ao montar o quiz. Tente novamente.",
      };
    }
  }

  return { ok: false, ...lastFailure };
}
