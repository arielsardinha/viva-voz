/**
 * Persistência das leituras no navegador (IndexedDB).
 * Guarda o PDF original (Blob), o título editável e as frases extraídas.
 */
import type { Sentence } from "@/lib/pdf-text";

const DB_NAME = "pdf-audio-library";
const DB_VERSION = 2;
const STORE = "readings";
const PREFS_STORE = "preferences";
const PREFS_KEY = "app";

export interface Reading {
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
}

export type ReadingSummary = Omit<Reading, "sentences" | "file">;

export interface Preferences {
  engine: "system" | "google";
  voice: Record<string, string>;
  speed: string;
  lastReadingId: string | null;
  disabledEngines: string[];
}

export const DEFAULT_PREFERENCES: Preferences = {
  engine: "system",
  voice: {},
  speed: "1",
  lastReadingId: null,
  disabledEngines: [],
};

function openDb(): Promise<IDBDatabase> {
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
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function tx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
  storeName: string = STORE,
) {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const request = run(transaction.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

export async function getPreferences(): Promise<Preferences> {
  try {
    const stored = await tx<Preferences | undefined>(
      "readonly",
      (store) => store.get(PREFS_KEY),
      PREFS_STORE,
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

export async function savePreferences(patch: Partial<Preferences>) {
  const next = { ...(await getPreferences()), ...patch };
  await tx("readwrite", (store) => store.put(next, PREFS_KEY), PREFS_STORE);
  return next;
}

export function createReadingId() {
  return globalThis.crypto?.randomUUID?.() ?? `r_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export async function saveReading(reading: Reading) {
  await tx("readwrite", (store) => store.put(reading));
  return reading;
}

export async function getReading(id: string) {
  return (await tx<Reading | undefined>("readonly", (store) => store.get(id))) ?? null;
}

export async function listReadings(): Promise<ReadingSummary[]> {
  const all = await tx<Reading[]>("readonly", (store) => store.getAll());
  return all
    .map(({ sentences: _sentences, file: _file, ...rest }) => rest)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function updateReading(id: string, patch: Partial<Reading>) {
  const current = await getReading(id);
  if (!current) return null;
  const next = { ...current, ...patch, id, updatedAt: Date.now() };
  await saveReading(next);
  return next;
}

export async function deleteReading(id: string) {
  await tx("readwrite", (store) => store.delete(id));
}
