"use client";

import { useCallback, useEffect, useState } from "react";

export const GEMINI_KEY_STORAGE = "gemini-api-key";
export const GEMINI_KEY_EVENT = "gemini-key-changed";

export function useGeminiApiKey() {
  const [apiKey, setApiKey] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(GEMINI_KEY_STORAGE);
    } catch {
      return null;
    }
  });

  const syncKey = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const current = window.localStorage.getItem(GEMINI_KEY_STORAGE);
      setApiKey(current);
    } catch {
      setApiKey(null);
    }
  }, []);

  const updateApiKey = useCallback((key: string | null) => {
    if (typeof window === "undefined") return;
    try {
      if (key && key.trim().length > 0) {
        window.localStorage.setItem(GEMINI_KEY_STORAGE, key.trim());
        setApiKey(key.trim());
      } else {
        window.localStorage.removeItem(GEMINI_KEY_STORAGE);
        setApiKey(null);
      }
      // Notifica todos os componentes na mesma janela
      window.dispatchEvent(new CustomEvent(GEMINI_KEY_EVENT, { detail: key }));
    } catch (e) {
      console.error("Falha ao salvar chave Gemini no localStorage:", e);
    }
  }, []);

  useEffect(() => {
    syncKey();

    const handleCustomEvent = () => syncKey();
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === GEMINI_KEY_STORAGE || event.key === null) {
        syncKey();
      }
    };

    window.addEventListener(GEMINI_KEY_EVENT, handleCustomEvent);
    window.addEventListener("storage", handleStorageEvent);

    return () => {
      window.removeEventListener(GEMINI_KEY_EVENT, handleCustomEvent);
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, [syncKey]);

  return {
    apiKey,
    hasApiKey: Boolean(apiKey && apiKey.length >= 10),
    updateApiKey,
  };
}
