"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  checkChromeAiAvailability,
  type ChromeAiAvailability,
} from "@/lib/client/chrome-ai";

export interface UseChromeAiOptions {
  /** Intervalo em milissegundos para polling enquanto não estiver pronto. Default: 5000 (0 para desligar) */
  pollIntervalMs?: number;
  /** Disparado quando o status muda */
  onStatusChange?: (status: ChromeAiAvailability) => void;
  /** Se deve exibir um toast automático ao detectar a ativação do Gemini Nano. Default: true */
  notifyOnReady?: boolean;
}

export interface UseChromeAiResult {
  status: ChromeAiAvailability;
  isChecking: boolean;
  isReady: boolean;
  isDownloading: boolean;
  checkNow: (silent?: boolean) => Promise<ChromeAiAvailability>;
  lastChecked: Date | null;
}

/**
 * Hook para monitorar e detectar automaticamente o status do Chrome Built-in AI (Gemini Nano).
 * Monitora foco da janela, retorno à aba e faz polling inteligente até a ativação.
 */
export function useChromeAi(options: UseChromeAiOptions = {}): UseChromeAiResult {
  const { pollIntervalMs = 5000, onStatusChange, notifyOnReady = true } = options;

  const [status, setStatus] = useState<ChromeAiAvailability>("no");
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const prevStatusRef = useRef<ChromeAiAvailability>("no");
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  const checkNow = useCallback(
    async (silent = false): Promise<ChromeAiAvailability> => {
      if (!silent) setIsChecking(true);
      try {
        const current = await checkChromeAiAvailability();
        setLastChecked(new Date());
        setStatus(current);

        if (prevStatusRef.current !== current) {
          if (prevStatusRef.current !== "readily" && current === "readily" && notifyOnReady) {
            toast.success(
              "Gemini Nano detectado e ativo! O assistente agora opera 100% no seu navegador com zero custo.",
            );
          }
          prevStatusRef.current = current;
          onStatusChangeRef.current?.(current);
        }

        return current;
      } finally {
        if (!silent) setIsChecking(false);
      }
    },
    [notifyOnReady],
  );

  // Verificação inicial e listeners de foco / visibilidade
  useEffect(() => {
    void checkNow();

    const handleFocus = () => {
      void checkNow(true);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void checkNow(true);
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [checkNow]);

  // Polling automático enquanto não estiver pronto
  useEffect(() => {
    if (!pollIntervalMs || status === "readily") return;

    const timer = setInterval(() => {
      // Se a aba estiver visível, verifica silenciosamente
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void checkNow(true);
      }
    }, pollIntervalMs);

    return () => clearInterval(timer);
  }, [pollIntervalMs, status, checkNow]);

  return {
    status,
    isChecking,
    isReady: status === "readily",
    isDownloading: status === "after-download",
    checkNow,
    lastChecked,
  };
}
