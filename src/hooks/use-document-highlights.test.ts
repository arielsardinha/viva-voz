import { renderHook, act } from "@testing-library/react";
import { useDocumentHighlights } from "./use-document-highlights";
import type { Sentence } from "@/lib/pdf-text";

describe("useDocumentHighlights", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  const mockSentences: Sentence[] = [
    { index: 0, page: 1, text: "Primeira frase do documento de teste." },
    { index: 1, page: 1, text: "Segunda frase com termos importantes para destacar." },
    { index: 2, page: 2, text: "Terceira frase na página seguinte." },
  ];

  it("deve iniciar vazio quando não há registros no storage", () => {
    const { result } = renderHook(() => useDocumentHighlights("doc-123"));

    expect(result.current.highlights).toEqual([]);
    expect(result.current.isLoaded).toBe(true);
  });

  it("deve carregar dados salvos no localStorage para o documento correspondente", () => {
    const savedData = [
      {
        id: "hl-1",
        documentId: "doc-123",
        sentenceIndex: 0,
        startOffset: 0,
        endOffset: 8,
        text: "Primeira",
        color: "yellow",
        createdAt: 100,
      },
    ];
    localStorage.setItem("vivavoz_highlights_doc-123", JSON.stringify(savedData));

    const { result } = renderHook(() => useDocumentHighlights("doc-123"));

    expect(result.current.highlights).toHaveLength(1);
    expect(result.current.highlights[0].text).toBe("Primeira");
  });

  it("deve aplicar marcação através de matching de texto", () => {
    const { result } = renderHook(() => useDocumentHighlights("doc-123"));

    act(() => {
      const success = result.current.applyHighlight(
        "green",
        "termos importantes",
        null,
        mockSentences
      );
      expect(success).toBe(true);
    });

    expect(result.current.highlights).toHaveLength(1);
    expect(result.current.highlights[0].color).toBe("green");
    expect(result.current.highlights[0].sentenceIndex).toBe(1);
    expect(result.current.highlights[0].text).toBe("termos importantes");

    // Verifica persistência no localStorage
    const stored = JSON.parse(localStorage.getItem("vivavoz_highlights_doc-123") || "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0].color).toBe("green");
  });

  it("deve remover destaques de uma frase selecionada", () => {
    const { result } = renderHook(() => useDocumentHighlights("doc-123"));

    act(() => {
      result.current.applyHighlight("pink", "Primeira", null, mockSentences);
    });

    expect(result.current.highlights).toHaveLength(1);

    act(() => {
      const removed = result.current.removeHighlightsForSelection(
        "Primeira",
        null,
        mockSentences
      );
      expect(removed).toBe(true);
    });

    expect(result.current.highlights).toHaveLength(0);
    expect(localStorage.getItem("vivavoz_highlights_doc-123")).toBeNull();
  });

  it("deve limpar todos os destaques do documento", () => {
    const { result } = renderHook(() => useDocumentHighlights("doc-123"));

    act(() => {
      result.current.applyHighlight("blue", "Primeira", null, mockSentences);
      result.current.applyHighlight("orange", "Terceira", null, mockSentences);
    });

    expect(result.current.highlights).toHaveLength(2);

    act(() => {
      result.current.clearAllHighlights();
    });

    expect(result.current.highlights).toHaveLength(0);
    expect(localStorage.getItem("vivavoz_highlights_doc-123")).toBeNull();
  });
});
