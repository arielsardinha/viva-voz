"use client";

import { useCallback, useEffect, useState } from "react";
import {
  saveGeminiApiKeyAction,
  removeGeminiApiKeyAction,
  getGeminiApiKeyStatusAction,
} from "@/app/actions/gemini-key.actions";

export const GEMINI_KEY_EVENT = "gemini-key-changed";

export function useGeminiApiKey() {
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(true);

  const syncKey = useCallback(async () => {
    try {
      const status = await getGeminiApiKeyStatusAction();
      setHasApiKey(status.hasKey);
      setMaskedKey(status.maskedKey ?? null);
    } catch {
      setHasApiKey(false);
      setMaskedKey(null);
    } finally {
      setIsChecking(false);
    }
  }, []);

  const updateApiKey = useCallback(async (key: string | null): Promise<boolean> => {
    try {
      if (key && key.trim().length >= 10) {
        const result = await saveGeminiApiKeyAction(key.trim());
        if (result.success) {
          setHasApiKey(true);
          const prefix = key.trim().slice(0, 6);
          const suffix = key.trim().slice(-3);
          setMaskedKey(`${prefix}...${suffix}`);
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent(GEMINI_KEY_EVENT, {
                detail: { hasApiKey: true, maskedKey: `${prefix}...${suffix}` },
              })
            );
          }
          return true;
        }
        return false;
      } else {
        const result = await removeGeminiApiKeyAction();
        if (result.success) {
          setHasApiKey(false);
          setMaskedKey(null);
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent(GEMINI_KEY_EVENT, { detail: { hasApiKey: false } })
            );
          }
          return true;
        }
        return false;
      }
    } catch (e) {
      console.error("Falha ao atualizar chave Gemini via Server Action:", e);
      return false;
    }
  }, []);

  useEffect(() => {
    void syncKey();

    const handleCustomEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ hasApiKey?: boolean; maskedKey?: string }>;
      if (customEvent.detail && typeof customEvent.detail.hasApiKey === "boolean") {
        setHasApiKey(customEvent.detail.hasApiKey);
        setMaskedKey(customEvent.detail.maskedKey ?? null);
      } else {
        void syncKey();
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener(GEMINI_KEY_EVENT, handleCustomEvent);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(GEMINI_KEY_EVENT, handleCustomEvent);
      }
    };
  }, [syncKey]);

  return {
    apiKey: hasApiKey ? (maskedKey || "connected") : null,
    hasApiKey,
    maskedKey,
    isChecking,
    updateApiKey,
    syncKey,
  };
}
