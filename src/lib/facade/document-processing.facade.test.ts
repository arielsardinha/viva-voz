import "fake-indexeddb/auto";
import { DocumentProcessingFacade } from "./document-processing.facade";
import { IOcrEngineStrategy } from "@/lib/ocr/ocr-strategy.interface";
import { OcrDocumentAdapter } from "@/lib/parsers/ocr.adapter";
import { AdapterRegistry } from "@/lib/parsers/adapter-registry";

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

  it("deve processar e salvar imagem .png via OCR com sucesso", async () => {
    const mockStrategy: IOcrEngineStrategy = {
      engineType: "gemini-vision",
      isAvailable: async () => true,
      recognize: jest.fn().mockResolvedValue("Texto extraído da imagem com sucesso."),
    };
    const customRegistry = new AdapterRegistry([
      new OcrDocumentAdapter({ defaultStrategy: mockStrategy }),
    ]);
    const customFacade = new DocumentProcessingFacade(customRegistry);

    const imageFile = new File(["image-binary"], "anotacao.png", { type: "image/png" });
    const doc = await customFacade.processAndSaveFile(imageFile);

    expect(doc.metadata.title).toBe("anotacao");
    expect(doc.metadata.format).toBe("ocr");
    expect(doc.sentences.length).toBeGreaterThan(0);

    const saved = await customFacade.getRepository().getById(doc.id);
    expect(saved).not.toBeNull();
    expect(saved?.metadata.format).toBe("ocr");
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

  it("deve salvar ParsedDocument diretamente no repositório (artigos da web offline-first)", async () => {
    const webDoc = {
      id: "doc_web_test_123",
      metadata: {
        id: "doc_web_test_123",
        title: "Notícia sobre IA",
        format: "web" as const,
        sizeBytes: 1500,
        wordCount: 200,
        estimatedReadingMinutes: 2,
        chapterCount: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      chapters: [{ id: "c1", title: "Introdução", startIndex: 0, endIndex: 1 }],
      sentences: [
        { index: 0, page: 1, text: "O avanço da inteligência artificial continua acelerado." },
        { index: 1, page: 1, text: "Novos leitores neurais trazem mais acessibilidade." },
      ],
      lastSentenceIndex: 0,
    };

    const saved = await facade.saveParsedDocument(webDoc);
    expect(saved.id).toBe("doc_web_test_123");

    const fromDb = await facade.getRepository().getById("doc_web_test_123");
    expect(fromDb).not.toBeNull();
    expect(fromDb?.metadata.title).toBe("Notícia sobre IA");
    expect(fromDb?.metadata.format).toBe("web");
    expect(fromDb?.sentences.length).toBe(2);
  });
});
