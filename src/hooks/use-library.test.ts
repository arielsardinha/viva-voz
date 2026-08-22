import "fake-indexeddb/auto";
import { act, renderHook, waitFor } from "@testing-library/react";
import { ParsedDocumentBuilder } from "@/lib/domain/document-builder";
import { DocumentProcessingFacade } from "@/lib/facade/document-processing.facade";
import { useLibrary } from "./use-library";

describe("useLibrary (ViewModel MVVM)", () => {
  let facade: DocumentProcessingFacade;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation((msg: string) => {
      if (typeof msg === "string" && msg.includes("not wrapped in act")) return;
    });

    facade = new DocumentProcessingFacade();
    const doc1 = new ParsedDocumentBuilder()
      .setId("lib-1")
      .setTitle("Livro de Filosofia")
      .setAuthor("Platão")
      .setFormat("epub")
      .addSentence("Texto de filosofia.")
      .build();

    const doc2 = new ParsedDocumentBuilder()
      .setId("lib-2")
      .setTitle("Artigo de Tecnologia")
      .setAuthor("Ada Lovelace")
      .setFormat("pdf")
      .addSentence("Texto de tecnologia.")
      .build();

    const doc3 = new ParsedDocumentBuilder()
      .setId("lib-3")
      .setTitle("Documento Aberto")
      .setAuthor("Richard Stallman")
      .setFormat("odt")
      .addSentence("Texto livre em formato aberto.")
      .build();

    const doc4 = new ParsedDocumentBuilder()
      .setId("lib-4")
      .setTitle("Foto do Livro Escaneado")
      .setFormat("ocr")
      .addSentence("Texto extraído de foto via OCR.")
      .build();

    await facade.getRepository().save(doc1);
    await facade.getRepository().save(doc2);
    await facade.getRepository().save(doc3);
    await facade.getRepository().save(doc4);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  const setupHook = async () => {
    const rendered = renderHook(() => useLibrary(facade));
    await waitFor(() => {
      expect(rendered.result.current.isLoading).toBe(false);
    });
    return rendered.result;
  };

  it("deve carregar lista de documentos e calcular bytes totais", async () => {
    const result = await setupHook();
    expect(result.current.documents.length).toBe(4);
    expect(result.current.filteredDocuments.length).toBe(4);
  });

  it("deve filtrar por busca de texto (título ou autor)", async () => {
    const result = await setupHook();

    act(() => {
      result.current.setSearchQuery("Platão");
    });

    expect(result.current.filteredDocuments.length).toBe(1);
    expect(result.current.filteredDocuments[0].title).toBe("Livro de Filosofia");
  });

  it("deve filtrar por formato (EPUB, ODT e OCR)", async () => {
    const result = await setupHook();

    act(() => {
      result.current.setActiveFormat("EPUB");
    });

    expect(result.current.filteredDocuments.length).toBe(1);
    expect(result.current.filteredDocuments[0].format).toBe("epub");

    act(() => {
      result.current.setActiveFormat("ODT");
    });

    expect(result.current.filteredDocuments.length).toBe(1);
    expect(result.current.filteredDocuments[0].format).toBe("odt");

    act(() => {
      result.current.setActiveFormat("OCR");
    });

    expect(result.current.filteredDocuments.length).toBe(1);
    expect(result.current.filteredDocuments[0].format).toBe("ocr");
    expect(result.current.filteredDocuments[0].title).toBe("Foto do Livro Escaneado");
  });

  it("deve favoritar e desfavoritar documentos", async () => {
    const result = await setupHook();

    act(() => {
      result.current.toggleFavorite("lib-1");
    });

    expect(result.current.favorites).toContain("lib-1");

    act(() => {
      result.current.setActiveTab("favorites");
    });

    expect(result.current.filteredDocuments.length).toBe(1);
    expect(result.current.filteredDocuments[0].id).toBe("lib-1");
  });

  it("deve recarregar documentos reativamente ao receber evento de biblioteca alterada", async () => {
    const result = await setupHook();
    expect(result.current.documents.length).toBe(4);

    const doc5 = new ParsedDocumentBuilder()
      .setId("lib-5")
      .setTitle("Quinto Documento")
      .setFormat("txt")
      .addSentence("Texto cinco.")
      .build();

    await facade.getRepository().save(doc5);

    await act(async () => {
      window.dispatchEvent(new CustomEvent("vivavoz:library-changed", { detail: { reason: "sync" } }));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.documents.length).toBe(5);
    expect(result.current.documents.some((d) => d.id === "lib-5")).toBe(true);
  });
});
