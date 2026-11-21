/**
 * Contratos do protocolo A2UI (Agent-to-User Interface) para o Quiz Interativo do VivaVoz.
 * Separa estrutura declarativa (`surfaceUpdate`) do estado vivo (`dataModelUpdate`) e das ações (`userAction`).
 */

export type A2UIConfidenceLevel = "guess" | "unsure" | "certain";

export type A2UIOptionId = "A" | "B" | "C" | "D";

export type QuizEngineKind =
  | "cloud"
  | "gemini-nano"
  | "litert-lm-full"
  | "litert-lm-lite"
  | "offline";

export type QuizGenerationSource = "ai-cloud" | "ai-local" | "ai-nano" | "local-smart";

export type QuizGenerationStatus = "idle" | "loading" | "ready" | "fallback";

export interface QuizCoverageInfo {
  totalSentences: number;
  includedSentences: number;
  totalChars: number;
  includedChars: number;
  estimatedInputTokens: number;
  maxInputTokens: number;
  coveragePercent: number;
  wasBudgetLimited: boolean;
  strategy: "full" | "stratified";
  targetQuestionCount: number;
  coveredPageRange?: { from: number; to: number };
}

export interface QuizSummaryStats {
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  accuracyPercent: number;
  isCompleted: boolean;
  totalXp: number;
  streak: number;
  confidenceBreakdown: Record<A2UIConfidenceLevel, number>;
}

export interface A2UIQuizOption {
  id: A2UIOptionId;
  label: string;
  isCorrect: boolean;
}

export interface A2UIQuizQuestion {
  id: string;
  index: number;
  topic: string;
  paragraphRef: number;
  sentenceIndex: number;
  page?: number;
  prompt: string;
  evidenceQuote: string;
  explanation: string;
  hint: string;
  xpReward: number;
  options: readonly A2UIQuizOption[];
}

export interface A2UIQuestionAnswer {
  selectedOptionId: A2UIOptionId;
  isCorrect: boolean;
  confidence?: A2UIConfidenceLevel;
  savedToNotes?: boolean;
}

export interface A2UIQuizDataModel {
  surfaceId: string;
  documentTitle: string;
  currentQuestionIndex: number;
  streak: number;
  totalXp: number;
  difficulty: "normal" | "hard";
  activeHintQuestionId: string | null;
  highlightedSentenceIndex: number | null;
  answers: Record<string, A2UIQuestionAnswer>;
}

export interface A2UIQuizSurfacePayload {
  surfaceUpdate: {
    surfaceId: string;
    catalogId: "vivavoz.quiz.v1";
    source: QuizGenerationSource;
    coverage: QuizCoverageInfo;
    questions: readonly A2UIQuizQuestion[];
  };
  dataModelUpdate: A2UIQuizDataModel;
}

export type A2UIUserAction =
  | { type: "selectOption"; questionId: string; optionId: A2UIOptionId }
  | { type: "setConfidence"; questionId: string; confidence: A2UIConfidenceLevel }
  | { type: "nextQuestion" }
  | { type: "prevQuestion" }
  | { type: "selectQuestion"; questionIndex: number }
  | { type: "requestHint"; questionId: string }
  | { type: "toggleDifficulty" }
  | { type: "highlightEvidence"; sentenceIndex: number }
  | { type: "saveCardToNotes"; questionId: string }
  | { type: "voiceCommand"; transcript: string }
  | { type: "resetQuiz" };
