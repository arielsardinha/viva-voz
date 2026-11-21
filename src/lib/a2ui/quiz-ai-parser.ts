import { z } from "zod";
import type { Sentence } from "@/lib/pdf-text";
import type {
  A2UIOptionId,
  A2UIQuizOption,
  A2UIQuizQuestion,
} from "./a2ui-quiz.types";

const OPTION_IDS: readonly A2UIOptionId[] = ["A", "B", "C", "D"];
const BASE_XP = 60;
const HARD_XP = 90;

export const RawAiQuizOptionSchema = z.object({
  id: z.string().optional(),
  label: z.string().trim().min(1).max(300),
  isCorrect: z.boolean(),
});

export const RawAiQuizQuestionSchema = z.object({
  topic: z.string().trim().min(1).max(60).optional(),
  sentenceIndex: z.number().int().optional(),
  paragraphRef: z.number().int().optional(),
  prompt: z.string().trim().min(8).max(400),
  evidenceQuote: z.string().trim().min(4).max(350).optional(),
  explanation: z.string().trim().min(4).max(450).optional(),
  hint: z.string().trim().min(4).max(300).optional(),
  options: z.array(RawAiQuizOptionSchema).min(3).max(4),
});

export const RawAiQuizResponseSchema = z.object({
  questions: z.array(RawAiQuizQuestionSchema).min(1).max(12),
});

type RawQuestion = z.infer<typeof RawAiQuizQuestionSchema>;

export function buildQuizSystemPrompt(difficulty: "normal" | "hard"): string {
  const depthRule =
    difficulty === "hard"
      ? "Priorize questões de inferência, relação causa-efeito, comparação de conceitos e síntese crítica, evitando perguntas literais triviais."
      : "Equilibre compreensão fiel, identificação de argumentos centrais e relações entre conceitos apresentados no texto.";

  return [
    "Você é um elaborador pedagógico especialista em avaliação de leitura no VivaVoz.",
    "IDIOMA ESTRITO: formule todas as perguntas, alternativas, explicações e dicas em Português do Brasil (pt-BR).",
    "FIDELIDADE: baseie-se EXCLUSIVAMENTE nos trechos fornecidos ([¶N p.P]). Nunca invente fatos externos.",
    depthRule,
    "QUALIDADE DAS ALTERNATIVAS: forneça exatamente 4 alternativas plausíveis (A, B, C, D) com apenas 1 correta (`isCorrect: true`). Distratores devem ser críveis e não óbvios.",
    "DISTRIBUIÇÃO: cubra todo o arco do conteúdo recebido (início, desenvolvimento e conclusão), sem concentrar todas as respostas corretas na mesma letra.",
    "SAÍDA JSON: retorne apenas JSON válido no formato { questions: [...] } com `sentenceIndex` 0-based igual a `¶N - 1`, `evidenceQuote` curta, `explanation` didática e `hint` sem revelar a resposta.",
  ].join("\n");
}

/**
 * Instrução enxuta para modelos locais (Gemma/Nano): menos campos por questão para
 * caber no teto de saída. `explanation` e `hint` são preenchidos pelo parser.
 */
export function buildCompactQuizSystemPrompt(difficulty: "normal" | "hard"): string {
  return [
    "Você gera questões de múltipla escolha em Português do Brasil sobre os trechos fornecidos ([¶N p.P]).",
    "Use SOMENTE o conteúdo dos trechos. Nunca invente fatos.",
    difficulty === "hard"
      ? "Prefira questões de inferência e relação entre ideias."
      : "Prefira questões de compreensão das ideias centrais.",
    "Cada questão tem exatamente 4 alternativas curtas (até 15 palavras) e só 1 com isCorrect true. Varie a letra correta.",
    "Responda APENAS com JSON válido, sem Markdown, sem texto antes ou depois.",
  ].join("\n");
}

export function buildCompactQuizUserPrompt(params: {
  title: string;
  questionCount: number;
}): string {
  return [
    `Documento: "${params.title}"`,
    `Gere exatamente ${params.questionCount} questão(ões) sobre trechos diferentes.`,
    "`sentenceIndex` = N - 1 do trecho [¶N] usado. `evidenceQuote` = até 12 palavras copiadas do trecho.",
    'Formato: {"questions":[{"topic":"","sentenceIndex":0,"prompt":"","evidenceQuote":"","options":[{"label":"","isCorrect":true},{"label":"","isCorrect":false},{"label":"","isCorrect":false},{"label":"","isCorrect":false}]}]}',
  ].join("\n");
}

export function buildQuizUserPrompt(params: {
  title: string;
  questionCount: number;
  difficulty: "normal" | "hard";
  formattedContext: string;
  wasBudgetLimited: boolean;
  coveragePercent: number;
}): string {
  const coverageLine = params.wasBudgetLimited
    ? `Nota de orçamento de tokens: este recorte representa uma amostragem distribuída (~${params.coveragePercent}%) do início ao fim do documento.`
    : "Nota de cobertura: este texto representa 100% do documento carregado.";

  return [
    `Documento: "${params.title}"`,
    `Quantidade exata de questões: ${params.questionCount}`,
    `Nível: ${params.difficulty === "hard" ? "Difícil (análise/inferência)" : "Normal (compreensão)"}`,
    coverageLine,
    "Gere exatamente a quantidade solicitada de questões distribuídas pelas diferentes passagens abaixo e retorne apenas o JSON estruturado.",
    "",
    "=== TRECHOS DO DOCUMENTO ===",
    params.formattedContext,
  ].join("\n");
}

/** Remove blocos markdown e localiza o objeto JSON balanceado mais externo. */
export function extractJsonObject(rawText: string): string | null {
  const stripped = rawText
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const start = stripped.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < stripped.length; i += 1) {
    const ch = stripped[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\" && inString) {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (ch === "{") depth += 1;
      else if (ch === "}") {
        depth -= 1;
        if (depth === 0) return stripped.slice(start, i + 1);
      }
    }
  }
  return null;
}

function normalizeTextForMatch(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function resolveTargetSentence(
  raw: RawQuestion,
  sentences: readonly Sentence[],
  sentenceMap: ReadonlyMap<number, Sentence>,
  questionOrder: number,
  totalExpected: number,
): Sentence {
  const candidateIdx =
    typeof raw.sentenceIndex === "number"
      ? raw.sentenceIndex
      : typeof raw.paragraphRef === "number"
        ? raw.paragraphRef - 1
        : -1;

  const direct = sentenceMap.get(candidateIdx);
  if (direct) return direct;

  if (raw.evidenceQuote) {
    const cleanQuote = normalizeTextForMatch(raw.evidenceQuote);
    const probe = cleanQuote.slice(0, Math.min(36, cleanQuote.length));
    if (probe.length >= 8) {
      const matched = sentences.find((s) =>
        normalizeTextForMatch(s.text).includes(probe),
      );
      if (matched) return matched;
    }
  }

  const fallbackPos = Math.min(
    sentences.length - 1,
    Math.floor((questionOrder * sentences.length) / Math.max(1, totalExpected)),
  );
  return sentences[fallbackPos];
}

function deduplicateAndValidateOptions(
  rawOptions: RawQuestion["options"],
): Array<{ label: string; isCorrect: boolean }> | null {
  const seen = new Set<string>();
  const unique: Array<{ label: string; isCorrect: boolean }> = [];

  for (const opt of rawOptions) {
    const key = normalizeTextForMatch(opt.label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push({ label: opt.label.trim(), isCorrect: opt.isCorrect });
  }

  if (unique.length < 3) return null;
  const correctCount = unique.filter((o) => o.isCorrect).length;
  if (correctCount !== 1) return null;
  return unique.slice(0, 4);
}

function assignOptionIds(
  opts: ReadonlyArray<{ label: string; isCorrect: boolean }>,
  targetCorrectSlot?: number,
): readonly A2UIQuizOption[] {
  const ordered = [...opts];
  if (typeof targetCorrectSlot === "number") {
    const currentIdx = ordered.findIndex((o) => o.isCorrect);
    const clampedTarget = targetCorrectSlot % ordered.length;
    if (currentIdx !== -1 && currentIdx !== clampedTarget) {
      const [correctItem] = ordered.splice(currentIdx, 1);
      ordered.splice(clampedTarget, 0, correctItem);
    }
  }
  return ordered.map((opt, idx) => ({
    id: OPTION_IDS[idx],
    label: opt.label,
    isCorrect: opt.isCorrect,
  }));
}

function clipText(text: string, maxLen: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen - 1).trimEnd()}…`;
}

/**
 * Recupera as questões completas de uma resposta truncada (ex.: modelo local que
 * atinge o teto de tokens de saída no meio do JSON). Varre o array `questions`
 * e devolve cada objeto `{...}` que fechou corretamente.
 */
export function salvageQuestionObjects(rawText: string): unknown[] {
  const stripped = rawText
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "");
  const keyIdx = stripped.search(/"questions"\s*:\s*\[/);
  const arrayStart =
    keyIdx === -1 ? stripped.indexOf("[") : stripped.indexOf("[", keyIdx);
  if (arrayStart === -1) return [];

  const found: unknown[] = [];
  let depth = 0;
  let objStart = -1;
  let inString = false;
  let escaped = false;

  for (let i = arrayStart + 1; i < stripped.length; i += 1) {
    const ch = stripped[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\" && inString) {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") {
      if (depth === 0) objStart = i;
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0 && objStart !== -1) {
        try {
          found.push(JSON.parse(stripped.slice(objStart, i + 1)));
        } catch {
          // objeto malformado: ignora e segue para o próximo
        }
        objStart = -1;
      }
    } else if (ch === "]" && depth === 0) {
      break;
    }
  }
  return found;
}

function extractQuestionCandidates(rawInput: string | unknown): unknown[] {
  if (typeof rawInput !== "string") {
    const obj = rawInput as { questions?: unknown };
    if (Array.isArray(rawInput)) return rawInput;
    return Array.isArray(obj?.questions) ? obj.questions : [];
  }

  const trimmed = rawInput.trim();
  const candidates = [trimmed, extractJsonObject(trimmed)];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const parsed = JSON.parse(candidate) as { questions?: unknown };
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed?.questions)) return parsed.questions;
    } catch {
      // tenta a próxima estratégia
    }
  }

  const salvaged = salvageQuestionObjects(trimmed);
  if (salvaged.length === 0) {
    throw new Error("Resposta da IA não contém JSON válido.");
  }
  return salvaged;
}

/** Valida, normaliza e ancora no documento as questões geradas por IA. */
export function parseAndNormalizeAiQuizQuestions(
  rawInput: string | unknown,
  sentences: readonly Sentence[],
  options: { maxQuestions: number; difficulty: "normal" | "hard" },
): A2UIQuizQuestion[] {
  if (sentences.length === 0) {
    throw new Error("Documento vazio para geração de questões.");
  }

  // Valida questão a questão: uma alternativa longa demais não descarta o lote todo.
  const validatedQuestions = extractQuestionCandidates(rawInput)
    .map((item) => RawAiQuizQuestionSchema.safeParse(item))
    .filter((result) => result.success)
    .map((result) => result.data as RawQuestion);
  const limit = Math.min(10, Math.max(1, options.maxQuestions));
  const sentenceMap = new Map(sentences.map((s) => [s.index, s]));

  const validDrafts: Array<{
    raw: RawQuestion;
    opts: Array<{ label: string; isCorrect: boolean }>;
  }> = [];

  for (const raw of validatedQuestions) {
    const cleanOpts = deduplicateAndValidateOptions(raw.options);
    if (cleanOpts) validDrafts.push({ raw, opts: cleanOpts });
    if (validDrafts.length >= limit) break;
  }

  if (validDrafts.length === 0) {
    throw new Error("Nenhuma questão válida retornada pela IA.");
  }

  const uniqueCorrectSlots = new Set(
    validDrafts.map((d) => d.opts.findIndex((o) => o.isCorrect)),
  );
  const needsRebalance = validDrafts.length >= 2 && uniqueCorrectSlots.size <= 1;
  const xpReward = options.difficulty === "hard" ? HARD_XP : BASE_XP;

  return validDrafts.map(({ raw, opts }, idx) => {
    const sentence = resolveTargetSentence(
      raw,
      sentences,
      sentenceMap,
      idx,
      validDrafts.length,
    );
    const targetSlot = needsRebalance ? (idx + 1) % opts.length : undefined;

    return {
      id: `q-${idx + 1}`,
      index: idx,
      topic: raw.topic?.trim() || "Compreensão do texto",
      paragraphRef: sentence.index + 1,
      sentenceIndex: sentence.index,
      page: sentence.page,
      prompt: raw.prompt.trim(),
      evidenceQuote: clipText(raw.evidenceQuote || sentence.text, 140),
      explanation:
        raw.explanation?.trim() ||
        `Evidência localizada em ¶${sentence.index + 1} (pág. ${sentence.page}).`,
      hint:
        raw.hint?.trim() ||
        `Observe o trecho ¶${sentence.index + 1} na pág. ${sentence.page}.`,
      xpReward,
      options: assignOptionIds(opts, targetSlot),
    };
  });
}
