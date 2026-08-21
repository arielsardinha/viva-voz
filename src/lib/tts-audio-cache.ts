/**
 * Persistência e gerenciamento de cache de áudios de IA no IndexedDB.
 * Permite que os áudios gerados pelo Google Gemini TTS fiquem gravados
 * de forma permanente no dispositivo do usuário, agrupados por documento.
 */
import type { TtsEngine } from "./tts-engines";

export const AUDIO_CACHE_DB_NAME = "pdf-audio-library";
export const AUDIO_CACHE_DB_VERSION = 3;
export const AUDIO_CACHE_STORE = "tts_audio_cache";

export interface CachedAudioTrack {
  /** Chave única: `${documentId || 'general'}::${engine}::${voice}::${text}` */
  id: string;
  /** ID do documento ao qual o áudio pertence */
  documentId: string;
  /** Motor de narração (apenas motores de IA como 'google') */
  engine: TtsEngine;
  /** Voz utilizada na síntese (ex: 'Kore') */
  voice: string;
  /** Índice da frase no documento */
  sentenceIndex: number;
  /** Conteúdo textual da frase */
  text: string;
  /** Áudio binário em formato Blob */
  audioBlob: Blob;
  /** Tamanho do áudio em bytes */
  sizeBytes: number;
  /** Timestamp de criação */
  createdAt: number;
  /** Timestamp de última utilização */
  updatedAt: number;
}

export interface DocumentAudioCacheSummary {
  sizeBytes: number;
  trackCount: number;
}

export interface AudioCacheStats {
  totalBytes: number;
  totalTracks: number;
  byDocument: Record<string, DocumentAudioCacheSummary>;
}

export function buildAudioCacheKey(
  documentId: string | null | undefined,
  engine: string,
  voice: string,
  text: string,
): string {
  const docKey = documentId && documentId.trim().length > 0 ? documentId.trim() : "general";
  return `${docKey}::${engine}::${voice}::${text.trim()}`;
}

export function openAudioCacheDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB não está disponível neste ambiente."));
      return;
    }

    const request = indexedDB.open(AUDIO_CACHE_DB_NAME, AUDIO_CACHE_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      // Garante que o store de readings exista
      if (!db.objectStoreNames.contains("readings")) {
        db.createObjectStore("readings", { keyPath: "id" }).createIndex("updatedAt", "updatedAt");
      }
      // Garante que o store de preferences exista
      if (!db.objectStoreNames.contains("preferences")) {
        db.createObjectStore("preferences");
      }
      // Cria ou atualiza o store de áudios em cache
      if (!db.objectStoreNames.contains(AUDIO_CACHE_STORE)) {
        const store = db.createObjectStore(AUDIO_CACHE_STORE, { keyPath: "id" });
        store.createIndex("documentId", "documentId", { unique: false });
        store.createIndex("engine", "engine", { unique: false });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function audioTx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openAudioCacheDb();
  return new Promise<T>((resolve, reject) => {
    try {
      const transaction = db.transaction(AUDIO_CACHE_STORE, mode);
      const request = run(transaction.objectStore(AUDIO_CACHE_STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => db.close();
      transaction.onerror = () => {
        try {
          db.close();
        } catch {}
        reject(transaction.error);
      };
    } catch (err) {
      try {
        db.close();
      } catch {}
      reject(err);
    }
  });
}

/**
 * Salva uma faixa de áudio de IA no IndexedDB.
 * Em caso de falha (ex: QuotaExceededError), não interrompe a execução (fallback transparente).
 */
export async function saveCachedAudio(track: CachedAudioTrack): Promise<boolean> {
  // Apenas áudios gerados por IA devem ser cacheados
  if (track.engine === "system") return false;

  try {
    await audioTx("readwrite", (store) => store.put(track));
    return true;
  } catch (error) {
    console.warn("Aviso: Falha ao persistir áudio no IndexedDB (usando fallback em memória):", error);
    return false;
  }
}

/**
 * Obtém o Blob de áudio em cache para o trecho correspondente.
 */
export async function getCachedAudioBlob(
  documentId: string | null | undefined,
  engine: TtsEngine,
  voice: string,
  text: string,
): Promise<Blob | null> {
  if (engine === "system") return null;

  try {
    const key = buildAudioCacheKey(documentId, engine, voice, text);
    const item = await audioTx<CachedAudioTrack | undefined>("readonly", (store) => store.get(key));
    if (!item || !item.audioBlob) return null;

    // Atualiza updatedAt de forma assíncrona
    void audioTx("readwrite", (store) => {
      item.updatedAt = Date.now();
      return store.put(item);
    }).catch(() => undefined);

    if (item.audioBlob instanceof Blob) {
      return item.audioBlob;
    }
    return new Blob([item.audioBlob as BlobPart], { type: "audio/wav" });
  } catch {
    return null;
  }
}

/**
 * Calcula o uso total de cache de áudio e agrega por documento.
 */
export async function getAudioCacheStats(): Promise<AudioCacheStats> {
  const result: AudioCacheStats = {
    totalBytes: 0,
    totalTracks: 0,
    byDocument: {},
  };

  try {
    const all = await audioTx<CachedAudioTrack[]>("readonly", (store) => store.getAll());
    if (!Array.isArray(all)) return result;

    for (const track of all) {
      const bytes = track.sizeBytes || track.audioBlob?.size || 0;
      const docId = track.documentId || "general";

      result.totalBytes += bytes;
      result.totalTracks += 1;

      if (!result.byDocument[docId]) {
        result.byDocument[docId] = { sizeBytes: 0, trackCount: 0 };
      }
      result.byDocument[docId].sizeBytes += bytes;
      result.byDocument[docId].trackCount += 1;
    }

    return result;
  } catch {
    return result;
  }
}

/**
 * Apaga todas as faixas de áudio associadas a um documento específico.
 */
export async function deleteAudioCacheByDocument(documentId: string): Promise<void> {
  if (!documentId) return;

  try {
    const db = await openAudioCacheDb();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(AUDIO_CACHE_STORE, "readwrite");
      const store = transaction.objectStore(AUDIO_CACHE_STORE);
      const index = store.index("documentId");
      const request = index.openCursor(IDBKeyRange.only(documentId));

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.warn(`Aviso: Erro ao deletar cache de áudio do documento ${documentId}:`, error);
  }
}

/**
 * Apaga todo o cache de áudio salvo no IndexedDB.
 */
export async function clearAllAudioCache(): Promise<void> {
  try {
    await audioTx("readwrite", (store) => store.clear());
  } catch (error) {
    console.warn("Aviso: Erro ao limpar todo o cache de áudio:", error);
  }
}
