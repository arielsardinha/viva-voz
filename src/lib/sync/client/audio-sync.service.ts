/**
 * Serviço de Empacotamento e Desempacotamento de Áudios TTS no Cliente.
 * Permite serializar e desserializar múltiplos Blobs de áudio em um único buffer binário.
 */
import {
  openAudioCacheDb,
  AUDIO_CACHE_STORE,
  CachedAudioTrack,
  saveCachedAudio,
} from "@/lib/tts-audio-cache";
import type { AudioPackageHeader, AudioTrackMetadata } from "../domain/sync.types";

export class AudioSyncService {
  /**
   * Coleta todas as faixas de áudio sintetizadas de um documento e as empacota em um único ArrayBuffer.
   */
  public static async packDocumentAudios(documentId: string): Promise<{ buffer: ArrayBuffer; trackCount: number }> {
    const db = await openAudioCacheDb();

    const tracks: CachedAudioTrack[] = await new Promise((resolve, reject) => {
      const tx = db.transaction(AUDIO_CACHE_STORE, "readonly");
      const store = tx.objectStore(AUDIO_CACHE_STORE);
      const docIndex = store.index("documentId");
      const request = docIndex.getAll(documentId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    if (tracks.length === 0) {
      return { buffer: new ArrayBuffer(0), trackCount: 0 };
    }

    // Lê os buffers de todos os blobs
    const audioBuffers: ArrayBuffer[] = [];
    const trackMetas: AudioTrackMetadata[] = [];
    let totalAudioBytes = 0;

    for (const track of tracks) {
      const arrayBuf = await track.audioBlob.arrayBuffer();
      audioBuffers.push(arrayBuf);
      trackMetas.push({
        id: track.id,
        documentId: track.documentId,
        engine: track.engine,
        voice: track.voice,
        sentenceIndex: track.sentenceIndex,
        text: track.text,
        sizeBytes: arrayBuf.byteLength,
      });
      totalAudioBytes += arrayBuf.byteLength;
    }

    const header: AudioPackageHeader = {
      documentId,
      trackCount: tracks.length,
      totalSizeBytes: totalAudioBytes,
      createdAt: Date.now(),
      tracks: trackMetas,
    };

    const headerJson = JSON.stringify(header);
    const encoder = new TextEncoder();
    const headerBytes = encoder.encode(headerJson);
    const headerLen = headerBytes.byteLength;

    // Estrutura do buffer final: [4 bytes headerLength] + [headerBytes] + [audioBuffers...]
    const totalPackageSize = 4 + headerLen + totalAudioBytes;
    const finalBuffer = new Uint8Array(totalPackageSize);
    const view = new DataView(finalBuffer.buffer);

    // Escreve comprimento do header (Uint32)
    view.setUint32(0, headerLen, false);

    // Escreve bytes do header
    finalBuffer.set(headerBytes, 4);

    // Escreve cada chunk de áudio em sequência
    let offset = 4 + headerLen;
    for (const audioBuf of audioBuffers) {
      finalBuffer.set(new Uint8Array(audioBuf), offset);
      offset += audioBuf.byteLength;
    }

    return {
      buffer: finalBuffer.buffer,
      trackCount: tracks.length,
    };
  }

  /**
   * Desempacota um ArrayBuffer consolidado e salva todas as faixas de áudio de volta no IndexedDB.
   */
  public static async unpackAndSaveAudios(packageBuffer: ArrayBuffer): Promise<number> {
    if (packageBuffer.byteLength < 4) return 0;

    const view = new DataView(packageBuffer);
    const headerLen = view.getUint32(0, false);

    if (packageBuffer.byteLength < 4 + headerLen) {
      throw new Error("Pacote de áudio corrompido: cabeçalho truncado.");
    }

    const headerBytes = new Uint8Array(packageBuffer, 4, headerLen);
    const decoder = new TextDecoder();
    const headerJson = decoder.decode(headerBytes);
    const header: AudioPackageHeader = JSON.parse(headerJson);

    let currentOffset = 4 + headerLen;
    let savedCount = 0;

    for (const trackMeta of header.tracks) {
      if (currentOffset + trackMeta.sizeBytes > packageBuffer.byteLength) {
        throw new Error("Pacote de áudio corrompido: dados de áudio truncados.");
      }

      const audioSlice = packageBuffer.slice(currentOffset, currentOffset + trackMeta.sizeBytes);
      const audioBlob = new Blob([audioSlice], { type: "audio/wav" });

      const track: CachedAudioTrack = {
        id: trackMeta.id,
        documentId: trackMeta.documentId,
        engine: trackMeta.engine as any,
        voice: trackMeta.voice,
        sentenceIndex: trackMeta.sentenceIndex,
        text: trackMeta.text,
        audioBlob,
        sizeBytes: trackMeta.sizeBytes,
        createdAt: header.createdAt,
        updatedAt: Date.now(),
      };

      await saveCachedAudio(track);
      savedCount++;
      currentOffset += trackMeta.sizeBytes;
    }

    return savedCount;
  }
}
