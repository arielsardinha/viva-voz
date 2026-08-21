import "fake-indexeddb/auto";
import { act, renderHook } from "@testing-library/react";
import { DocumentProcessingFacade } from "@/lib/facade/document-processing.facade";
import { useDocumentUploader } from "./use-document-uploader";

describe("useDocumentUploader (ViewModel MVVM)", () => {
  let facade: DocumentProcessingFacade;

  beforeEach(() => {
    facade = new DocumentProcessingFacade();
  });

  it("deve iniciar com estado limpo", () => {
    const { result } = renderHook(() => useDocumentUploader({ facade }));

    expect(result.current.queue).toEqual([]);
    expect(result.current.isUploading).toBe(false);
    expect(result.current.currentProgress).toBeNull();
    expect(result.current.supportedExtensions).toContain(".pdf");
    expect(result.current.supportedExtensions).toContain(".epub");
  });

  it("deve processar upload de arquivo com sucesso e atualizar a fila", async () => {
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useDocumentUploader({ facade, onSuccess }));

    const file = new File(["Frase um. Frase dois."], "documento.txt", { type: "text/plain" });

    await act(async () => {
      await result.current.uploadFiles([file]);
    });

    expect(result.current.queue.length).toBe(1);
    expect(result.current.queue[0].status).toBe("success");
    expect(result.current.isUploading).toBe(false);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("deve capturar erros em arquivos de formatos inválidos", async () => {
    const onError = jest.fn();
    const { result } = renderHook(() => useDocumentUploader({ facade, onError }));

    const invalidFile = new File(["..."], "dados.csv", { type: "text/csv" });

    await act(async () => {
      await result.current.uploadFiles([invalidFile]);
    });

    expect(result.current.queue[0].status).toBe("error");
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("deve suportar upload de texto colado (Quick Paste)", async () => {
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useDocumentUploader({ facade, onSuccess }));

    let doc = null;
    await act(async () => {
      doc = await result.current.uploadRawText("Nota Importante", "Texto para narração imediata.");
    });

    expect(doc).not.toBeNull();
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});
