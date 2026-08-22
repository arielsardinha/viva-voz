/**
 * Construtor do manifesto de sincronização a partir do IndexedDB local.
 */
import { IndexedDbLibraryRepository } from "@/lib/repository/library.repository";
import { READER_SETTINGS_STORAGE, ReaderSettings } from "@/context/reader-settings-context";
import type { SyncManifest, ManifestReadingItem } from "../domain/sync.types";

const DEVICE_ID_KEY = "vivavoz_device_id";

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "server-device-id";
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = "device_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function getLocalReaderSettings(): ReaderSettings | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(READER_SETTINGS_STORAGE);
    if (raw) {
      return JSON.parse(raw) as ReaderSettings;
    }
  } catch {}
  return undefined;
}

export class SyncManifestBuilder {
  public static async build(): Promise<SyncManifest> {
    const repo = IndexedDbLibraryRepository.getInstance();
    const prefs = await repo.getPreferences();
    const documentMetaList = await repo.list();

    // Carrega cada documento completo para capturar frases e capítulos
    const readings: ManifestReadingItem[] = [];

    for (const meta of documentMetaList) {
      const doc = await repo.getById(meta.id);
      if (!doc) continue;

      readings.push({
        id: doc.id,
        title: doc.metadata.title,
        fileName: doc.metadata.originalFileName || `${doc.metadata.title}.${doc.metadata.format}`,
        size: doc.metadata.sizeBytes,
        pageCount: doc.metadata.pageCount || 1,
        sentences: doc.sentences.map((s) => ({
          index: s.index,
          page: s.page,
          text: s.text,
        })),
        createdAt: doc.metadata.createdAt,
        updatedAt: doc.metadata.updatedAt,
        lastIndex: doc.lastSentenceIndex,
        format: doc.metadata.format,
        author: doc.metadata.author,
        wordCount: doc.metadata.wordCount,
        estimatedReadingMinutes: doc.metadata.estimatedReadingMinutes,
        chapters: doc.chapters && doc.chapters.length > 0 ? doc.chapters.map((c) => ({
          id: c.id,
          title: c.title,
          startIndex: c.startIndex,
          endIndex: c.endIndex,
          pageNumber: c.pageNumber,
        })) : undefined,
      });
    }

    return {
      meta: {
        version: "1.0.0",
        appVersion: "0.1.0",
        createdAt: Date.now(),
        deviceId: getOrCreateDeviceId(),
      },
      preferences: {
        engine: prefs.engine,
        voice: prefs.voice,
        speed: prefs.speed,
        lastReadingId: prefs.lastReadingId,
        disabledEngines: prefs.disabledEngines,
        readerSettings: getLocalReaderSettings(),
      },
      readings,
    };
  }
}
