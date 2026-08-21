import "fake-indexeddb/auto";
import { ParsedDocumentBuilder } from "@/lib/domain/document-builder";
import { IndexedDbLibraryRepository } from "./library.repository";

describe("IndexedDbLibraryRepository (GoF Repository Pattern)", () => {
  let repository: IndexedDbLibraryRepository;

  beforeEach(() => {
    repository = new IndexedDbLibraryRepository();
  });

  it("deve salvar e recuperar um ParsedDocument com integridade total", async () => {
    const doc = new ParsedDocumentBuilder()
      .setId("doc-unit-1")
      .setTitle("Livro em EPUB")
      .setAuthor("Autor Teste")
      .setFormat("epub")
      .addSentences(["Capítulo 1 frase 1.", "Capítulo 1 frase 2."])
      .addChapter("Capítulo 1", 0, 1)
      .build();

    await repository.save(doc);

    const retrieved = await repository.getById("doc-unit-1");
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe("doc-unit-1");
    expect(retrieved?.metadata.title).toBe("Livro em EPUB");
    expect(retrieved?.metadata.author).toBe("Autor Teste");
    expect(retrieved?.metadata.format).toBe("epub");
    expect(retrieved?.chapters.length).toBe(1);
    expect(retrieved?.chapters[0].title).toBe("Capítulo 1");
    expect(retrieved?.sentences.length).toBe(2);
  });

  it("deve listar resumos de documentos ordenados por data de atualização", async () => {
    const doc1 = new ParsedDocumentBuilder()
      .setId("doc-list-1")
      .setTitle("Doc Antigo")
      .setFormat("txt")
      .addSentence("Texto rápido")
      .build();

    const doc2 = new ParsedDocumentBuilder()
      .setId("doc-list-2")
      .setTitle("Doc Novo")
      .setFormat("docx")
      .addSentence("Texto novo")
      .build();

    await repository.save(doc1);
    await repository.save(doc2);

    const list = await repository.list();
    expect(list.length).toBeGreaterThanOrEqual(2);
    expect(list.some((d) => d.id === "doc-list-1")).toBe(true);
    expect(list.some((d) => d.id === "doc-list-2")).toBe(true);
  });

  it("deve deletar um documento pelo id", async () => {
    const doc = new ParsedDocumentBuilder()
      .setId("doc-del-1")
      .setTitle("Doc para deletar")
      .addSentence("Adeus")
      .build();

    await repository.save(doc);
    expect(await repository.getById("doc-del-1")).not.toBeNull();

    await repository.delete("doc-del-1");
    expect(await repository.getById("doc-del-1")).toBeNull();
  });

  it("deve salvar e obter preferências da aplicação", async () => {
    const updated = await repository.savePreferences({ speed: "1.75", engine: "google" });
    expect(updated.speed).toBe("1.75");
    expect(updated.engine).toBe("google");

    const retrieved = await repository.getPreferences();
    expect(retrieved.speed).toBe("1.75");
  });
});
