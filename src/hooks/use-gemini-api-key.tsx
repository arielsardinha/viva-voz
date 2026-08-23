"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  saveGeminiApiKeyAction,
  removeGeminiApiKeyAction,
  getGeminiApiKeyStatusAction,
} from "@/app/actions/gemini-key.actions";

export const GEMINI_KEY_EVENT = "gemini-key-changed";

export interface GeminiApiKeyState {
  /** Chave mascarada ou "connected" se presente; null se ausente */
  apiKey: string | null;
  /** Indica se a chave está configurada */
  hasApiKey: boolean;
  /** Chave mascarada (ex: AIzaSy...xyz) ou null */
  maskedKey: string | null;
  /** True enquanto a Server Action inicial está em voo */
  isChecking: boolean;
  /** Salva ou remove a chave via Server Action */
  updateApiKey: (key: string | null) => Promise<boolean>;
  /** Força re-sincronização com o servidor */
  syncKey: () => Promise<void>;
}

const GeminiApiKeyContext = createContext<GeminiApiKeyState | null>(null);

/**
 * Provider que centraliza o estado da API Key do Gemini.
 * Chama a Server Action `getGeminiApiKeyStatusAction` **uma única vez** no mount,
 * evitando N chamadas paralelas quando múltiplos componentes precisam do mesmo dado.
 *
 * Usa flag `cancelled` no useEffect para prevenir race condition entre
 * Server Actions em voo e navegação RSC (fix: enqueueModel crash).
 */
export function GeminiApiKeyProvider({ children }: { children: React.ReactNode }) {
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(true);

  // Ref para evitar chamadas duplicadas em StrictMode (dev)
  const initialSyncDone = useRef(false);

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
          const prefix = key.trim().slice(0, 6);
          const suffix = key.trim().slice(-3);
          const masked = `${prefix}...${suffix}`;
          setHasApiKey(true);
          setMaskedKey(masked);
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent(GEMINI_KEY_EVENT, {
                detail: { hasApiKey: true, maskedKey: masked },
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
    // Flag de cancelamento: previne setState após desmontagem do componente
    // durante navegação, evitando race condition com o stream RSC
    let cancelled = false;

    async function initialSync() {
      try {
        const status = await getGeminiApiKeyStatusAction();
        if (!cancelled) {
          setHasApiKey(status.hasKey);
          setMaskedKey(status.maskedKey ?? null);
        }
      } catch {
        if (!cancelled) {
          setHasApiKey(false);
          setMaskedKey(null);
        }
      } finally {
        if (!cancelled) {
          setIsChecking(false);
          initialSyncDone.current = true;
        }
      }
    }

    // Evita chamada duplicada em StrictMode (React 18+ dev)
    if (!initialSyncDone.current) {
      void initialSync();
    }

    // Escuta eventos de outros componentes/abas que atualizaram a chave
    const handleCustomEvent = (event: Event) => {
      if (cancelled) return;
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
      cancelled = true;
      if (typeof window !== "undefined") {
        window.removeEventListener(GEMINI_KEY_EVENT, handleCustomEvent);
      }
    };
  }, [syncKey]);

  const value: GeminiApiKeyState = {
    apiKey: hasApiKey ? (maskedKey || "connected") : null,
    hasApiKey,
    maskedKey,
    isChecking,
    updateApiKey,
    syncKey,
  };

  return (
    <GeminiApiKeyContext.Provider value={value}>
      {children}
    </GeminiApiKeyContext.Provider>
  );
}

/**
 * Hook que consome o estado da API Key do Gemini centralizado no Provider.
 * Substitui a implementação anterior que fazia N chamadas de Server Action
 * por instância de componente.
 *
 * @throws Error se usado fora de `GeminiApiKeyProvider`
 */
export function useGeminiApiKey(): GeminiApiKeyState {
  const context = useContext(GeminiApiKeyContext);
  if (!context) {
    throw new Error(
      "useGeminiApiKey deve ser usado dentro de <GeminiApiKeyProvider>. " +
      "Verifique se o provider está presente no layout."
    );
  }
  return context;
}
