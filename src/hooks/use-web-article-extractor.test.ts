import { renderHook, act } from "@testing-library/react";
import { useWebArticleExtractor } from "./use-web-article-extractor";
import type { ParsedDocument } from "@/lib/domain/document.types";

const mockParsedDoc: ParsedDocument = {
  id: "doc_web_123",
  metadata: {
    id: "doc_web_123",
    title: "Artigo Exemplo",
    format: "web",
    sizeBytes: 500,
    wordCount: 100,
    estimatedReadingMinutes: 1,
    chapterCount: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  chapters: [{ id: "chap_1", title: "Início", startIndex: 0, endIndex: 2 }],
  sentences: [
    { index: 0, page: 1, text: "Primeira frase do artigo." },
    { index: 1, page: 1, text: "Segunda frase do artigo." },
  ],
  lastSentenceIndex: 0,
};

describe("useWebArticleExtractor Hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve inicializar com estado padrão", () => {
    const { result } = renderHook(() => useWebArticleExtractor());

    expect(result.current.url).toBe("");
    expect(result.current.isUrlValid).toBe(false);
    expect(result.current.state).toBe("idle");
    expect(result.current.error).toBe(null);
    expect(result.current.progress).toBe(0);
  });

  it("deve validar URLs corretamente (http e https)", () => {
    const { result } = renderHook(() => useWebArticleExtractor());

    act(() => {
      result.current.setUrl("invalida");
    });
    expect(result.current.isUrlValid).toBe(false);

    act(() => {
      result.current.setUrl("https://meublog.com/post");
    });
    expect(result.current.isUrlValid).toBe(true);
    expect(result.current.error).toBe(null);
  });

  it("deve extrair artigo com sucesso e acionar callback imediatamente", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          title: "Artigo Exemplo",
          document: mockParsedDoc,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const onExtractedMock = jest.fn();
    const { result } = renderHook(() => useWebArticleExtractor());

    act(() => {
      result.current.setUrl("https://noticias.com/artigo-1");
    });

    await act(async () => {
      await result.current.handleExtract(onExtractedMock);
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/extract-url", expect.any(Object));
    expect(onExtractedMock).toHaveBeenCalledWith(mockParsedDoc);
    expect(result.current.state).toBe("idle");
    expect(result.current.error).toBe(null);

    fetchMock.mockRestore();
  });

  it("deve lidar com erro de URL inválida ao tentar extrair", async () => {
    const onExtractedMock = jest.fn();
    const { result } = renderHook(() => useWebArticleExtractor());

    act(() => {
      result.current.setUrl("ftp://servidor.com");
    });

    await act(async () => {
      await result.current.handleExtract(onExtractedMock);
    });

    expect(onExtractedMock).not.toHaveBeenCalled();
    expect(result.current.state).toBe("error");
    expect(result.current.error).toContain("URL válida");
  });

  it("deve lidar com erro retornado pela API", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Falha ao carregar conteúdo da página." }), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      })
    );

    const onExtractedMock = jest.fn();
    const { result } = renderHook(() => useWebArticleExtractor());

    act(() => {
      result.current.setUrl("https://site-bloqueado.com");
    });

    await act(async () => {
      await result.current.handleExtract(onExtractedMock);
    });

    expect(onExtractedMock).not.toHaveBeenCalled();
    expect(result.current.state).toBe("error");
    expect(result.current.error).toBe("Falha ao carregar conteúdo da página.");

    fetchMock.mockRestore();
  });

  it("deve resetar o estado adequadamente", () => {
    const { result } = renderHook(() => useWebArticleExtractor());

    act(() => {
      result.current.setUrl("https://exemplo.com");
    });
    expect(result.current.url).toBe("https://exemplo.com");

    act(() => {
      result.current.reset();
    });

    expect(result.current.url).toBe("");
    expect(result.current.isUrlValid).toBe(false);
    expect(result.current.state).toBe("idle");
  });
});
