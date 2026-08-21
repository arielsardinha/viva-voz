"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { HighlightColor, TextHighlight } from "@/lib/domain/document-highlight.types";
import type { Sentence } from "@/lib/pdf-text";

const STORAGE_PREFIX = "vivavoz_highlights_";

function getStorageKey(docId: string | null): string {
  return `${STORAGE_PREFIX}${docId || "default"}`;
}

export function useDocumentHighlights(documentId: string | null) {
  const [highlights, setHighlights] = useState<TextHighlight[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Carrega do storage local ao trocar de documento
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const key = getStorageKey(documentId);
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setHighlights(parsed);
          setIsLoaded(true);
          return;
        }
      }
      setHighlights([]);
    } catch {
      setHighlights([]);
    } finally {
      setIsLoaded(true);
    }
  }, [documentId]);

  // Salva no storage local com suporte a updater funcional
  const persistHighlights = useCallback(
    (updater: TextHighlight[] | ((prev: TextHighlight[]) => TextHighlight[])) => {
      setHighlights((prev) => {
        const nextHighlights = typeof updater === "function" ? updater(prev) : updater;
        if (typeof window !== "undefined") {
          try {
            const key = getStorageKey(documentId);
            if (nextHighlights.length === 0) {
              localStorage.removeItem(key);
            } else {
              localStorage.setItem(key, JSON.stringify(nextHighlights));
            }
          } catch (err) {
            console.warn("Falha ao persistir destaques de texto:", err);
          }
        }
        return nextHighlights;
      });
    },
    [documentId]
  );

  // Mapeamento por sentença para acesso O(1)
  const highlightsBySentence = useMemo(() => {
    const map = new Map<number, TextHighlight[]>();
    for (const h of highlights) {
      const list = map.get(h.sentenceIndex) || [];
      list.push(h);
      map.set(h.sentenceIndex, list);
    }
    return map;
  }, [highlights]);

  const getHighlightsForSentence = useCallback(
    (sentenceIndex: number): TextHighlight[] => {
      return highlightsBySentence.get(sentenceIndex) || [];
    },
    [highlightsBySentence]
  );

  /**
   * Aplica marcação de cor ao trecho atualmente selecionado no DOM ou lista de sentenças
   */
  const applyHighlight = useCallback(
    (
      color: HighlightColor,
      customText?: string,
      container?: HTMLElement | null,
      sentences?: Sentence[]
    ): boolean => {
      if (typeof window === "undefined") return false;

      const selection = window.getSelection();
      const rawSelectedText = (selection && !selection.isCollapsed ? selection.toString() : customText || "").trim();

      if (!rawSelectedText || !sentences || sentences.length === 0) {
        return false;
      }

      const now = Date.now();
      const newItems: TextHighlight[] = [];

      // 1. Tenta identificar através dos nós do DOM com data-sentence-index
      let handledViaDom = false;
      if (selection && selection.rangeCount > 0 && container) {
        const sentenceElements = container.querySelectorAll<HTMLElement>("[data-sentence-index]");

        sentenceElements.forEach((el) => {
          const indexAttr = el.getAttribute("data-sentence-index");
          if (indexAttr === null) return;
          const sentenceIndex = parseInt(indexAttr, 10);
          if (isNaN(sentenceIndex) || !sentences[sentenceIndex]) return;

          // Verifica se o nó da sentença está dentro ou interceptado pelo Range
          if (selection.containsNode(el, true)) {
            handledViaDom = true;
            const fullSentenceText = sentences[sentenceIndex].text;

            let startOffset = 0;
            let endOffset = fullSentenceText.length;
            let highlightedText = fullSentenceText;

            if (rawSelectedText.length < fullSentenceText.length) {
              const foundIdx = fullSentenceText.indexOf(rawSelectedText);
              if (foundIdx !== -1) {
                startOffset = foundIdx;
                endOffset = foundIdx + rawSelectedText.length;
                highlightedText = rawSelectedText;
              }
            }

            newItems.push({
              id: `hl_${now}_${sentenceIndex}_${Math.random().toString(36).slice(2, 7)}`,
              documentId: documentId || undefined,
              sentenceIndex,
              startOffset,
              endOffset,
              text: highlightedText,
              color,
              createdAt: now,
            });
          }
        });
      }

      // 2. Fallback: Se não encontrou via DOM, busca por matching de texto nas sentenças
      if (!handledViaDom || newItems.length === 0) {
        for (const sentence of sentences) {
          if (sentence.text.includes(rawSelectedText) || rawSelectedText.includes(sentence.text)) {
            let startOffset = 0;
            let endOffset = sentence.text.length;
            let highlightedText = sentence.text;

            const foundIdx = sentence.text.indexOf(rawSelectedText);
            if (foundIdx !== -1) {
              startOffset = foundIdx;
              endOffset = foundIdx + rawSelectedText.length;
              highlightedText = rawSelectedText;
            }

            newItems.push({
              id: `hl_${now}_${sentence.index}_${Math.random().toString(36).slice(2, 7)}`,
              documentId: documentId || undefined,
              sentenceIndex: sentence.index,
              startOffset,
              endOffset,
              text: highlightedText,
              color,
              createdAt: now,
            });
          }
        }
      }

      if (newItems.length === 0) return false;

      // Remove marcações sobrepostas para evitar poluição visual e adiciona novas
      persistHighlights((prev) => {
        const targetIndices = new Set(newItems.map((n) => n.sentenceIndex));
        const remainingHighlights = prev.filter((h) => !targetIndices.has(h.sentenceIndex));
        return [...remainingHighlights, ...newItems];
      });

      return true;
    },
    [documentId, persistHighlights]
  );

  /**
   * Remove destaques das frases atualmente selecionadas
   */
  const removeHighlightsForSelection = useCallback(
    (customText?: string, container?: HTMLElement | null, sentences?: Sentence[]): boolean => {
      if (typeof window === "undefined") return false;

      const selection = window.getSelection();
      const rawSelectedText = (selection && !selection.isCollapsed ? selection.toString() : customText || "").trim();

      if (!rawSelectedText || !sentences || sentences.length === 0) {
        return false;
      }

      const indicesToRemove = new Set<number>();

      if (selection && selection.rangeCount > 0 && container) {
        const sentenceElements = container.querySelectorAll<HTMLElement>("[data-sentence-index]");
        sentenceElements.forEach((el) => {
          const indexAttr = el.getAttribute("data-sentence-index");
          if (indexAttr !== null && selection.containsNode(el, true)) {
            indicesToRemove.add(parseInt(indexAttr, 10));
          }
        });
      }

      if (indicesToRemove.size === 0) {
        for (const sentence of sentences) {
          if (sentence.text.includes(rawSelectedText) || rawSelectedText.includes(sentence.text)) {
            indicesToRemove.add(sentence.index);
          }
        }
      }

      if (indicesToRemove.size === 0) return false;

      persistHighlights((prev) => prev.filter((h) => !indicesToRemove.has(h.sentenceIndex)));
      return true;
    },
    [persistHighlights]
  );

  /**
   * Remove um destaque específico pelo ID
   */
  const removeHighlightById = useCallback(
    (id: string) => {
      persistHighlights((prev) => prev.filter((h) => h.id !== id));
    },
    [persistHighlights]
  );

  /**
   * Limpa todos os destaques do documento
   */
  const clearAllHighlights = useCallback(() => {
    persistHighlights([]);
  }, [persistHighlights]);

  return {
    highlights,
    isLoaded,
    getHighlightsForSentence,
    applyHighlight,
    removeHighlightsForSelection,
    removeHighlightById,
    clearAllHighlights,
  };
}
