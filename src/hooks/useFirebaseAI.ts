"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  createHybridGenerativeModel,
  streamHybridPrompt,
  checkOnDeviceAvailability,
  InferenceMode,
  type GenerativeModel,
} from "@/lib/ai/firebase-ai";
import { useGeminiApiKey } from "./use-gemini-api-key";

export type AIEngineType = "vertex" | "gemini-nano" | "disconnected";

export interface UseFirebaseAIOptions {
  initialApiKey?: string;
  systemInstruction?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: Date;
  source?: "vertex" | "nano" | string;
}

export interface UseFirebaseAIReturn {
  apiKey: string | null;
  setApiKey: (key: string) => void;
  isOnline: boolean;
  onDeviceStatus: "available" | "downloadable" | "unavailable" | "checking";
  activeEngine: AIEngineType;
  inferenceSource: "ON_DEVICE" | "IN_CLOUD" | null;
  isLoading: boolean;
  status: "idle" | "submitted" | "streaming" | "error";
  error: string | null;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  sendPrompt: (
    promptText: string,
    options?: { context?: string; fileName?: string | null },
  ) => Promise<void>;
  clearMessages: () => void;
  refreshStatus: () => Promise<void>;
  sendMessage: (
    prompt: string,
    options?: { context?: string; fileName?: string | null },
  ) => AsyncIterable<string>;
  abortCurrentRequest: () => void;
}

export function useFirebaseAI(options: UseFirebaseAIOptions = {}): UseFirebaseAIReturn {
  const isMountedRef = useRef(true);
  const { apiKey: unifiedApiKey, hasApiKey, updateApiKey } = useGeminiApiKey();

  // Inicialização determinística para SSR e hidratação sem mismatch
  const apiKey = options.initialApiKey || unifiedApiKey;
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [onDeviceStatus, setOnDeviceStatus] = useState<
    "available" | "downloadable" | "unavailable" | "checking"
  >("unavailable");
  const [inferenceSource, setInferenceSource] = useState<"ON_DEVICE" | "IN_CLOUD" | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<"idle" | "submitted" | "streaming" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Checa disponibilidade do Gemini Nano On-Device de forma segura
  const refreshStatus = useCallback(async () => {
    try {
      const status = await checkOnDeviceAvailability();
      if (isMountedRef.current) {
        setOnDeviceStatus(status);
      }
    } catch {
      if (isMountedRef.current) {
        setOnDeviceStatus("unavailable");
      }
    }
  }, []);

  // Sincroniza estado de cliente (localStorage, conectividade, On-Device AI) após hidratação
  useEffect(() => {
    isMountedRef.current = true;
    let active = true;

    if (typeof window !== "undefined") {
      if (typeof navigator !== "undefined") {
        setIsOnline(navigator.onLine);
      }

      if ((window as any).ai || (window as any).model) {
        checkOnDeviceAvailability()
          .then((status) => {
            if (active && isMountedRef.current) {
              setOnDeviceStatus(status);
            }
          })
          .catch(() => {
            if (active && isMountedRef.current) {
              setOnDeviceStatus("unavailable");
            }
          });
      }
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const handleFocus = () => {
      if (typeof window !== "undefined" && ((window as any).ai || (window as any).model)) {
        checkOnDeviceAvailability()
          .then((status) => {
            if (active && isMountedRef.current) {
              setOnDeviceStatus(status);
            }
          })
          .catch(() => {});
      }
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      active = false;
      isMountedRef.current = false;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const setApiKey = useCallback(
    (newKey: string) => {
      const trimmed = newKey.trim();
      void updateApiKey(trimmed || null);
    },
    [updateApiKey]
  );

  // Determina o motor ativo com base nas regras do Firebase AI Logic
  const activeEngine: AIEngineType = (() => {
    if (!isOnline) {
      return onDeviceStatus === "available" ? "gemini-nano" : "disconnected";
    }
    if (hasApiKey || (apiKey && apiKey.length > 5)) {
      return "vertex";
    }
    if (onDeviceStatus === "available") {
      return "gemini-nano";
    }
    return "disconnected";
  })();

  const abortCurrentRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(
    async function* (
      prompt: string,
      msgOptions?: { context?: string; fileName?: string | null },
    ): AsyncIterable<string> {
      setIsLoading(true);
      setError(null);
      abortCurrentRequest();

      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Seleção do modo de inferência com base no estado de conexão e credenciais
      let mode: InferenceMode = InferenceMode.PREFER_ON_DEVICE;
      if (isOnline && apiKey && apiKey.length > 5) {
        mode = InferenceMode.PREFER_IN_CLOUD;
      } else if (!isOnline) {
        mode = InferenceMode.ONLY_ON_DEVICE;
      }

      let model: GenerativeModel;
      try {
        model = createHybridGenerativeModel({
          apiKey,
          mode,
          systemInstruction: options.systemInstruction,
        });
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error ? err.message : "Erro ao inicializar modelo do Firebase AI.";
        setError(errorMsg);
        setIsLoading(false);
        throw err;
      }

      try {
        const stream = streamHybridPrompt({
          model,
          prompt,
          context: msgOptions?.context,
          fileName: msgOptions?.fileName,
          signal: controller.signal,
        });

        for await (const chunk of stream) {
          if (chunk.source) {
            setInferenceSource(chunk.source as "ON_DEVICE" | "IN_CLOUD");
          }
          yield chunk.text;
        }
      } catch (err: unknown) {
        if ((err as Error)?.name === "AbortError" || controller.signal.aborted) {
          // Requisição cancelada normalmente
          return;
        }
        const errorMsg =
          err instanceof Error ? err.message : "Erro durante a geração com Firebase AI.";
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [apiKey, isOnline, onDeviceStatus, activeEngine, options.systemInstruction, abortCurrentRequest],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setStatus("idle");
    setError(null);
  }, []);

  const sendPrompt = useCallback(
    async (
      promptText: string,
      msgOptions?: { context?: string; fileName?: string | null },
    ) => {
      const cleanPrompt = promptText.trim();
      if (!cleanPrompt) return;

      const userMsgId = `user-${Date.now()}`;
      const assistantMsgId = `assistant-${Date.now()}`;

      const expectedSource = isOnline && apiKey && apiKey.length > 5 ? "vertex" : "nano";

      const userMessage: ChatMessage = {
        id: userMsgId,
        role: "user",
        content: cleanPrompt,
        createdAt: new Date(),
      };

      const assistantMessage: ChatMessage = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        createdAt: new Date(),
        source: expectedSource,
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setStatus("submitted");
      setIsLoading(true);
      setError(null);

      try {
        let accumulated = "";
        const controller = new AbortController();
        abortControllerRef.current = controller;

        let mode: InferenceMode = InferenceMode.PREFER_ON_DEVICE;
        if (isOnline && apiKey && apiKey.length > 5) {
          mode = InferenceMode.PREFER_IN_CLOUD;
        } else if (!isOnline) {
          mode = InferenceMode.ONLY_ON_DEVICE;
        }

        const model = createHybridGenerativeModel({
          apiKey,
          mode,
          systemInstruction: options.systemInstruction,
        });

        const stream = streamHybridPrompt({
          model,
          prompt: cleanPrompt,
          context: msgOptions?.context,
          fileName: msgOptions?.fileName,
          signal: controller.signal,
        });

        setStatus("streaming");

        for await (const chunk of stream) {
          if (chunk.text) {
            accumulated += chunk.text;
          }
          const detectedSource = chunk.source
            ? chunk.source === "IN_CLOUD"
              ? "vertex"
              : chunk.source === "ON_DEVICE"
              ? "nano"
              : chunk.source
            : undefined;

          if (chunk.source) {
            setInferenceSource(chunk.source as "ON_DEVICE" | "IN_CLOUD");
          }

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? {
                    ...msg,
                    content: accumulated,
                    ...(detectedSource ? { source: detectedSource } : {}),
                  }
                : msg,
            ),
          );
        }
        setStatus("idle");
      } catch (err: unknown) {
        setStatus("error");
        const errMsg = err instanceof Error ? err.message : "Erro ao consultar a IA.";
        setError(errMsg);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  content:
                    msg.content.length > 0
                      ? `${msg.content}\n\n⚠️ Interrompido: ${errMsg}`
                      : `⚠️ Não foi possível obter resposta: ${errMsg}`,
                }
              : msg,
          ),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [sendMessage],
  );

  return {
    apiKey,
    setApiKey,
    isOnline,
    onDeviceStatus,
    activeEngine,
    inferenceSource,
    isLoading,
    status,
    error,
    messages,
    setMessages,
    sendPrompt,
    clearMessages,
    refreshStatus,
    sendMessage,
    abortCurrentRequest,
  };
}
