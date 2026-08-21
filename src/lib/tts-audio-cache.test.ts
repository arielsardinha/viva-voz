import {
  saveCachedAudio,
  getCachedAudioBlob,
  getAudioCacheStats,
  deleteAudioCacheByDocument,
  clearAllAudioCache,
  buildAudioCacheKey,
} from "./tts-audio-cache";

describe("TTS Audio Cache (IndexedDB)", () => {
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

  it("deve salvar e recuperar um Blob de áudio no IndexedDB", async () => {
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
    expect(saved).toBe(true);

    const retrievedBlob = await getCachedAudioBlob("doc-1", "google", "Kore", "Frase de teste");
    expect(retrievedBlob).toBeTruthy();
  });

  it("não deve salvar áudios do motor 'system'", async () => {
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

  it("deve calcular estatísticas de uso de áudio e agrupar por documento", async () => {
    const blob1 = new Blob(["12345"], { type: "audio/wav" });
    const blob2 = new Blob(["1234567890"], { type: "audio/wav" });

    await saveCachedAudio({
      id: buildAudioCacheKey("doc-A", "google", "Kore", "Frase 1"),
      documentId: "doc-A",
      engine: "google",
      voice: "Kore",
      sentenceIndex: 0,
      text: "Frase 1",
      audioBlob: blob1,
      sizeBytes: blob1.size,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await saveCachedAudio({
      id: buildAudioCacheKey("doc-B", "google", "Kore", "Frase 2"),
      documentId: "doc-B",
      engine: "google",
      voice: "Kore",
      sentenceIndex: 0,
      text: "Frase 2",
      audioBlob: blob2,
      sizeBytes: blob2.size,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const stats = await getAudioCacheStats();
    expect(stats.totalTracks).toBe(2);
    expect(stats.totalBytes).toBe(blob1.size + blob2.size);
    expect(stats.byDocument["doc-A"]?.trackCount).toBe(1);
    expect(stats.byDocument["doc-A"]?.sizeBytes).toBe(blob1.size);
    expect(stats.byDocument["doc-B"]?.trackCount).toBe(1);
    expect(stats.byDocument["doc-B"]?.sizeBytes).toBe(blob2.size);
  });

  it("deve apagar apenas o cache de áudio de um documento específico", async () => {
    const blob = new Blob(["audio-bytes"], { type: "audio/wav" });

    await saveCachedAudio({
      id: buildAudioCacheKey("doc-to-keep", "google", "Kore", "Texto 1"),
      documentId: "doc-to-keep",
      engine: "google",
      voice: "Kore",
      sentenceIndex: 0,
      text: "Texto 1",
      audioBlob: blob,
      sizeBytes: blob.size,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await saveCachedAudio({
      id: buildAudioCacheKey("doc-to-delete", "google", "Kore", "Texto 2"),
      documentId: "doc-to-delete",
      engine: "google",
      voice: "Kore",
      sentenceIndex: 0,
      text: "Texto 2",
      audioBlob: blob,
      sizeBytes: blob.size,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await deleteAudioCacheByDocument("doc-to-delete");

    const stats = await getAudioCacheStats();
    expect(stats.totalTracks).toBe(1);
    expect(stats.byDocument["doc-to-delete"]).toBeUndefined();
    expect(stats.byDocument["doc-to-keep"]?.trackCount).toBe(1);
  });

  it("deve limpar todo o cache de áudio com clearAllAudioCache", async () => {
    const blob = new Blob(["audio-bytes"], { type: "audio/wav" });
    await saveCachedAudio({
      id: buildAudioCacheKey("doc-1", "google", "Kore", "Texto 1"),
      documentId: "doc-1",
      engine: "google",
      voice: "Kore",
      sentenceIndex: 0,
      text: "Texto 1",
      audioBlob: blob,
      sizeBytes: blob.size,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await clearAllAudioCache();
    const stats = await getAudioCacheStats();
    expect(stats.totalTracks).toBe(0);
    expect(stats.totalBytes).toBe(0);
  });
});
