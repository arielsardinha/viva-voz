/**
 * Testes unitários para SyncMergerService.
 */
import { SyncMergerService } from "./sync-merger.service";
import { IndexedDbLibraryRepository } from "@/lib/repository/library.repository";
import type { SyncManifest } from "../domain/sync.types";

jest.mock("@/lib/repository/library.repository");

describe("SyncMergerService", () => {
  let mockRepo: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo = {
      savePreferences: jest.fn().mockResolvedValue({}),
      getById: jest.fn(),
      save: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    };
    (IndexedDbLibraryRepository.getInstance as jest.Mock).mockReturnValue(mockRepo);
  });

  it("deve importar novos documentos que não existem localmente", async () => {
    mockRepo.getById.mockResolvedValue(null);

    const remoteManifest: SyncManifest = {
      meta: { version: "1.0.0", appVersion: "0.1.0", createdAt: Date.now(), deviceId: "d1" },
      preferences: {
        engine: "google",
        voice: { google: "Kore" },
        speed: "1.2",
        lastReadingId: null,
        disabledEngines: [],
      },
      readings: [
        {
          id: "doc_1",
          title: "Livro 1",
          fileName: "livro1.pdf",
          size: 1024,
          pageCount: 10,
          sentences: [{ index: 0, text: "Olá mundo", page: 1 }],
          createdAt: 1000,
          updatedAt: 2000,
          lastIndex: 5,
        },
      ],
    };

    const result = await SyncMergerService.merge(remoteManifest);

    expect(result.importedDocumentsCount).toBe(1);
    expect(result.updatedDocumentsCount).toBe(0);
    expect(result.preferencesUpdated).toBe(true);
    expect(mockRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "doc_1",
        metadata: expect.objectContaining({ title: "Livro 1" }),
      })
    );
    expect(mockRepo.savePreferences).toHaveBeenCalledWith({
      engine: "google",
      voice: { google: "Kore" },
      speed: "1.2",
      disabledEngines: [],
    });
  });

  it("deve atualizar o progresso de leitura se a versão remota for mais avançada", async () => {
    mockRepo.getById.mockResolvedValue({
      id: "doc_1",
      metadata: {
        id: "doc_1",
        title: "Livro 1",
        updatedAt: 1000,
      },
      lastSentenceIndex: 2, // local está na frase 2
    });

    const remoteManifest: SyncManifest = {
      meta: { version: "1.0.0", appVersion: "0.1.0", createdAt: Date.now(), deviceId: "d1" },
      preferences: {
        engine: "system",
        voice: {},
        speed: "1",
        lastReadingId: null,
        disabledEngines: [],
      },
      readings: [
        {
          id: "doc_1",
          title: "Livro 1",
          fileName: "livro1.pdf",
          size: 1024,
          pageCount: 10,
          sentences: [],
          createdAt: 1000,
          updatedAt: 1000,
          lastIndex: 8, // remoto está na frase 8
        },
      ],
    };

    const result = await SyncMergerService.merge(remoteManifest);

    expect(result.importedDocumentsCount).toBe(0);
    expect(result.updatedDocumentsCount).toBe(1);
    expect(mockRepo.update).toHaveBeenCalledWith("doc_1", expect.objectContaining({ lastSentenceIndex: 8 }));
  });

  it("não deve retroceder o progresso se o local estiver mais avançado", async () => {
    mockRepo.getById.mockResolvedValue({
      id: "doc_1",
      metadata: {
        id: "doc_1",
        title: "Livro 1",
        updatedAt: 3000,
      },
      lastSentenceIndex: 10, // local está mais avançado
    });

    const remoteManifest: SyncManifest = {
      meta: { version: "1.0.0", appVersion: "0.1.0", createdAt: Date.now(), deviceId: "d1" },
      preferences: {
        engine: "system",
        voice: {},
        speed: "1",
        lastReadingId: null,
        disabledEngines: [],
      },
      readings: [
        {
          id: "doc_1",
          title: "Livro 1",
          fileName: "livro1.pdf",
          size: 1024,
          pageCount: 10,
          sentences: [],
          createdAt: 1000,
          updatedAt: 2000,
          lastIndex: 4, // remoto está atrasado
        },
      ],
    };

    const result = await SyncMergerService.merge(remoteManifest);

    expect(result.updatedDocumentsCount).toBe(0);
    expect(mockRepo.update).not.toHaveBeenCalled();
  });
});
