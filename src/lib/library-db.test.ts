import {
  getPreferences,
  savePreferences,
  saveReading,
  getReading,
  listReadings,
  updateReading,
  deleteReading,
  createReadingId,
  DEFAULT_PREFERENCES,
  type Reading,
} from "./library-db";

describe("library-db (IndexedDB persistence)", () => {
  beforeEach(async () => {
    // Limpa leituras existentes antes de cada teste
    const readings = await listReadings();
    for (const r of readings) {
      await deleteReading(r.id);
    }
  });

  describe("createReadingId", () => {
    it("deve gerar um identificador único de leitura em formato string", () => {
      const id1 = createReadingId();
      const id2 = createReadingId();

      expect(typeof id1).toBe("string");
      expect(id1.length).toBeGreaterThan(0);
      expect(id1).not.toBe(id2);
    });
  });

  describe("Preferences", () => {
    it("deve retornar as preferências padrão quando nenhuma tiver sido salva", async () => {
      const prefs = await getPreferences();
      expect(prefs.engine).toBe(DEFAULT_PREFERENCES.engine);
      expect(prefs.speed).toBe(DEFAULT_PREFERENCES.speed);
    });

    it("deve salvar e recuperar preferências atualizadas", async () => {
      await savePreferences({ speed: "1.5", engine: "google" });

      const updated = await getPreferences();
      expect(updated.speed).toBe("1.5");
      expect(updated.engine).toBe("google");
    });

    it("deve fazer fallback para 'system' caso o motor gravado seja inválido", async () => {
      // @ts-expect-error testando valor inválido
      await savePreferences({ engine: "invalid_engine" });
      const prefs = await getPreferences();
      expect(prefs.engine).toBe("system");
    });
  });

  describe("Readings CRUD", () => {
    const mockReading: Reading = {
      id: "test-reading-1",
      title: "Artigo de Teste",
      fileName: "artigo.pdf",
      size: 1024,
      pageCount: 3,
      sentences: [
        { index: 0, page: 1, text: "Frase 1" },
        { index: 1, page: 2, text: "Frase 2" },
      ],
      file: new Blob(["mock data"], { type: "application/pdf" }),
      createdAt: 1000,
      updatedAt: 1000,
      lastIndex: 0,
    };

    it("deve salvar e recuperar uma leitura pelo id", async () => {
      await saveReading(mockReading);

      const retrieved = await getReading("test-reading-1");
      expect(retrieved).not.toBeNull();
      expect(retrieved?.title).toBe("Artigo de Teste");
      expect(retrieved?.sentences).toHaveLength(2);
      expect(retrieved?.pageCount).toBe(3);
    });

    it("deve retornar null ao buscar uma leitura inexistente", async () => {
      const notFound = await getReading("non-existent-id");
      expect(notFound).toBeNull();
    });

    it("deve listar leituras sem o payload pesado (sentences e file) ordenadas por updatedAt decrescente", async () => {
      const reading1 = { ...mockReading, id: "r1", title: "Primeiro", updatedAt: 100 };
      const reading2 = { ...mockReading, id: "r2", title: "Mais recente", updatedAt: 500 };
      const reading3 = { ...mockReading, id: "r3", title: "Intermediário", updatedAt: 300 };

      await saveReading(reading1);
      await saveReading(reading2);
      await saveReading(reading3);

      const list = await listReadings();
      expect(list).toHaveLength(3);
      expect(list[0].id).toBe("r2");
      expect(list[1].id).toBe("r3");
      expect(list[2].id).toBe("r1");

      // Garante que sentences e file não são incluídos no resumo
      expect((list[0] as unknown as { sentences?: unknown }).sentences).toBeUndefined();
      expect((list[0] as unknown as { file?: unknown }).file).toBeUndefined();
    });

    it("deve atualizar uma leitura existente e renovar o timestamp updatedAt", async () => {
      await saveReading(mockReading);

      const updated = await updateReading("test-reading-1", {
        title: "Título Renomeado",
        lastIndex: 1,
      });

      expect(updated).not.toBeNull();
      expect(updated?.title).toBe("Título Renomeado");
      expect(updated?.lastIndex).toBe(1);
      expect(updated?.updatedAt).toBeGreaterThan(1000);

      const fromDb = await getReading("test-reading-1");
      expect(fromDb?.title).toBe("Título Renomeado");
      expect(fromDb?.lastIndex).toBe(1);
    });

    it("deve retornar null ao tentar atualizar uma leitura inexistente", async () => {
      const result = await updateReading("fake-id", { title: "Novo" });
      expect(result).toBeNull();
    });

    it("deve deletar uma leitura do banco", async () => {
      await saveReading(mockReading);
      expect(await getReading("test-reading-1")).not.toBeNull();

      await deleteReading("test-reading-1");
      expect(await getReading("test-reading-1")).toBeNull();
    });
  });
});
