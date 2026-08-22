import {
  saveCachedAudio,
  getCachedAudioBlob,
  getAudioCacheStats,
  deleteAudioCacheByDocument,
  clearAllAudioCache,
  buildAudioCacheKey,
} from "./tts-audio-cache";

describe("TTS Audio Cache (IndexedDB) - Arquitetura Cloud-Only", () => {
  beforeEach(async () => {
    await clearAllAudioCache();
  });

  it("deve gerar a chave de cache correta com documentId", () => {
    const key = buildAudioCacheKey("doc-123", "google", "Kore", "Olá mundo");
    expect(key).toBe("doc-123::google::Kore::Olá mundo");
  });

  it("deve gerar chave de cache com 'general' quando documentId for nulo ou vazio", () => {
    const key = buildAudioCacheKey(null, "google", "Kore", "Texto sem doc");
    expect(key).toBe("general::google::Kore::Texto sem doc");
  });

  it("NUNCA deve salvar áudios TTS no IndexedDB (deve retornar false)", async () => {
    const fakeBlob = new Blob(["audio-data-wav-123"], { type: "audio/wav" });
    const track = {
      id: buildAudioCacheKey("doc-1", "google", "Kore", "Frase de teste"),
      documentId: "doc-1",
      engine: "google" as const,
      voice: "Kore",
      sentenceIndex: 0,
      text: "Frase de teste",
      audioBlob: fakeBlob,
      sizeBytes: fakeBlob.size,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const saved = await saveCachedAudio(track);
    expect(saved).toBe(false);

    const retrievedBlob = await getCachedAudioBlob("doc-1", "google", "Kore", "Frase de teste");
    expect(retrievedBlob).toBeNull();
  });

  it("não deve recuperar áudios do motor 'system' e retornar null", async () => {
    const fakeBlob = new Blob(["system-audio"], { type: "audio/wav" });
    const track = {
      id: buildAudioCacheKey("doc-1", "system", "default", "Frase do sistema"),
      documentId: "doc-1",
      engine: "system" as const,
      voice: "default",
      sentenceIndex: 0,
      text: "Frase do sistema",
      audioBlob: fakeBlob,
      sizeBytes: fakeBlob.size,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const saved = await saveCachedAudio(track);
    expect(saved).toBe(false);

    const retrieved = await getCachedAudioBlob("doc-1", "system", "default", "Frase do sistema");
    expect(retrieved).toBeNull();
  });

  it("deve retornar estatísticas zeradas quando não houver áudios", async () => {
    const stats = await getAudioCacheStats();
    expect(stats.totalTracks).toBe(0);
    expect(stats.totalBytes).toBe(0);
    expect(Object.keys(stats.byDocument).length).toBe(0);
  });

  it("deve executar deleteAudioCacheByDocument sem erros", async () => {
    await expect(deleteAudioCacheByDocument("doc-to-delete")).resolves.not.toThrow();
  });

  it("deve limpar todo o cache de áudio com clearAllAudioCache sem erros", async () => {
    await expect(clearAllAudioCache()).resolves.not.toThrow();
    const stats = await getAudioCacheStats();
    expect(stats.totalTracks).toBe(0);
    expect(stats.totalBytes).toBe(0);
  });
});

