import { ParsedDocumentBuilder } from "./document-builder";

describe("ParsedDocumentBuilder (GoF Builder Pattern)", () => {
  it("deve construir um ParsedDocument válido com sentenças e métricas calculadas", () => {
    const doc = new ParsedDocumentBuilder()
      .setId("doc-123")
      .setTitle("Livro Exemplo")
      .setAuthor("Autor Exemplo")
      .setFormat("txt")
      .setOriginalFileName("exemplo.txt")
      .setSizeBytes(1024)
      .addRawText("Primeira frase do documento. Segunda frase detalhada.")
      .build();

    expect(doc.id).toBe("doc-123");
    expect(doc.metadata.title).toBe("Livro Exemplo");
    expect(doc.metadata.author).toBe("Autor Exemplo");
    expect(doc.metadata.format).toBe("txt");
    expect(doc.metadata.sizeBytes).toBe(1024);
    expect(doc.sentences.length).toBe(2);
    expect(doc.metadata.wordCount).toBeGreaterThan(0);
    expect(doc.metadata.estimatedReadingMinutes).toBeGreaterThanOrEqual(1);
    expect(doc.chapters.length).toBe(1);
    expect(doc.chapters[0].title).toBe("Início");
    expect(doc.chapters[0].startIndex).toBe(0);
    expect(doc.chapters[0].endIndex).toBe(1);
  });

  it("deve mapear capítulos customizados com índices consistentes", () => {
    const builder = new ParsedDocumentBuilder()
      .setTitle("Manual de Instruções")
      .setFormat("md")
      .addSentences(["Frase 1 do capítulo 1.", "Frase 2 do capítulo 1."])
      .addSentences(["Frase 1 do capítulo 2.", "Frase 2 do capítulo 2."])
      .addChapter("Capítulo 1: Introdução", 0, 1)
      .addChapter("Capítulo 2: Configuração", 2, 3);

    const doc = builder.build();
    expect(doc.chapters.length).toBe(2);
    expect(doc.chapters[0].title).toBe("Capítulo 1: Introdução");
    expect(doc.chapters[1].title).toBe("Capítulo 2: Configuração");
    expect(doc.metadata.chapterCount).toBe(2);
  });

  it("deve gerar id automático e título padrão se não forem fornecidos", () => {
    const doc = new ParsedDocumentBuilder()
      .addRawText("Apenas uma frase rápida.")
      .build();

    expect(doc.id).toBeDefined();
    expect(doc.metadata.title).toBe("Documento sem título");
    expect(doc.metadata.format).toBe("txt");
  });

  it("deve ajustar índices de capítulos inválidos para não estourar o array de sentenças", () => {
    const doc = new ParsedDocumentBuilder()
      .addSentences(["Frase 1", "Frase 2"])
      .addChapter("Capítulo Fora da Faixa", -5, 100)
      .build();

    expect(doc.chapters[0].startIndex).toBe(0);
    expect(doc.chapters[0].endIndex).toBe(1);
  });
});
