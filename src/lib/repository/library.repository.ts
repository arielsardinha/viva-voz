/**
 * Repositório universal de documentos e preferências do leitor no navegador (IndexedDB).
 * Padrão: GoF Repository Pattern — Garante 100% de retrocompatibilidade com o schema existente.
 */
import {
  DEFAULT_PREFERENCES,
  Preferences,
  createReadingId,
} from "@/lib/library-db";
import type { Sentence } from "@/lib/pdf-text";
import type {
  DocumentChapter,
  DocumentFormat,
  DocumentMetadata,
  ParsedDocument,
} from "@/lib/domain/document.types";
import { deleteAudioCacheByDocument, AUDIO_CACHE_STORE } from "@/lib/tts-audio-cache";
import { notifyLibraryChanged } from "@/lib/sync/client/sync-events";

const DB_NAME = "pdf-audio-library";
const DB_VERSION = 3;
const STORE = "readings";
const PREFS_STORE = "preferences";
const PREFS_KEY = "app";

export interface StoredReadingEntity {
  id: string;
  title: string;
  fileName: string;
  size: number;
  pageCount: number;
  sentences: Sentence[];
  file: Blob;
  createdAt: number;
  updatedAt: number;
  lastIndex: number;
  // Campos estendidos para multi-documentos
  format?: DocumentFormat;
  author?: string;
  wordCount?: number;
  estimatedReadingMinutes?: number;
  chapters?: DocumentChapter[];
}

export interface ILibraryRepository {
  save(document: ParsedDocument): Promise<ParsedDocument>;
  getById(id: string): Promise<ParsedDocument | null>;
  list(): Promise<DocumentMetadata[]>;
  update(id: string, patch: Partial<ParsedDocument>): Promise<ParsedDocument | null>;
  delete(id: string): Promise<void>;
  getPreferences(): Promise<Preferences>;
  savePreferences(patch: Partial<Preferences>): Promise<Preferences>;
}

/**
 * Número máximo de documentos mantidos no IndexedDB (offline-first LRU).
 * Quando excedido, os mais antigos (por updatedAt) são removidos automaticamente.
 * @see armazenamento-dados-local-cloud.md
 */
export const MAX_CACHED_DOCUMENTS = 20;

export class IndexedDbLibraryRepository implements ILibraryRepository {
  private static instance: IndexedDbLibraryRepository;

  public static getInstance(): IndexedDbLibraryRepository {
    if (!IndexedDbLibraryRepository.instance) {
      IndexedDbLibraryRepository.instance = new IndexedDbLibraryRepository();
    }
    return IndexedDbLibraryRepository.instance;
  }

  private openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id" }).createIndex("updatedAt", "updatedAt");
        }
        if (!db.objectStoreNames.contains(PREFS_STORE)) {
          db.createObjectStore(PREFS_STORE);
        }
        if (!db.objectStoreNames.contains(AUDIO_CACHE_STORE)) {
          const audioStore = db.createObjectStore(AUDIO_CACHE_STORE, { keyPath: "id" });
          audioStore.createIndex("documentId", "documentId", { unique: false });
          audioStore.createIndex("engine", "engine", { unique: false });
          audioStore.createIndex("updatedAt", "updatedAt", { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async tx<T>(
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => IDBRequest<T>,
    storeName: string = STORE
  ): Promise<T> {
    const db = await this.openDb();
    return new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const request = run(transaction.objectStore(storeName));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => db.close();
    });
  }

  public async save(doc: ParsedDocument): Promise<ParsedDocument> {
    const entity: StoredReadingEntity = {
      id: doc.id,
      title: doc.metadata.title,
      fileName: doc.metadata.originalFileName || `${doc.metadata.title}.${doc.metadata.format}`,
      size: doc.metadata.sizeBytes,
      pageCount: doc.metadata.pageCount || 1,
      sentences: doc.sentences,
      file: doc.rawContentBlob || new Blob([doc.sentences.map((s) => s.text).join(" ")], { type: "text/plain" }),
      createdAt: doc.metadata.createdAt,
      updatedAt: doc.metadata.updatedAt,
      lastIndex: doc.lastSentenceIndex,
      format: doc.metadata.format,
      author: doc.metadata.author,
      wordCount: doc.metadata.wordCount,
      estimatedReadingMinutes: doc.metadata.estimatedReadingMinutes,
      chapters: doc.chapters,
    };

    await this.tx("readwrite", (store) => store.put(entity));
    notifyLibraryChanged("save_document");

    // Eviction LRU: remove documentos mais antigos se exceder o limite
    await this.evictOldDocuments();

    return doc;
  }

  /**
   * Remove os documentos mais antigos (por updatedAt) quando o IndexedDB excede MAX_CACHED_DOCUMENTS.
   * Operação transparente — não impacta a experiência do usuário.
   * Documentos removidos permanecem acessíveis na nuvem (se sincronizados).
   */
  private async evictOldDocuments(): Promise<void> {
    try {
      const all = await this.tx<StoredReadingEntity[]>("readonly", (store) => store.getAll());
      if (all.length <= MAX_CACHED_DOCUMENTS) return;

      // Ordena por updatedAt ASC (mais antigo primeiro)
      const sorted = [...all].sort((a, b) => a.updatedAt - b.updatedAt);
      const toRemove = sorted.slice(0, all.length - MAX_CACHED_DOCUMENTS);

      for (const entity of toRemove) {
        await this.tx("readwrite", (store) => store.delete(entity.id));
        void deleteAudioCacheByDocument(entity.id);
      }

      if (toRemove.length > 0) {
        notifyLibraryChanged("evict_old_documents");
      }
    } catch {
      // Silencioso — eviction não deve impactar a operação principal
    }
  }

  public async getById(id: string): Promise<ParsedDocument | null> {
    const entity = await this.tx<StoredReadingEntity | undefined>("readonly", (store) => store.get(id));
    if (!entity) return null;

    const detectedFormat: DocumentFormat =
      entity.format ||
      (entity.fileName.endsWith(".epub")
        ? "epub"
        : entity.fileName.endsWith(".docx")
        ? "docx"
        : entity.fileName.endsWith(".odt")
        ? "odt"
        : "pdf");

    const chapters: DocumentChapter[] =
      entity.chapters && entity.chapters.length > 0
        ? entity.chapters
        : [
            {
              id: "chap_default",
              title: "Início",
              startIndex: 0,
              endIndex: Math.max(0, entity.sentences.length - 1),
              pageNumber: 1,
            },
          ];

    const metadata: DocumentMetadata = {
      id: entity.id,
      title: entity.title,
      author: entity.author,
      format: detectedFormat,
      originalFileName: entity.fileName,
      sizeBytes: entity.size,
      wordCount: entity.wordCount || entity.sentences.reduce((acc, s) => acc + s.text.split(/\s+/).length, 0),
      estimatedReadingMinutes: entity.estimatedReadingMinutes || Math.max(1, Math.ceil(entity.pageCount * 1.5)),
      pageCount: entity.pageCount,
      chapterCount: chapters.length,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };

    return {
      id: entity.id,
      metadata,
      chapters,
      sentences: entity.sentences,
      rawContentBlob: entity.file,
      lastSentenceIndex: entity.lastIndex || 0,
    };
  }

  public async list(): Promise<DocumentMetadata[]> {
    const all = await this.tx<StoredReadingEntity[]>("readonly", (store) => store.getAll());
    return all
      .map((entity) => {
        const detectedFormat: DocumentFormat =
          entity.format ||
          (entity.fileName.endsWith(".epub")
            ? "epub"
            : entity.fileName.endsWith(".docx")
            ? "docx"
            : entity.fileName.endsWith(".odt")
            ? "odt"
            : "pdf");
        const chapterCount = entity.chapters?.length || 1;
        return {
          id: entity.id,
          title: entity.title,
          author: entity.author,
          format: detectedFormat,
          originalFileName: entity.fileName,
          sizeBytes: entity.size,
          wordCount: entity.wordCount || 0,
          estimatedReadingMinutes: entity.estimatedReadingMinutes || Math.max(1, Math.ceil(entity.pageCount * 1.5)),
          pageCount: entity.pageCount,
          chapterCount,
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt,
        };
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  public async update(id: string, patch: Partial<ParsedDocument>): Promise<ParsedDocument | null> {
    const current = await this.getById(id);
    if (!current) return null;

    const next: ParsedDocument = {
      ...current,
      ...patch,
      id,
      metadata: {
        ...current.metadata,
        ...(patch.metadata || {}),
        updatedAt: Date.now(),
      },
    };

    await this.save(next);
    return next;
  }

  public async delete(id: string): Promise<void> {
    await this.tx("readwrite", (store) => store.delete(id));
    void deleteAudioCacheByDocument(id);
    notifyLibraryChanged("delete_document");
  }

  public async getPreferences(): Promise<Preferences> {
    try {
      const stored = await this.tx<Preferences | undefined>(
        "readonly",
        (store) => store.get(PREFS_KEY),
        PREFS_STORE
      );
      const prefs = { ...DEFAULT_PREFERENCES, ...(stored ?? {}) };
      if (prefs.engine !== "system" && prefs.engine !== "google") {
        prefs.engine = "system";
      }
      return prefs;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  }

  public async savePreferences(patch: Partial<Preferences>): Promise<Preferences> {
    const next = { ...(await this.getPreferences()), ...patch };
    await this.tx("readwrite", (store) => store.put(next, PREFS_KEY), PREFS_STORE);
    notifyLibraryChanged("save_preferences");
    return next;
  }
}
