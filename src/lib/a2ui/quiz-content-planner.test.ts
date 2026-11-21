import type { Sentence } from "@/lib/pdf-text";
import {
  CHARS_PER_TOKEN_ESTIMATE,
  MAX_QUIZ_QUESTIONS,
  MIN_QUIZ_QUESTIONS,
  QUIZ_TOKEN_BUDGETS,
  buildDocumentFingerprint,
  computeIntelligentQuestionCount,
  countWords,
  estimateTokenCount,
  planQuizContent,
} from "./quiz-content-planner";

function makeWordSentence(index: number, page: number, wordCount: number): Sentence {
  const words = Array.from({ length: wordCount }, (_, i) => `palavra${index}_${i}`);
  return {
    index,
    page,
    text: `${words.join(" ")}.`,
  };
}

function makeDocWithWords(
  sentenceCount: number,
  wordsPerSentence: number,
  pagesCount = 1,
): Sentence[] {
  return Array.from({ length: sentenceCount }, (_, idx) => {
    const page = Math.min(pagesCount, Math.floor((idx * pagesCount) / sentenceCount) + 1);
    return makeWordSentence(idx, page, wordsPerSentence);
  });
}

describe("quiz-content-planner", () => {
  describe("estimativa de palavras e tokens", () => {
    it("conta palavras e estima tokens usando CHARS_PER_TOKEN_ESTIMATE", () => {
      expect(countWords("   um   dois\ntres  ")).toBe(3);
      expect(countWords("   ")).toBe(0);
      expect(estimateTokenCount("")).toBe(0);
      expect(estimateTokenCount("a".repeat(CHARS_PER_TOKEN_ESTIMATE))).toBe(1);
      expect(estimateTokenCount("a".repeat(CHARS_PER_TOKEN_ESTIMATE * 5 + 1))).toBe(6);
    });
  });

  describe("computeIntelligentQuestionCount (escala de 1 a 10)", () => {
    it("retorna 0 quando não há sentenças válidas", () => {
      expect(computeIntelligentQuestionCount([], "cloud")).toBe(0);
      expect(
        computeIntelligentQuestionCount([{ index: 0, page: 1, text: "   " }], "offline"),
      ).toBe(0);
    });

    it("escala progressivamente de 1 até 10 conforme o volume de palavras", () => {
      // < 40 palavras -> 1
      expect(computeIntelligentQuestionCount(makeDocWithWords(2, 10), "cloud")).toBe(
        MIN_QUIZ_QUESTIONS,
      );
      // 40-99 palavras -> 2
      expect(computeIntelligentQuestionCount(makeDocWithWords(3, 20), "cloud")).toBe(2);
      // 100-219 palavras -> 3
      expect(computeIntelligentQuestionCount(makeDocWithWords(6, 25), "cloud")).toBe(3);
      // 220-399 palavras -> 4
      expect(computeIntelligentQuestionCount(makeDocWithWords(10, 30), "cloud")).toBe(4);
      // 400-699 palavras -> 5
      expect(computeIntelligentQuestionCount(makeDocWithWords(15, 35), "cloud")).toBe(5);
      // 700-1099 palavras -> 6
      expect(computeIntelligentQuestionCount(makeDocWithWords(22, 40), "cloud")).toBe(6);
      // 1100-1699 palavras -> 7
      expect(computeIntelligentQuestionCount(makeDocWithWords(30, 45), "cloud")).toBe(7);
      // 1700-2499 palavras -> 8
      expect(computeIntelligentQuestionCount(makeDocWithWords(40, 50), "cloud")).toBe(8);
      // 2500-3599 palavras -> 9
      expect(computeIntelligentQuestionCount(makeDocWithWords(60, 50), "cloud")).toBe(9);
      // >= 3600 palavras -> 10
      expect(computeIntelligentQuestionCount(makeDocWithWords(80, 50), "cloud")).toBe(
        MAX_QUIZ_QUESTIONS,
      );
    });

    it("aplica limitador de densidade para evitar perguntas repetitivas em frases repetidas ou escassas", () => {
      const repeated: Sentence[] = Array.from({ length: 6 }, (_, i) => ({
        index: i,
        page: 1,
        text: "Esta mesma frase se repete integralmente com exatamente dez palavras aqui.",
      }));
      // No modo offline há apenas 1 frase única
      expect(computeIntelligentQuestionCount(repeated, "offline")).toBe(1);
    });

    it("respeita o teto máximo de cada motor (8 para gemini-nano/litert-lm-full e 4 para litert-lm-lite)", () => {
      const largeDoc = makeDocWithWords(100, 50, 20);
      expect(computeIntelligentQuestionCount(largeDoc, "cloud")).toBe(10);
      expect(computeIntelligentQuestionCount(largeDoc, "offline")).toBe(10);
      expect(computeIntelligentQuestionCount(largeDoc, "gemini-nano")).toBe(8);
      expect(computeIntelligentQuestionCount(largeDoc, "litert-lm-full")).toBe(8);
      expect(computeIntelligentQuestionCount(largeDoc, "litert-lm-lite")).toBe(4);
    });
  });

  describe("planQuizContent (orçamento de tokens e amostragem estratificada)", () => {
    it("inclui 100% do conteúdo quando cabe no orçamento de tokens do motor", () => {
      const sentences = makeDocWithWords(8, 25, 3);
      const planned = planQuizContent(sentences, "cloud");

      expect(planned.targetQuestionCount).toBe(3);
      expect(planned.coverage.strategy).toBe("full");
      expect(planned.coverage.wasBudgetLimited).toBe(false);
      expect(planned.coverage.coveragePercent).toBe(100);
      expect(planned.coverage.includedSentences).toBe(8);
      expect(planned.coverage.totalSentences).toBe(8);
      expect(planned.coverage.coveredPageRange).toEqual({ from: 1, to: 3 });
      expect(planned.formattedContext).toContain("[¶1 p.1]");
      expect(planned.formattedContext).toContain("[¶8 p.3]");
    });

    it("limita documentos extensos (>30k chars) ao teto de 6000 tokens no modo cloud mantendo cobertura de início ao fim", () => {
      // 180 frases x ~260 chars = ~46.800 chars (muito acima de 24.000 chars)
      const hugeDoc: Sentence[] = Array.from({ length: 180 }, (_, idx) => ({
        index: idx,
        page: Math.floor(idx / 6) + 1,
        text: `Passagem número ${idx + 1} detalhando conceitos avançados de arquitetura distribuída, memória, consenso e tolerância a falhas ao longo da página ${Math.floor(idx / 6) + 1} com exemplos práticos e evidências documentais claras.`,
      }));

      const planned = planQuizContent(hugeDoc, "cloud");
      const budget = QUIZ_TOKEN_BUDGETS.cloud;

      expect(planned.targetQuestionCount).toBe(10);
      expect(planned.coverage.strategy).toBe("stratified");
      expect(planned.coverage.wasBudgetLimited).toBe(true);
      expect(planned.coverage.coveragePercent).toBeGreaterThanOrEqual(1);
      expect(planned.coverage.coveragePercent).toBeLessThan(100);
      expect(planned.formattedContext.length).toBeLessThanOrEqual(budget.maxContextChars);
      expect(planned.coverage.estimatedInputTokens).toBeLessThanOrEqual(budget.maxInputTokens);
      // Verifica cobertura desde a primeira até a última página
      expect(planned.coverage.coveredPageRange?.from).toBe(1);
      expect(planned.coverage.coveredPageRange?.to).toBe(30);
      expect(planned.selectedSentences[0].index).toBe(0);
      expect(planned.selectedSentences[planned.selectedSentences.length - 1].page).toBe(30);
    });

    it("respeita o teto estrito de 2600 chars / 650 tokens no perfil litert-lm-lite", () => {
      const mediumLargeDoc = makeDocWithWords(70, 30, 14);
      const planned = planQuizContent(mediumLargeDoc, "litert-lm-lite");
      const budget = QUIZ_TOKEN_BUDGETS["litert-lm-lite"];

      expect(planned.targetQuestionCount).toBe(4);
      expect(planned.formattedContext.length).toBeLessThanOrEqual(budget.maxContextChars);
      expect(planned.coverage.estimatedInputTokens).toBeLessThanOrEqual(budget.maxInputTokens);
      expect(planned.coverage.wasBudgetLimited).toBe(true);
      expect(planned.coverage.coveredPageRange?.from).toBe(1);
      expect(planned.coverage.coveredPageRange?.to).toBe(14);
    });

    it("gera fingerprint estável sensível a título e conteúdo", () => {
      const docA = makeDocWithWords(4, 15, 2);
      const docB = makeDocWithWords(5, 15, 2);
      expect(buildDocumentFingerprint(docA, "Livro A")).toBe(
        buildDocumentFingerprint(docA, "Livro A"),
      );
      expect(buildDocumentFingerprint(docA, "Livro A")).not.toBe(
        buildDocumentFingerprint(docA, "Livro B"),
      );
      expect(buildDocumentFingerprint(docA, "Livro A")).not.toBe(
        buildDocumentFingerprint(docB, "Livro A"),
      );
    });
  });
});
