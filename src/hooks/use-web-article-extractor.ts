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
  | "error";

export interface UseWebArticleExtractorResult {
  url: string;
  setUrl: (url: string) => void;
  isUrlValid: boolean;
  state: WebArticleExtractorState;
  error: string | null;
  progress: number;
  handleExtract: (onExtracted: (doc: ParsedDocument) => void) => Promise<void>;
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
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);

  const setUrl = useCallback((value: string) => {
    setUrlState(value);
    setIsUrlValid(validateUrl(value.trim()));
    setError(null);
    if (state === "error") {
      setState("idle");
    }
  }, [state]);

  const handleExtract = useCallback(async (onExtracted: (doc: ParsedDocument) => void) => {
    const trimmedUrl = url.trim();
    if (!validateUrl(trimmedUrl)) {
      setError("Por favor, insira uma URL válida começando com http:// ou https://");
      setState("error");
      return;
    }

    setState("loading");
    setError(null);
    setProgress(0);

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

      setState("idle");
      setProgress(0);
      // Dispara imediatamente — sem etapa de confirmação
      onExtracted(data.document as ParsedDocument);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido ao extrair artigo.";
      setError(message);
      setState("error");
      setProgress(0);
    }
  }, [url]);


  const reset = useCallback(() => {
    setUrlState("");
    setIsUrlValid(false);
    setState("idle");
    setError(null);
    setProgress(0);
  }, []);

  return {
    url,
    setUrl,
    isUrlValid,
    state,
    error,
    progress,
    handleExtract,
    reset,
  };
}
