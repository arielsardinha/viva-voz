import type { Sentence } from "@/lib/pdf-text";
import type {
  A2UIConfidenceLevel,
  A2UIOptionId,
  A2UIQuizDataModel,
  A2UIQuizOption,
  A2UIQuizQuestion,
  A2UIQuizSurfacePayload,
  A2UIUserAction,
  QuizCoverageInfo,
  QuizGenerationSource,
  QuizSummaryStats,
} from "./a2ui-quiz.types";
import { planQuizContent } from "./quiz-content-planner";

const BASE_XP = 60;
const HARD_XP = 90;
const OPTION_SLOTS: readonly A2UIOptionId[] = ["A", "B", "C", "D"];

const PT_STOPWORDS = new Set([
  "sobre",
  "entre",
  "desde",
  "ainda",
  "muito",
  "muita",
  "muitos",
  "muitas",
  "outro",
  "outra",
  "outros",
  "outras",
  "mesmo",
  "mesma",
  "mesmos",
  "mesmas",
  "quando",
  "porque",
  "assim",
  "entao",
  "então",
  "todas",
  "todos",
  "toda",
  "todo",
  "cada",
  "mais",
  "menos",
  "como",
  "para",
  "pelo",
  "pela",
  "pelos",
  "pelas",
  "numa",
  "neste",
  "nesta",
  "nesse",
  "nessa",
  "esse",
  "essa",
  "este",
  "esta",
  "isso",
  "aquilo",
  "aquele",
  "aquela",
  "sendo",
  "foram",
  "sejam",
  "seria",
  "podem",
  "pode",
  "fazer",
  "forma",
  "parte",
  "texto",
  "trecho",
  "livro",
  "pagina",
  "página",
  "secao",
  "seção",
  "conceito",
  "projeto",
  "orienta",
  "producao",
  "produção",
]);

function clipText(text: string, maxLen: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen - 1).trimEnd()}…`;
}

function extractSignificantWords(text: string): string[] {
  const matches = text.match(/\p{L}{5,}/gu) ?? [];
  const unique: string[] = [];
  const seen = new Set<string>();

  for (const word of matches) {
    const lower = word.toLowerCase();
    if (PT_STOPWORDS.has(lower) || seen.has(lower)) continue;
    seen.add(lower);
    unique.push(word);
  }
  return unique;
}

function scoreSentenceInformativeness(sentence: Sentence): number {
  const len = sentence.text.trim().length;
  const sigCount = extractSignificantWords(sentence.text).length;
  const lenScore = len >= 45 && len <= 260 ? 20 : len > 260 ? 12 : 5;
  return lenScore + sigCount * 4;
}

function selectAnchorSentences(
  sentences: readonly Sentence[],
  count: number,
): Sentence[] {
  const valid = sentences.filter((s) => s.text.trim().length > 0);
  if (valid.length === 0 || count <= 0) return [];
  if (valid.length <= count) return valid;

  const picked: Sentence[] = [];
  const usedIndices = new Set<number>();

  for (let b = 0; b < count; b += 1) {
    const start = Math.floor((b * valid.length) / count);
    const end = Math.max(start + 1, Math.floor(((b + 1) * valid.length) / count));
    const slice = valid.slice(start, end);

    const candidates =
      b === count - 1 && count > 1 ? [...slice].reverse() : slice;

    let best: Sentence | null = null;
    let bestScore = -1;
    for (const candidate of candidates) {
      if (usedIndices.has(candidate.index)) continue;
      const score = scoreSentenceInformativeness(candidate);
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }

    if (best) {
      usedIndices.add(best.index);
      picked.push(best);
    }
  }

  return picked;
}

function buildClozeTarget(
  anchor: Sentence,
  globalConcepts: readonly string[],
): { masked: string; answer: string; distractors: string[] } | null {
  const words = extractSignificantWords(anchor.text);
  if (words.length === 0) return null;

  const sorted = [...words].sort((a, b) => b.length - a.length);
  const answer = sorted[0];
  const escaped = answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`\\b${escaped}\\b`, "i");
  if (!regex.test(anchor.text)) return null;

  const masked = clipText(anchor.text.replace(regex, "______"), 135);
  const answerLower = answer.toLowerCase();
  const distractors = globalConcepts
    .filter((term) => term.toLowerCase() !== answerLower)
    .slice(0, 3);

  if (distractors.length < 2) return null;
  return { masked, answer, distractors };
}

function assembleOptions(
  correctLabel: string,
  distractors: readonly string[],
  questionOrder: number,
): readonly A2UIQuizOption[] {
  const uniqueDistractors = distractors
    .filter((d) => d.trim().toLowerCase() !== correctLabel.trim().toLowerCase())
    .slice(0, 3);
  const optionCount = uniqueDistractors.length >= 3 ? 4 : 3;
  const correctSlot = (questionOrder + 1) % optionCount;

  let distIdx = 0;
  return OPTION_SLOTS.slice(0, optionCount).map((id, idx) => {
    if (idx === correctSlot) {
      return { id, label: correctLabel, isCorrect: true };
    }
    const label =
      uniqueDistractors[distIdx] ??
      "O trecho analisado não contém evidências que sustentem essa afirmação.";
    distIdx += 1;
    return { id, label, isCorrect: false };
  });
}

function buildComprehensionQuestion(
  anchor: Sentence,
  otherAnchors: readonly Sentence[],
  order: number,
  docTitle: string,
): A2UIQuizQuestion {
  const topics = ["Compreensão direta", "Argumento & Evidência", "Síntese do trecho"];
  const keyWords = extractSignificantWords(anchor.text);
  const topicHint = keyWords[0] ? `Sobre “${keyWords[0]}” na` : "Sobre o trecho na";

  const correctLabel = `Afirma diretamente: “${clipText(anchor.text, 82)}”.`;
  const otherDistractors = otherAnchors
    .filter((o) => o.index !== anchor.index && o.text.trim() !== anchor.text.trim())
    .slice(0, 2)
    .map(
      (o) =>
        `Refere-se à passagem da pág. ${o.page}: “${clipText(o.text, 64)}”.`,
    );

  const fallbackDistractors = [
    `Contradiz o argumento central apresentado na pág. ${anchor.page}.`,
    "Sustenta que nenhuma das ideias apresentadas tem relação com o conteúdo lido.",
  ];
  const distractors = [...otherDistractors, ...fallbackDistractors].slice(0, 3);

  return {
    id: `q-${order + 1}`,
    index: order,
    topic: topics[order % topics.length],
    paragraphRef: anchor.index + 1,
    sentenceIndex: anchor.index,
    page: anchor.page,
    prompt: `${topicHint} pág. ${anchor.page} de “${clipText(docTitle, 32)}” (¶${anchor.index + 1}), qual afirmação reflete o texto?`,
    evidenceQuote: clipText(anchor.text, 130),
    explanation: `O trecho ¶${anchor.index + 1} (pág. ${anchor.page}) fundamenta exatamente essa ideia: “${clipText(anchor.text, 68)}”.`,
    hint: `Releia ou ouça o parágrafo ¶${anchor.index + 1} (pág. ${anchor.page}): começa com “${clipText(anchor.text, 34)}”.`,
    xpReward: BASE_XP,
    options: assembleOptions(correctLabel, distractors, order),
  };
}

function buildClozeQuestion(
  anchor: Sentence,
  cloze: { masked: string; answer: string; distractors: string[] },
  order: number,
): A2UIQuizQuestion {
  return {
    id: `q-${order + 1}`,
    index: order,
    topic: "Conceito-chave",
    paragraphRef: anchor.index + 1,
    sentenceIndex: anchor.index,
    page: anchor.page,
    prompt: `Complete a lacuna de acordo com ¶${anchor.index + 1} (pág. ${anchor.page}): “${cloze.masked}”`,
    evidenceQuote: clipText(anchor.text, 130),
    explanation: `No trecho ¶${anchor.index + 1} (pág. ${anchor.page}), o termo exato empregado no contexto é “${cloze.answer}”.`,
    hint: `Observe o termo central usado na pág. ${anchor.page} no parágrafo ¶${anchor.index + 1}.`,
    xpReward: BASE_XP,
    options: assembleOptions(cloze.answer, cloze.distractors, order),
  };
}

function collectGlobalConcepts(sentences: readonly Sentence[]): string[] {
  const seen = new Set<string>();
  const concepts: string[] = [];
  for (const s of sentences) {
    for (const word of extractSignificantWords(s.text)) {
      const lower = word.toLowerCase();
      if (seen.has(lower)) continue;
      seen.add(lower);
      concepts.push(word);
    }
  }
  return concepts;
}

/** Monta a superfície A2UI a partir de questões pré-geradas (IA Nuvem, Local ou Nano). */
export function buildA2uiSurfaceFromQuestions(params: {
  questions: readonly A2UIQuizQuestion[];
  title: string | null;
  coverage: QuizCoverageInfo;
  source: QuizGenerationSource;
  difficulty?: "normal" | "hard";
}): A2UIQuizSurfacePayload {
  const documentTitle = params.title?.trim() || "Leitura atual";
  const surfaceId = "quiz-vivavoz-surface";

  return {
    surfaceUpdate: {
      surfaceId,
      catalogId: "vivavoz.quiz.v1",
      source: params.source,
      coverage: params.coverage,
      questions: params.questions,
    },
    dataModelUpdate: {
      surfaceId,
      documentTitle,
      currentQuestionIndex: 0,
      streak: 0,
      totalXp: 0,
      difficulty: params.difficulty ?? "normal",
      activeHintQuestionId: null,
      highlightedSentenceIndex: params.questions[0]?.sentenceIndex ?? null,
      answers: {},
    },
  };
}

/** Gera a superfície declarativa A2UI inteligente (1 a 10 questões sobre todo o conteúdo). */
export function buildA2uiQuizSurface(
  sentences: readonly Sentence[],
  _currentIndex: number,
  title: string | null,
  options?: { difficulty?: "normal" | "hard" },
): A2UIQuizSurfacePayload {
  const documentTitle = title?.trim() || "Leitura atual";
  const planned = planQuizContent(sentences, "offline");
  const valid = sentences.filter((s) => s.text.trim().length > 0);

  if (valid.length === 0 || planned.targetQuestionCount === 0) {
    return buildA2uiSurfaceFromQuestions({
      questions: [],
      title: documentTitle,
      coverage: planned.coverage,
      source: "local-smart",
      difficulty: options?.difficulty,
    });
  }

  const anchors = selectAnchorSentences(valid, planned.targetQuestionCount);
  const globalConcepts = collectGlobalConcepts(valid);

  const questions = anchors.map((anchor, idx) => {
    const others = anchors.filter((_, oIdx) => oIdx !== idx);
    const shouldTryCloze = anchors.length >= 4 && idx % 2 === 1;
    if (shouldTryCloze) {
      const cloze = buildClozeTarget(anchor, globalConcepts);
      if (cloze) return buildClozeQuestion(anchor, cloze, idx);
    }
    return buildComprehensionQuestion(anchor, others, idx, documentTitle);
  });

  const xp = options?.difficulty === "hard" ? HARD_XP : BASE_XP;
  const adjusted =
    xp === BASE_XP ? questions : questions.map((q) => ({ ...q, xpReward: xp }));

  return buildA2uiSurfaceFromQuestions({
    questions: adjusted,
    title: documentTitle,
    coverage: planned.coverage,
    source: "local-smart",
    difficulty: options?.difficulty,
  });
}

/** Calcula resumo de acertos, conclusão e confiança para exibição ao final do Quiz. */
export function computeA2uiQuizSummary(
  model: A2UIQuizDataModel,
  questions: readonly A2UIQuizQuestion[],
): QuizSummaryStats {
  const totalQuestions = questions.length;
  const confidenceBreakdown: Record<A2UIConfidenceLevel, number> = {
    guess: 0,
    unsure: 0,
    certain: 0,
  };

  let answeredCount = 0;
  let correctCount = 0;

  for (const q of questions) {
    const ans = model.answers[q.id];
    if (!ans) continue;
    answeredCount += 1;
    if (ans.isCorrect) correctCount += 1;
    if (ans.confidence) confidenceBreakdown[ans.confidence] += 1;
  }

  const accuracyPercent =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  return {
    totalQuestions,
    answeredCount,
    correctCount,
    accuracyPercent,
    isCompleted: totalQuestions > 0 && answeredCount >= totalQuestions,
    totalXp: model.totalXp,
    streak: model.streak,
    confidenceBreakdown,
  };
}

function parseVoiceCommandToAction(
  transcript: string,
  model: A2UIQuizDataModel,
  questions: readonly A2UIQuizQuestion[],
): A2UIUserAction | null {
  const normalized = transcript.trim().toLowerCase();
  const activeQuestion = questions[model.currentQuestionIndex];
  if (!normalized || !activeQuestion) return null;

  if (/dica|ajuda|pista/.test(normalized)) {
    return { type: "requestHint", questionId: activeQuestion.id };
  }
  if (/anterior|voltar|recuar/.test(normalized)) {
    return { type: "prevQuestion" };
  }
  if (/pr[oó]xim|avan[cç]|seguinte/.test(normalized)) {
    return { type: "nextQuestion" };
  }
  if (/dif[ií]cil|desaf/.test(normalized)) {
    return { type: "toggleDifficulty" };
  }

  const confidenceMap: Array<[RegExp, A2UIConfidenceLevel]> = [
    [/chut/, "guess"],
    [/d[uú]vida|talvez/, "unsure"],
    [/certeza|segur/, "certain"],
  ];
  for (const [pattern, confidence] of confidenceMap) {
    if (pattern.test(normalized)) {
      return { type: "setConfidence", questionId: activeQuestion.id, confidence };
    }
  }

  const explicitLetterMatch = normalized.match(
    /(?:letra|op[cç][aã]o|alternativa)\s+([abcd])(?![\p{L}])/iu,
  );
  const standaloneLetterMatch = normalized.match(/^([abcd])$/i);
  const letterMatch = explicitLetterMatch ?? standaloneLetterMatch;
  if (letterMatch) {
    const optionId = letterMatch[1].toUpperCase() as A2UIOptionId;
    return { type: "selectOption", questionId: activeQuestion.id, optionId };
  }
  return null;
}

/** Aplica uma `userAction` do cliente de forma pura e imutável sobre o `dataModel` A2UI. */
export function applyA2uiUserAction(
  model: A2UIQuizDataModel,
  questions: readonly A2UIQuizQuestion[],
  action: A2UIUserAction,
): A2UIQuizDataModel {
  switch (action.type) {
    case "selectOption": {
      const q = questions.find((item) => item.id === action.questionId);
      if (!q) return model;
      const chosen = q.options.find((opt) => opt.id === action.optionId);
      if (!chosen) return model;

      const prevAnswer = model.answers[q.id];
      const alreadyRewarded = Boolean(prevAnswer?.isCorrect);
      const reward = model.difficulty === "hard" ? HARD_XP : q.xpReward;
      const nextXp =
        chosen.isCorrect && !alreadyRewarded ? model.totalXp + reward : model.totalXp;
      const nextStreak = chosen.isCorrect
        ? alreadyRewarded
          ? model.streak
          : model.streak + 1
        : 0;

      return {
        ...model,
        streak: nextStreak,
        totalXp: nextXp,
        highlightedSentenceIndex: q.sentenceIndex,
        answers: {
          ...model.answers,
          [q.id]: {
            ...prevAnswer,
            selectedOptionId: action.optionId,
            isCorrect: chosen.isCorrect,
          },
        },
      };
    }

    case "setConfidence": {
      const existing = model.answers[action.questionId];
      if (!existing) return model;
      return {
        ...model,
        answers: {
          ...model.answers,
          [action.questionId]: { ...existing, confidence: action.confidence },
        },
      };
    }

    case "nextQuestion": {
      if (questions.length === 0) return model;
      const nextIdx = (model.currentQuestionIndex + 1) % questions.length;
      return {
        ...model,
        currentQuestionIndex: nextIdx,
        activeHintQuestionId: null,
        highlightedSentenceIndex: questions[nextIdx]?.sentenceIndex ?? null,
      };
    }

    case "prevQuestion": {
      if (questions.length === 0) return model;
      const prevIdx =
        (model.currentQuestionIndex - 1 + questions.length) % questions.length;
      return {
        ...model,
        currentQuestionIndex: prevIdx,
        activeHintQuestionId: null,
        highlightedSentenceIndex: questions[prevIdx]?.sentenceIndex ?? null,
      };
    }

    case "selectQuestion": {
      if (action.questionIndex < 0 || action.questionIndex >= questions.length) return model;
      return {
        ...model,
        currentQuestionIndex: action.questionIndex,
        activeHintQuestionId: null,
        highlightedSentenceIndex: questions[action.questionIndex]?.sentenceIndex ?? null,
      };
    }

    case "requestHint":
      return {
        ...model,
        activeHintQuestionId:
          model.activeHintQuestionId === action.questionId ? null : action.questionId,
      };

    case "toggleDifficulty":
      return {
        ...model,
        difficulty: model.difficulty === "normal" ? "hard" : "normal",
      };

    case "highlightEvidence":
      return {
        ...model,
        highlightedSentenceIndex: action.sentenceIndex,
      };

    case "saveCardToNotes": {
      const existing = model.answers[action.questionId];
      if (!existing) return model;
      return {
        ...model,
        answers: {
          ...model.answers,
          [action.questionId]: { ...existing, savedToNotes: true },
        },
      };
    }

    case "voiceCommand": {
      const mapped = parseVoiceCommandToAction(action.transcript, model, questions);
      return mapped ? applyA2uiUserAction(model, questions, mapped) : model;
    }

    case "resetQuiz":
      return {
        ...model,
        currentQuestionIndex: 0,
        streak: 0,
        totalXp: 0,
        activeHintQuestionId: null,
        highlightedSentenceIndex: questions[0]?.sentenceIndex ?? null,
        answers: {},
      };
  }
}
