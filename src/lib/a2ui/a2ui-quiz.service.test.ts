import type { Sentence } from "@/lib/pdf-text";
import {
  applyA2uiUserAction,
  buildA2uiQuizSurface,
  buildA2uiSurfaceFromQuestions,
  computeA2uiQuizSummary,
} from "./a2ui-quiz.service";
import { planQuizContent } from "./quiz-content-planner";

const SHORT_DOC_SENTENCES: Sentence[] = [
  {
    index: 0,
    page: 1,
    text: "Não sou propriamente um autor defunto, mas um defunto autor para quem a campa foi outro berço e ponto de partida para refletir sobre as memórias póstumas e as contradições da existência humana naquela sociedade carioca.",
  },
  {
    index: 1,
    page: 1,
    text: "Moisés, que também contou a sua morte com grande solenidade, não a pôs no intróito do Pentateuco, mas no cabo, criando uma diferença radical entre a narrativa bíblica e este livro singular cheio de ironia e digressões.",
  },
  {
    index: 2,
    page: 2,
    text: "A segunda consideração que me levou a adotar diferente método é que o escrito ficaria assim mais galante e mais novo, permitindo dialogar livremente com os leitores sem os receios típicos dos escritores vivos e preocupados com a reputação.",
  },
];

function buildLongDocument(totalSentences: number, pages = 12): Sentence[] {
  const concepts = [
    "microsservicos",
    "idempotencia",
    "observabilidade",
    "consistencia",
    "particionamento",
    "tolerancia",
    "latencia",
    "escalabilidade",
    "criptografia",
    "replicacao",
    "autenticacao",
    "paralelismo",
  ];

  return Array.from({ length: totalSentences }, (_, idx) => {
    const page = Math.min(pages, Math.floor((idx * pages) / totalSentences) + 1);
    const concept = concepts[idx % concepts.length];
    const words = Array.from({ length: 48 }, (__, w) => `termo${idx}_${w}`).join(" ");
    return {
      index: idx,
      page,
      text: `Na secao ${idx + 1}, o conceito de ${concept} orienta o projeto resiliente em producao: ${words}.`,
    };
  });
}

describe("a2ui-quiz.service (Protocolo A2UI Inteligente 1-10)", () => {
  it("retorna superfície vazia quando não há frases válidas no documento", () => {
    const payload = buildA2uiQuizSurface([], 0, "Vazio");
    expect(payload.surfaceUpdate.questions).toHaveLength(0);
    expect(payload.surfaceUpdate.coverage.targetQuestionCount).toBe(0);
    expect(payload.dataModelUpdate.highlightedSentenceIndex).toBeNull();
  });

  it("gera exatamente 1 questão para documentos muito curtos (1 frase)", () => {
    const single: Sentence[] = [
      { index: 0, page: 1, text: "A leitura acessível amplia a autonomia intelectual." },
    ];
    const payload = buildA2uiQuizSurface(single, 0, null);

    expect(payload.surfaceUpdate.questions).toHaveLength(1);
    expect(payload.surfaceUpdate.source).toBe("local-smart");
    expect(payload.dataModelUpdate.documentTitle).toBe("Leitura atual");
    expect(payload.dataModelUpdate.highlightedSentenceIndex).toBe(0);
  });

  it("gera 3 questões distribuídas e sem duplicatas para documento com ~110 palavras", () => {
    const payload = buildA2uiQuizSurface(SHORT_DOC_SENTENCES, 0, "Memórias Póstumas");

    expect(payload.surfaceUpdate.catalogId).toBe("vivavoz.quiz.v1");
    expect(payload.surfaceUpdate.questions).toHaveLength(3);
    const sentenceIndices = payload.surfaceUpdate.questions.map((q) => q.sentenceIndex);
    expect(new Set(sentenceIndices).size).toBe(3);
    expect(payload.surfaceUpdate.questions[1].paragraphRef).toBe(2);
    expect(payload.dataModelUpdate.totalXp).toBe(0);
  });

  it("gera até 10 questões distribuídas de início ao fim para documentos longos com mistura de cloze e compreensão", () => {
    const longDoc = buildLongDocument(80, 16);
    const payload = buildA2uiQuizSurface(longDoc, 20, "Arquitetura Distribuída");
    const questions = payload.surfaceUpdate.questions;

    expect(questions).toHaveLength(10);
    const uniqueSentences = new Set(questions.map((q) => q.sentenceIndex));
    expect(uniqueSentences.size).toBe(10);

    // Deve cobrir desde as primeiras páginas até as páginas finais
    expect(questions[0].page).toBeLessThanOrEqual(2);
    expect(questions[questions.length - 1].page).toBeGreaterThanOrEqual(14);

    // Deve incluir questão de lacuna (______), além de compreensão
    expect(questions.some((q) => q.prompt.includes("______"))).toBe(true);
    // Questões com distratores suficientes oferecem 4 alternativas (A..D)
    expect(questions.some((q) => q.options.length === 4)).toBe(true);
  });

  it("aplica userAction de alternativa correta (inclusive D), confiança, navegação anterior/próxima e resumo", () => {
    const longDoc = buildLongDocument(80, 10);
    const payload = buildA2uiQuizSurface(longDoc, 0, "Arquitetura");
    const questions = payload.surfaceUpdate.questions;
    const q1 = questions[0];
    const correct1 = q1.options.find((o) => o.isCorrect)!;

    let state = applyA2uiUserAction(payload.dataModelUpdate, questions, {
      type: "selectOption",
      questionId: q1.id,
      optionId: correct1.id,
    });
    expect(state.totalXp).toBe(60);
    expect(state.streak).toBe(1);

    // Repetir acerto na mesma questão não duplica XP
    state = applyA2uiUserAction(state, questions, {
      type: "selectOption",
      questionId: q1.id,
      optionId: correct1.id,
    });
    expect(state.totalXp).toBe(60);

    state = applyA2uiUserAction(state, questions, {
      type: "setConfidence",
      questionId: q1.id,
      confidence: "certain",
    });
    state = applyA2uiUserAction(state, questions, {
      type: "saveCardToNotes",
      questionId: q1.id,
    });
    expect(state.answers[q1.id].confidence).toBe("certain");
    expect(state.answers[q1.id].savedToNotes).toBe(true);

    // Navega para a frente e volta com prevQuestion / comando "anterior"
    state = applyA2uiUserAction(state, questions, { type: "nextQuestion" });
    expect(state.currentQuestionIndex).toBe(1);
    state = applyA2uiUserAction(state, questions, {
      type: "voiceCommand",
      transcript: "anterior",
    });
    expect(state.currentQuestionIndex).toBe(0);

    // Responde todas as demais para checar o resumo completo
    for (let i = 1; i < questions.length; i += 1) {
      const q = questions[i];
      const opt = i % 2 === 0 ? q.options.find((o) => o.isCorrect)! : q.options.find((o) => !o.isCorrect)!;
      state = applyA2uiUserAction(state, questions, {
        type: "selectOption",
        questionId: q.id,
        optionId: opt.id,
      });
    }

    const summary = computeA2uiQuizSummary(state, questions);
    expect(summary.totalQuestions).toBe(10);
    expect(summary.answeredCount).toBe(10);
    expect(summary.isCompleted).toBe(true);
    expect(summary.correctCount).toBe(5);
    expect(summary.accuracyPercent).toBe(50);
    expect(summary.confidenceBreakdown.certain).toBe(1);
  });

  it("suporta comando de voz para letra D, dica, dificuldade e buildA2uiSurfaceFromQuestions", () => {
    const planned = planQuizContent(SHORT_DOC_SENTENCES, "cloud");
    const customQuestions = [
      {
        id: "q-1",
        index: 0,
        topic: "Síntese",
        paragraphRef: 1,
        sentenceIndex: 0,
        page: 1,
        prompt: "Qual é a ideia central?",
        evidenceQuote: SHORT_DOC_SENTENCES[0].text,
        explanation: "Explicação do trecho.",
        hint: "Releia o início.",
        xpReward: 90,
        options: [
          { id: "A" as const, label: "Errada A", isCorrect: false },
          { id: "B" as const, label: "Errada B", isCorrect: false },
          { id: "C" as const, label: "Errada C", isCorrect: false },
          { id: "D" as const, label: "Correta D", isCorrect: true },
        ],
      },
    ];

    const surface = buildA2uiSurfaceFromQuestions({
      questions: customQuestions,
      title: "Memórias",
      coverage: planned.coverage,
      source: "ai-cloud",
      difficulty: "hard",
    });

    expect(surface.surfaceUpdate.source).toBe("ai-cloud");
    expect(surface.dataModelUpdate.difficulty).toBe("hard");

    let state = applyA2uiUserAction(surface.dataModelUpdate, surface.surfaceUpdate.questions, {
      type: "voiceCommand",
      transcript: "letra D",
    });
    expect(state.totalXp).toBe(90);
    expect(state.answers["q-1"].isCorrect).toBe(true);

    state = applyA2uiUserAction(state, surface.surfaceUpdate.questions, {
      type: "voiceCommand",
      transcript: "me dê uma dica",
    });
    expect(state.activeHintQuestionId).toBe("q-1");

    state = applyA2uiUserAction(state, surface.surfaceUpdate.questions, { type: "resetQuiz" });
    expect(state.totalXp).toBe(0);
    expect(state.answers).toEqual({});
  });
});
