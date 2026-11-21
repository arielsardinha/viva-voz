import type { Sentence } from "@/lib/pdf-text";
import type { QuizCoverageInfo, QuizEngineKind } from "./a2ui-quiz.types";

export const MIN_QUIZ_QUESTIONS = 1;
export const MAX_QUIZ_QUESTIONS = 10;
export const CHARS_PER_TOKEN_ESTIMATE = 4;

export interface QuizBudgetConfig {
  maxInputTokens: number;
  maxContextChars: number;
  minQuestions: number;
  maxQuestions: number;
}

export const QUIZ_TOKEN_BUDGETS: Record<QuizEngineKind, QuizBudgetConfig> = {
  cloud: {
    maxInputTokens: 6000,
    maxContextChars: 24000,
    minQuestions: MIN_QUIZ_QUESTIONS,
    maxQuestions: MAX_QUIZ_QUESTIONS,
  },
  "gemini-nano": {
    maxInputTokens: 2000,
    maxContextChars: 8000,
    minQuestions: MIN_QUIZ_QUESTIONS,
    maxQuestions: 8,
  },
  "litert-lm-full": {
    maxInputTokens: 1500,
    maxContextChars: 6000,
    minQuestions: MIN_QUIZ_QUESTIONS,
    maxQuestions: 8,
  },
  "litert-lm-lite": {
    maxInputTokens: 650,
    maxContextChars: 2600,
    minQuestions: MIN_QUIZ_QUESTIONS,
    maxQuestions: 4,
  },
  offline: {
    maxInputTokens: 6000,
    maxContextChars: 24000,
    minQuestions: MIN_QUIZ_QUESTIONS,
    maxQuestions: MAX_QUIZ_QUESTIONS,
  },
};

export interface PlannedQuizContent {
  selectedSentences: Sentence[];
  formattedContext: string;
  targetQuestionCount: number;
  coverage: QuizCoverageInfo;
}

interface FormattedSentence {
  sentence: Sentence;
  formatted: string;
}

const WORD_THRESHOLDS: ReadonlyArray<readonly [number, number]> = [
  [40, 1],
  [100, 2],
  [220, 3],
  [400, 4],
  [700, 5],
  [1100, 6],
  [1700, 7],
  [2500, 8],
  [3600, 9],
];

export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN_ESTIMATE);
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function getQuizBudgetConfig(engine: QuizEngineKind): QuizBudgetConfig {
  return QUIZ_TOKEN_BUDGETS[engine];
}

function getValidSentences(sentences: readonly Sentence[]): Sentence[] {
  return sentences.filter((s) => s.text.trim().length > 0);
}

function mapWordCountToQuestions(wordCount: number): number {
  for (const [limit, count] of WORD_THRESHOLDS) {
    if (wordCount < limit) return count;
  }
  return MAX_QUIZ_QUESTIONS;
}

/** Calcula de 1 a 10 perguntas conforme o tamanho do conteúdo e o limite do motor. */
export function computeIntelligentQuestionCount(
  sentences: readonly Sentence[],
  engine: QuizEngineKind = "cloud",
): number {
  const valid = getValidSentences(sentences);
  if (valid.length === 0) return 0;

  const budget = getQuizBudgetConfig(engine);
  const uniqueSentences = new Set(valid.map((s) => s.text.trim().toLowerCase())).size;
  const wordCount = valid.reduce((sum, s) => sum + countWords(s.text), 0);
  const byWords = mapWordCountToQuestions(wordCount);

  const densityCap =
    engine === "offline"
      ? Math.max(1, uniqueSentences)
      : Math.max(1, uniqueSentences, Math.floor(wordCount / 45));

  const limited = Math.min(byWords, densityCap);
  return Math.max(budget.minQuestions, Math.min(budget.maxQuestions, limited));
}

function formatSentenceLine(sentence: Sentence): string {
  return `[¶${sentence.index + 1} p.${sentence.page}] ${sentence.text.trim()}`;
}

function clipFormattedLine(sentence: Sentence, maxChars: number): FormattedSentence | null {
  const prefix = `[¶${sentence.index + 1} p.${sentence.page}] `;
  if (maxChars <= prefix.length + 8) return null;
  const available = maxChars - prefix.length - 1;
  const cleanText = sentence.text.replace(/\s+/g, " ").trim();
  const formatted = `${prefix}${cleanText.slice(0, available).trimEnd()}…`;
  return { sentence, formatted };
}

function pickBucketItems(
  bucketItems: readonly FormattedSentence[],
  bucketIndex: number,
  bucketCount: number,
  charLimit: number,
): FormattedSentence[] {
  if (bucketItems.length === 0 || charLimit <= 0) return [];

  const chosen: FormattedSentence[] = [];
  let usedChars = 0;

  const tryPush = (item: FormattedSentence, prepend: boolean): boolean => {
    const sep = chosen.length > 0 ? 1 : 0;
    if (usedChars + sep + item.formatted.length > charLimit) return false;
    usedChars += sep + item.formatted.length;
    if (prepend) chosen.unshift(item);
    else chosen.push(item);
    return true;
  };

  if (bucketIndex === 0) {
    for (const item of bucketItems) {
      if (!tryPush(item, false)) break;
    }
  } else if (bucketIndex === bucketCount - 1) {
    for (let i = bucketItems.length - 1; i >= 0; i -= 1) {
      if (!tryPush(bucketItems[i], true)) break;
    }
  } else {
    const mid = Math.floor(bucketItems.length / 2);
    if (tryPush(bucketItems[mid], false)) {
      let left = mid - 1;
      let right = mid + 1;
      while (left >= 0 || right < bucketItems.length) {
        let progressed = false;
        if (right < bucketItems.length && tryPush(bucketItems[right], false)) {
          progressed = true;
        }
        if (left >= 0 && tryPush(bucketItems[left], true)) {
          progressed = true;
        }
        right += 1;
        left -= 1;
        if (!progressed) break;
      }
    }
  }

  if (chosen.length === 0) {
    const anchorIdx =
      bucketIndex === 0
        ? 0
        : bucketIndex === bucketCount - 1
          ? bucketItems.length - 1
          : Math.floor(bucketItems.length / 2);
    const clipped = clipFormattedLine(bucketItems[anchorIdx].sentence, charLimit);
    if (clipped) chosen.push(clipped);
  }

  return chosen;
}

function sampleStratified(
  items: readonly FormattedSentence[],
  targetQuestions: number,
  maxContextChars: number,
): FormattedSentence[] {
  const bucketCount = Math.min(Math.max(1, targetQuestions), items.length);
  const picked: FormattedSentence[] = [];
  let remainingChars = maxContextChars;

  for (let b = 0; b < bucketCount; b += 1) {
    const start = Math.floor((b * items.length) / bucketCount);
    const end = Math.floor(((b + 1) * items.length) / bucketCount);
    const slice = items.slice(start, Math.max(start + 1, end));
    const remainingBuckets = bucketCount - b;
    const separatorReserve = picked.length > 0 ? 1 : 0;
    const quota = Math.max(0, Math.floor((remainingChars - separatorReserve) / remainingBuckets));

    const bucketSelected = pickBucketItems(slice, b, bucketCount, quota);
    for (const entry of bucketSelected) {
      const joinCost = picked.length > 0 ? 1 : 0;
      if (joinCost + entry.formatted.length <= remainingChars) {
        picked.push(entry);
        remainingChars -= joinCost + entry.formatted.length;
      }
    }
  }

  return picked;
}

function resolvePageRange(sentences: readonly Sentence[]): { from: number; to: number } | undefined {
  if (sentences.length === 0) return undefined;
  let from = sentences[0].page;
  let to = sentences[0].page;
  for (const s of sentences) {
    if (s.page < from) from = s.page;
    if (s.page > to) to = s.page;
  }
  return { from, to };
}

/** Seleciona todo o conteúdo ou uma amostra estratificada dentro do orçamento de tokens do motor. */
export function planQuizContent(
  sentences: readonly Sentence[],
  engine: QuizEngineKind = "cloud",
): PlannedQuizContent {
  const valid = getValidSentences(sentences);
  const budget = getQuizBudgetConfig(engine);
  const targetQuestionCount = computeIntelligentQuestionCount(valid, engine);

  if (valid.length === 0) {
    return {
      selectedSentences: [],
      formattedContext: "",
      targetQuestionCount: 0,
      coverage: {
        totalSentences: 0,
        includedSentences: 0,
        totalChars: 0,
        includedChars: 0,
        estimatedInputTokens: 0,
        maxInputTokens: budget.maxInputTokens,
        coveragePercent: 0,
        wasBudgetLimited: false,
        strategy: "full",
        targetQuestionCount: 0,
      },
    };
  }

  const formattedItems: FormattedSentence[] = valid.map((sentence) => ({
    sentence,
    formatted: formatSentenceLine(sentence),
  }));
  const fullContext = formattedItems.map((item) => item.formatted).join("\n");
  const totalChars = valid.reduce((sum, s) => sum + s.text.trim().length, 0);

  if (fullContext.length <= budget.maxContextChars) {
    return {
      selectedSentences: valid,
      formattedContext: fullContext,
      targetQuestionCount,
      coverage: {
        totalSentences: valid.length,
        includedSentences: valid.length,
        totalChars,
        includedChars: totalChars,
        estimatedInputTokens: estimateTokenCount(fullContext),
        maxInputTokens: budget.maxInputTokens,
        coveragePercent: 100,
        wasBudgetLimited: false,
        strategy: "full",
        targetQuestionCount,
        coveredPageRange: resolvePageRange(valid),
      },
    };
  }

  const sampled = sampleStratified(formattedItems, targetQuestionCount, budget.maxContextChars);
  const contextText = sampled.map((item) => item.formatted).join("\n").slice(0, budget.maxContextChars);
  const selectedSentences = sampled.map((item) => item.sentence);
  const includedChars = selectedSentences.reduce((sum, s) => sum + s.text.trim().length, 0);
  const coveragePercent = Math.max(
    1,
    Math.min(99, Math.round((contextText.length / fullContext.length) * 100)),
  );

  return {
    selectedSentences,
    formattedContext: contextText,
    targetQuestionCount,
    coverage: {
      totalSentences: valid.length,
      includedSentences: selectedSentences.length,
      totalChars,
      includedChars,
      estimatedInputTokens: estimateTokenCount(contextText),
      maxInputTokens: budget.maxInputTokens,
      coveragePercent,
      wasBudgetLimited: true,
      strategy: "stratified",
      targetQuestionCount,
      coveredPageRange: resolvePageRange(selectedSentences),
    },
  };
}

/** Gera assinatura determinística do documento para cache em memória entre trocas de aba. */
export function buildDocumentFingerprint(
  sentences: readonly Sentence[],
  title: string | null,
): string {
  const cleanTitle = (title ?? "leitura-atual").trim().toLowerCase();
  const valid = getValidSentences(sentences);
  if (valid.length === 0) return `${cleanTitle}::0::0`;

  const totalChars = valid.reduce((sum, s) => sum + s.text.length, 0);
  const first = valid[0].text.slice(0, 24);
  const mid = valid[Math.floor(valid.length / 2)].text.slice(0, 24);
  const last = valid[valid.length - 1].text.slice(0, 24);
  return `${cleanTitle}::${valid.length}::${totalChars}::${first}|${mid}|${last}`;
}
