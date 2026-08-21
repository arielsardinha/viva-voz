import "fake-indexeddb/auto";
import { DocumentProcessingFacade } from "./document-processing.facade";

describe("DocumentProcessingFacade (GoF Facade Pattern)", () => {
  let facade: DocumentProcessingFacade;

  beforeEach(() => {
    facade = new DocumentProcessingFacade();
  });

  it("deve processar e salvar arquivo .txt com sucesso", async () => {
    const file = new File(["Primeira linha importante. Segunda linha com fatos."], "notas.txt", {
      type: "text/plain",
    });

    const doc = await facade.processAndSaveFile(file);
    expect(doc.metadata.title).toBe("notas");
    expect(doc.metadata.format).toBe("txt");
    expect(doc.sentences.length).toBe(2);

    const saved = await facade.getRepository().getById(doc.id);
    expect(saved).not.toBeNull();
    expect(saved?.id).toBe(doc.id);
  });

  it("deve processar e salvar texto colado (Quick Paste)", async () => {
    const doc = await facade.processAndSaveRawText(
      "Resumo da Aula",
      "Conceito inicial explicado pelo professor. Definição do segundo tópico."
    );

    expect(doc.metadata.title).toBe("Resumo da Aula");
    expect(doc.metadata.format).toBe("paste");
    expect(doc.sentences.length).toBe(2);

    const saved = await facade.getRepository().getById(doc.id);
    expect(saved).not.toBeNull();
  });

  it("deve lançar erro explicativo para formato não suportado", async () => {
    const unsupportedFile = new File(["conteudo"], "planilha.xlsx", {
      type: "application/vnd.ms-excel",
    });

    await expect(facade.processAndSaveFile(unsupportedFile)).rejects.toThrow(
      /Formato não suportado/i
    );
  });

  it("deve atualizar o progresso de leitura (sentence index) de um documento", async () => {
    const doc = await facade.processAndSaveRawText("Livro", "Frase 0. Frase 1. Frase 2.");
    await facade.saveReadingProgress(doc.id, 2);

    const updated = await facade.getRepository().getById(doc.id);
    expect(updated?.lastSentenceIndex).toBe(2);
  });

  it("deve renomear o documento no repositório", async () => {
    const doc = await facade.processAndSaveRawText("Título Antigo", "Conteúdo.");
    const updated = await facade.renameDocument(doc.id, "Novo Título Fantástico");

    expect(updated?.metadata.title).toBe("Novo Título Fantástico");
    const retrieved = await facade.getRepository().getById(doc.id);
    expect(retrieved?.metadata.title).toBe("Novo Título Fantástico");
  });
});
