"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { DocumentNote, NoteColor } from "@/lib/domain/document-note.types";

const STORAGE_PREFIX = "vivavoz_notes_";

function getStorageKey(docId: string | null): string {
  return `${STORAGE_PREFIX}${docId || "default"}`;
}

export interface CreateNoteInput {
  sentenceIndex: number;
  selectedText: string;
  content: string;
  title?: string;
  color?: NoteColor;
  page?: number;
}

export function useDocumentNotes(documentId: string | null) {
  const [notes, setNotes] = useState<DocumentNote[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Carrega do storage local ao alternar documento
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const key = getStorageKey(documentId);
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setNotes(parsed);
          setIsLoaded(true);
          return;
        }
      }
      setNotes([]);
    } catch {
      setNotes([]);
    } finally {
      setIsLoaded(true);
    }
  }, [documentId]);

  // Persistência com updater funcional atômico
  const persistNotes = useCallback(
    (updater: DocumentNote[] | ((prev: DocumentNote[]) => DocumentNote[])) => {
      setNotes((prev) => {
        const nextNotes = typeof updater === "function" ? updater(prev) : updater;
        if (typeof window !== "undefined") {
          try {
            const key = getStorageKey(documentId);
            if (nextNotes.length === 0) {
              localStorage.removeItem(key);
            } else {
              localStorage.setItem(key, JSON.stringify(nextNotes));
            }
          } catch (err) {
            console.warn("Falha ao persistir anotações:", err);
          }
        }
        return nextNotes;
      });
    },
    [documentId]
  );

  // Mapeamento por sentença para acesso O(1)
  const notesBySentence = useMemo(() => {
    const map = new Map<number, DocumentNote[]>();
    for (const note of notes) {
      const list = map.get(note.sentenceIndex) || [];
      list.push(note);
      map.set(note.sentenceIndex, list);
    }
    return map;
  }, [notes]);

  const getNotesForSentence = useCallback(
    (sentenceIndex: number): DocumentNote[] => {
      return notesBySentence.get(sentenceIndex) || [];
    },
    [notesBySentence]
  );

  const addNote = useCallback(
    (input: CreateNoteInput): DocumentNote => {
      const now = Date.now();
      const newNote: DocumentNote = {
        id: `note_${now}_${Math.random().toString(36).slice(2, 7)}`,
        documentId: documentId || undefined,
        sentenceIndex: input.sentenceIndex,
        selectedText: input.selectedText.trim(),
        title: input.title?.trim() || undefined,
        content: input.content.trim(),
        color: input.color || "amber",
        page: input.page,
        createdAt: now,
        updatedAt: now,
      };

      persistNotes((prev) => [newNote, ...prev]);
      return newNote;
    },
    [documentId, persistNotes]
  );

  const updateNote = useCallback(
    (id: string, patch: Partial<Omit<DocumentNote, "id" | "createdAt">>) => {
      const now = Date.now();
      persistNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: now } : n))
      );
    },
    [persistNotes]
  );

  const deleteNote = useCallback(
    (id: string) => {
      persistNotes((prev) => prev.filter((n) => n.id !== id));
    },
    [persistNotes]
  );

  const clearAllNotes = useCallback(() => {
    persistNotes([]);
  }, [persistNotes]);

  return {
    notes,
    isLoaded,
    getNotesForSentence,
    addNote,
    updateNote,
    deleteNote,
    clearAllNotes,
  };
}
