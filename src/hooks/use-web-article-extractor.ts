/**
 * ViewModel: useWebArticleExtractor
 * Encapsula o estado de validação de URL, requisição ao /api/extract-url e feedback visual.
 * Padrão: MVVM ViewModel — Custom Hook React.
 */
"use client";

import { useCallback, useState } from "react";
import type { ParsedDocument } from "@/lib/domain/document.types";


export interface WebArticlePreview {
  title: string;
  byline?: string;
  siteUrl: string;
  wordCount: number;
  estimatedMinutes: number;
}

export type WebArticleExtractorState =
  | "idle"
  | "validating"
  | "loading"
  | "preview"
  | "error";

export interface UseWebArticleExtractorResult {
  url: string;
  setUrl: (url: string) => void;
  isUrlValid: boolean;
  state: WebArticleExtractorState;
  preview: WebArticlePreview | null;
  error: string | null;
  progress: number;
  handleExtract: () => Promise<void>;
  handleConfirm: () => ParsedDocument | null;
  reset: () => void;
}

function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function useWebArticleExtractor(): UseWebArticleExtractorResult {
  const [url, setUrlState] = useState<string>("");
  const [isUrlValid, setIsUrlValid] = useState<boolean>(false);
  const [state, setState] = useState<WebArticleExtractorState>("idle");
  const [preview, setPreview] = useState<WebArticlePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [extractedDocument, setExtractedDocument] = useState<ParsedDocument | null>(null);

  const setUrl = useCallback((value: string) => {
    setUrlState(value);
    setIsUrlValid(validateUrl(value.trim()));
    setError(null);
    if (state === "preview" || state === "error") {
      setState("idle");
      setPreview(null);
      setExtractedDocument(null);
    }
  }, [state]);

  const handleExtract = useCallback(async () => {
    const trimmedUrl = url.trim();
    if (!validateUrl(trimmedUrl)) {
      setError("Por favor, insira uma URL válida começando com http:// ou https://");
      setState("error");
      return;
    }

    setState("loading");
    setError(null);
    setProgress(0);
    setPreview(null);
    setExtractedDocument(null);

    try {
      setProgress(20);
      const response = await fetch("/api/extract-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      setProgress(70);

      if (!response.ok) {
        let errorMessage = `Erro ${response.status} ao extrair artigo.`;
        try {
          const errorBody = await response.json();
          if (errorBody?.error) errorMessage = errorBody.error;
        } catch { /* mantém mensagem padrão */ }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (!data?.document) {
        throw new Error("Resposta inválida do servidor: documento não encontrado.");
      }

      setExtractedDocument(data.document as ParsedDocument);
      setPreview({
        title: data.title ?? data.document.metadata.title,
        byline: data.byline,
        siteUrl: data.siteUrl ?? trimmedUrl,
        wordCount: data.wordCount ?? data.document.metadata.wordCount,
        estimatedMinutes: data.estimatedMinutes ?? data.document.metadata.estimatedReadingMinutes,
      });
      setState("preview");
      setProgress(100);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido ao extrair artigo.";
      setError(message);
      setState("error");
      setProgress(0);
    }
  }, [url]);


  const handleConfirm = useCallback((): ParsedDocument | null => {
    return extractedDocument;
  }, [extractedDocument]);

  const reset = useCallback(() => {
    setUrlState("");
    setIsUrlValid(false);
    setState("idle");
    setPreview(null);
    setError(null);
    setProgress(0);
    setExtractedDocument(null);
  }, []);

  return {
    url,
    setUrl,
    isUrlValid,
    state,
    preview,
    error,
    progress,
    handleExtract,
    handleConfirm,
    reset,
  };
}
