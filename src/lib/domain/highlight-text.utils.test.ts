import { segmentSentenceText, mergeHighlights } from "./highlight-text.utils";
import type { TextHighlight } from "./document-highlight.types";

describe("highlight-text.utils", () => {
  describe("segmentSentenceText", () => {
    it("deve retornar texto puro quando não houver highlights", () => {
      const text = "Este é um texto simples de teste.";
      const result = segmentSentenceText(text, []);

      expect(result).toEqual([{ text, isHighlighted: false }]);
    });

    it("deve fatiar o início, meio e fim de um texto com destaque no meio", () => {
      const text = "Olá mundo maravilhoso da leitura.";
      const highlights: TextHighlight[] = [
        {
          id: "h1",
          sentenceIndex: 0,
          startOffset: 4,
          endOffset: 9,
          text: "mundo",
          color: "yellow",
          createdAt: 1000,
        },
      ];

      const result = segmentSentenceText(text, highlights);

      expect(result).toEqual([
        { text: "Olá ", isHighlighted: false },
        { text: "mundo", isHighlighted: true, color: "yellow", highlightId: "h1" },
        { text: " maravilhoso da leitura.", isHighlighted: false },
      ]);
    });

    it("deve lidar com destaque no texto inteiro", () => {
      const text = "Frase completamente destacada.";
      const highlights: TextHighlight[] = [
        {
          id: "h2",
          sentenceIndex: 0,
          startOffset: 0,
          endOffset: text.length,
          text,
          color: "green",
          createdAt: 1000,
        },
      ];

      const result = segmentSentenceText(text, highlights);

      expect(result).toEqual([
        { text, isHighlighted: true, color: "green", highlightId: "h2" },
      ]);
    });

    it("deve suportar múltiplos destaques em posições diferentes", () => {
      const text = "A inteligência artificial ajuda nos estudos modernos.";
      // "A " = [0, 2]
      // "inteligência artificial" = [2, 25]
      // " ajuda nos " = [25, 36]
      // "estudos" = [36, 43]
      // " modernos." = [43, 53]
      const highlights: TextHighlight[] = [
        {
          id: "h1",
          sentenceIndex: 0,
          startOffset: 2,
          endOffset: 25,
          text: "inteligência artificial",
          color: "blue",
          createdAt: 1000,
        },
        {
          id: "h2",
          sentenceIndex: 0,
          startOffset: 36,
          endOffset: 43,
          text: "estudos",
          color: "pink",
          createdAt: 1001,
        },
      ];

      const result = segmentSentenceText(text, highlights);

      expect(result).toEqual([
        { text: "A ", isHighlighted: false },
        { text: "inteligência artificial", isHighlighted: true, color: "blue", highlightId: "h1" },
        { text: " ajuda nos ", isHighlighted: false },
        { text: "estudos", isHighlighted: true, color: "pink", highlightId: "h2" },
        { text: " modernos.", isHighlighted: false },
      ]);
    });

    it("deve resolver sobreposições dando preferência ao destaque mais recente e mesclando adjacentes", () => {
      const text = "Texto com partes sobrepostas.";
      // "Texto " = [0, 6]
      // "com partes sobre" = [6, 22]
      // "postas." = [22, 29]
      const highlights: TextHighlight[] = [
        {
          id: "old-h",
          sentenceIndex: 0,
          startOffset: 0,
          endOffset: 15,
          text: "Texto com parte",
          color: "yellow",
          createdAt: 1000,
        },
        {
          id: "new-h",
          sentenceIndex: 0,
          startOffset: 6,
          endOffset: 22,
          text: "com partes sobre",
          color: "purple",
          createdAt: 2000, // mais recente
        },
      ];

      const result = segmentSentenceText(text, highlights);

      expect(result).toEqual([
        { text: "Texto ", isHighlighted: true, color: "yellow", highlightId: "old-h" },
        { text: "com partes sobre", isHighlighted: true, color: "purple", highlightId: "new-h" },
        { text: "postas.", isHighlighted: false },
      ]);
    });
  });

  describe("mergeHighlights", () => {
    it("deve remover highlights totalmente englobados pela nova marcação", () => {
      const existing: TextHighlight[] = [
        {
          id: "h1",
          sentenceIndex: 0,
          startOffset: 5,
          endOffset: 10,
          text: "mundo",
          color: "yellow",
          createdAt: 1000,
        },
      ];

      const newHighlight: TextHighlight = {
        id: "h2",
        sentenceIndex: 0,
        startOffset: 0,
        endOffset: 20,
        text: "Olá mundo todo aqui",
        color: "green",
        createdAt: 2000,
      };

      const merged = mergeHighlights(existing, newHighlight);
      expect(merged).toHaveLength(1);
      expect(merged[0].id).toBe("h2");
    });
  });
});
