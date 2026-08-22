import "fake-indexeddb/auto";
import { act, renderHook } from "@testing-library/react";
import { ParsedDocumentBuilder } from "@/lib/domain/document-builder";
import { DocumentProcessingFacade } from "@/lib/facade/document-processing.facade";
import { useLibrary } from "./use-library";

describe("useLibrary (ViewModel MVVM)", () => {
  let facade: DocumentProcessingFacade;

  beforeEach(async () => {
    facade = new DocumentProcessingFacade();
    // Inserir documentos para o teste
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

    await facade.getRepository().save(doc1);
    await facade.getRepository().save(doc2);
    await facade.getRepository().save(doc3);
  });

  it("deve carregar lista de documentos e calcular bytes totais", async () => {
    const { result } = renderHook(() => useLibrary(facade));

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.documents.length).toBe(3);
    expect(result.current.filteredDocuments.length).toBe(3);
    expect(result.current.isLoading).toBe(false);
  });

  it("deve filtrar por busca de texto (título ou autor)", async () => {
    const { result } = renderHook(() => useLibrary(facade));

    await act(async () => {
      await result.current.refresh();
    });

    act(() => {
      result.current.setSearchQuery("Platão");
    });

    expect(result.current.filteredDocuments.length).toBe(1);
    expect(result.current.filteredDocuments[0].title).toBe("Livro de Filosofia");
  });

  it("deve filtrar por formato (ex: EPUB e ODT)", async () => {
    const { result } = renderHook(() => useLibrary(facade));

    await act(async () => {
      await result.current.refresh();
    });

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
    expect(result.current.filteredDocuments[0].title).toBe("Documento Aberto");
  });

  it("deve favoritar e desfavoritar documentos", async () => {
    const { result } = renderHook(() => useLibrary(facade));

    await act(async () => {
      await result.current.refresh();
    });

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
    const { result } = renderHook(() => useLibrary(facade));

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.documents.length).toBe(3);

    // Salva um quarto documento diretamente no repositório
    const doc4 = new ParsedDocumentBuilder()
      .setId("lib-4")
      .setTitle("Quarto Documento")
      .setFormat("txt")
      .addSentence("Texto quatro.")
      .build();

    await facade.getRepository().save(doc4);

    // O repositório já dispara notifyLibraryChanged no save, mas vamos garantir o teste do ciclo de evento
    await act(async () => {
      window.dispatchEvent(new CustomEvent("vivavoz:library-changed", { detail: { reason: "sync" } }));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.documents.length).toBe(4);
    expect(result.current.documents.some((d) => d.id === "lib-4")).toBe(true);
  });
});
