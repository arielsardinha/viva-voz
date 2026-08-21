/**
 * ViewModel MVVM para gerenciamento, filtragem, busca e manipulação da biblioteca de documentos.
 * Padrão: MVVM ViewModel.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DocumentFormat, DocumentMetadata } from "@/lib/domain/document.types";
import { DocumentProcessingFacade } from "@/lib/facade/document-processing.facade";
import {
  getAudioCacheStats,
  deleteAudioCacheByDocument,
  clearAllAudioCache as clearAllAudioCacheStore,
  type AudioCacheStats,
} from "@/lib/tts-audio-cache";

export const FORMAT_FILTER_TAGS = [
  "Todos",
  "PDF",
  "EPUB",
  "DOCX",
  "TXT",
  "MD",
  "Notas",
] as const;

export type FormatFilterTag = (typeof FORMAT_FILTER_TAGS)[number];

const FAVORITES_STORAGE_KEY = "vivavoz-favorites";

export function useLibrary(facade: DocumentProcessingFacade = DocumentProcessingFacade.getInstance()) {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"library" | "favorites">("library");
  const [activeFormat, setActiveFormat] = useState<FormatFilterTag>("Todos");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [audioCacheStats, setAudioCacheStats] = useState<AudioCacheStats>({
    totalBytes: 0,
    totalTracks: 0,
    byDocument: {},
  });

  const refresh = useCallback(async () => {
    try {
      const [list, cacheStats] = await Promise.all([
        facade.getRepository().list(),
        getAudioCacheStats(),
      ]);
      setDocuments(list);
      setAudioCacheStats(cacheStats);
    } finally {
      setIsLoading(false);
    }
  }, [facade]);

  useEffect(() => {
    void refresh();
    try {
      const saved = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || "[]");
      if (Array.isArray(saved)) setFavorites(saved);
    } catch {
      // Ignora erro de parse de localStorage
    }
  }, [refresh]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id];
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const renameDocument = useCallback(
    async (id: string, newTitle: string) => {
      const clean = newTitle.trim();
      if (!clean) return;
      await facade.renameDocument(id, clean);
      setEditingId(null);
      await refresh();
    },
    [facade, refresh]
  );

  const deleteDocument = useCallback(
    async (id: string) => {
      await facade.getRepository().delete(id);
      await deleteAudioCacheByDocument(id);
      setFavorites((prev) => {
        const next = prev.filter((f) => f !== id);
        try {
          localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
      await refresh();
    },
    [facade, refresh]
  );

  const deleteAudioCache = useCallback(
    async (id: string) => {
      await deleteAudioCacheByDocument(id);
      await refresh();
    },
    [refresh]
  );

  const clearAllAudioCache = useCallback(async () => {
    await clearAllAudioCacheStore();
    await refresh();
  }, [refresh]);

  const clearAllStorage = useCallback(async () => {
    for (const doc of documents) {
      await facade.getRepository().delete(doc.id);
    }
    await clearAllAudioCacheStore();
    setFavorites([]);
    try {
      localStorage.removeItem(FAVORITES_STORAGE_KEY);
    } catch {}
    await refresh();
  }, [documents, facade, refresh]);

  const downloadOriginal = useCallback(
    async (id: string) => {
      const doc = await facade.getRepository().getById(id);
      if (!doc || !doc.rawContentBlob) return;

      const url = URL.createObjectURL(doc.rawContentBlob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download =
        doc.metadata.originalFileName || `${doc.metadata.title}.${doc.metadata.format}`;
      anchor.click();
      URL.revokeObjectURL(url);
    },
    [facade]
  );

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Filtro por busca textual
      const matchesQuery =
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.author && doc.author.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!matchesQuery) return false;

      // Filtro por favoritos
      if (activeTab === "favorites" && !favorites.includes(doc.id)) {
        return false;
      }

      // Filtro por formato
      if (activeFormat !== "Todos") {
        if (activeFormat === "Notas" && doc.format === "paste") return true;
        if (doc.format.toUpperCase() !== activeFormat) return false;
      }

      return true;
    });
  }, [documents, searchQuery, activeTab, activeFormat, favorites]);

  const totalBytes = useMemo(
    () => documents.reduce((acc, doc) => acc + (doc.sizeBytes || 0), 0),
    [documents]
  );

  return {
    documents,
    filteredDocuments,
    isLoading,
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    activeFormat,
    setActiveFormat,
    favorites,
    toggleFavorite,
    editingId,
    setEditingId,
    draftTitle,
    setDraftTitle,
    renameDocument,
    deleteDocument,
    deleteAudioCache,
    clearAllAudioCache,
    clearAllStorage,
    downloadOriginal,
    refresh,
    totalBytes,
    audioCacheStats,
  };
}
