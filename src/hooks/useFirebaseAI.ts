"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  createHybridGenerativeModel,
  streamHybridPrompt,
  checkOnDeviceAvailability,
  InferenceMode,
} from "@/lib/ai/firebase-ai";
import { useGeminiApiKey } from "./use-gemini-api-key";
import { useLocalAi } from "@/context/local-ai-context";
import {
  LocalModelNotDownloadedError,
  type ChatAttachment,
  type ChatEnginePreference,
} from "@/lib/local-ai/domain/local-model.types";
import { getLocalChatEngine } from "@/lib/local-ai/engines/local-chat.engine";

export type AIEngineType = "vertex" | "gemini-nano" | "litert-lm" | "disconnected";

// `window.ai` já é tipado globalmente em lib/client/chrome-ai.ts; aqui só
// acrescentamos o namespace legado `window.model` usado por builds antigos do Chrome.
type WindowWithBrowserAi = Window & { model?: unknown };

export interface UseFirebaseAIOptions {
  initialApiKey?: string;
  systemInstruction?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: Date;
  source?: "vertex" | "nano" | "litert-lm" | string;
  attachments?: ChatAttachment[];
}

export interface SendPromptOptions {
  context?: string;
  fileName?: string | null;
  attachments?: ChatAttachment[];
}

export interface UseFirebaseAIReturn {
  apiKey: string | null;
  setApiKey: (key: string) => void;
  isOnline: boolean;
  onDeviceStatus: "available" | "downloadable" | "unavailable" | "checking";
  activeEngine: AIEngineType;
  preferredChatEngine: ChatEnginePreference;
  setPreferredChatEngine: (pref: ChatEnginePreference) => void;
  isLiteRtChatReady: boolean;
  inferenceSource: "ON_DEVICE" | "IN_CLOUD" | null;
  isLoading: boolean;
  status: "idle" | "submitted" | "streaming" | "error";
  error: string | null;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  sendPrompt: (
    promptText: string,
    options?: SendPromptOptions,
  ) => Promise<void>;
  clearMessages: () => void;
  refreshStatus: () => Promise<void>;
  sendMessage: (
    prompt: string,
    options?: SendPromptOptions,
  ) => AsyncIterable<string>;
  abortCurrentRequest: () => void;
}

/**
 * Sanitiza e traduz erros de IA em mensagens acolhedoras para o usuário final,
 * garantindo zero exposição de URLs, referrers ou detalhes de infraestrutura.
 */
export function sanitizeClientAIError(err: unknown): string {
  if (!err) {
    return "Não foi possível processar sua solicitação no momento. Já registramos este evento para análise e correção. Por favor, tente novamente em instantes.";
  }

  if (err instanceof LocalModelNotDownloadedError) {
    return "Para analisar imagens, áudios ou conversar offline com o Gemma 4, baixe o modelo local na central Modelos IA Local.";
  }

  const raw = err instanceof Error ? err.message : String(err);

  // Log seguro no console para diagnóstico de desenvolvimento
  console.error("[VivaVoz AI Client Error]", err);

  if (/WebGPU/i.test(raw)) {
    return "Seu navegador não possui WebGPU ativo para executar o chat multimodal local.";
  }

  if (/403|unauthorized|api key|api_key|invalid.*key|blocked|referrer/i.test(raw)) {
    return "Acesso não autorizado ou chave de API recusada. Por favor, verifique sua chave do Google AI Studio nas configurações de IA.";
  }

  if (/429|quota|rate limit|resource_exhausted/i.test(raw)) {
    return "Muitas perguntas em pouco tempo. Aguarde alguns segundos e tente novamente.";
  }

  if (/network|offline|failed to fetch/i.test(raw)) {
    return "Falha de conexão com os servidores de IA. Verifique sua rede e tente novamente.";
  }

  if (/cancel|abort/i.test(raw)) {
    return "Operação cancelada pelo usuário.";
  }

  return "Não foi possível processar sua solicitação no momento. Já registramos este evento para análise e correção. Por favor, tente novamente em instantes.";
}

export function useFirebaseAI(options: UseFirebaseAIOptions = {}): UseFirebaseAIReturn {
  const isMountedRef = useRef(true);
  const { apiKey: unifiedApiKey, hasApiKey, updateApiKey } = useGeminiApiKey();
  const {
    isModelReady,
    preferredChatEngine,
    setPreferredChatEngine,
    openDrawer,
  } = useLocalAi();
  const isLiteRtChatReady = isModelReady("gemma-4-e2b-chat");

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

      const winAi = window as WindowWithBrowserAi;
      if (winAi.ai || winAi.model) {
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
      const winAi = typeof window !== "undefined" ? (window as WindowWithBrowserAi) : null;
      if (winAi && (winAi.ai || winAi.model)) {
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

  // Determina o motor ativo com suporte a nuvem BYOK, Gemini Nano e LiteRT-LM local
  const activeEngine: AIEngineType = (() => {
    const cloudAvailable = isOnline && (hasApiKey || Boolean(apiKey && apiKey.length > 5));
    const nanoAvailable = onDeviceStatus === "available";

    if (preferredChatEngine === "litert-lm") {
      if (isLiteRtChatReady) return "litert-lm";
      if (cloudAvailable) return "vertex";
      if (nanoAvailable) return "gemini-nano";
      return "disconnected";
    }
    if (preferredChatEngine === "cloud") {
      if (cloudAvailable) return "vertex";
      if (nanoAvailable) return "gemini-nano";
      if (isLiteRtChatReady) return "litert-lm";
      return "disconnected";
    }
    if (preferredChatEngine === "gemini-nano") {
      if (nanoAvailable) return "gemini-nano";
      if (isLiteRtChatReady) return "litert-lm";
      if (cloudAvailable) return "vertex";
      return "disconnected";
    }

    if (!isOnline) {
      if (nanoAvailable) return "gemini-nano";
      if (isLiteRtChatReady) return "litert-lm";
      return "disconnected";
    }
    if (cloudAvailable) return "vertex";
    if (nanoAvailable) return "gemini-nano";
    if (isLiteRtChatReady) return "litert-lm";
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
      msgOptions?: SendPromptOptions,
    ): AsyncIterable<string> {
      setIsLoading(true);
      setError(null);
      abortCurrentRequest();

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const hasAttachments = Boolean(
        msgOptions?.attachments && msgOptions.attachments.length > 0,
      );
      const useLiteRt =
        (hasAttachments && isLiteRtChatReady) || activeEngine === "litert-lm";

      try {
        if (hasAttachments && !isLiteRtChatReady) {
          openDrawer("gemma-4-e2b-chat");
          throw new LocalModelNotDownloadedError("gemma-4-e2b-chat");
        }

        if (useLiteRt) {
          setInferenceSource("ON_DEVICE");
          const localStream = getLocalChatEngine().streamMultimodalPrompt({
            prompt,
            attachments: msgOptions?.attachments,
            context: msgOptions?.context,
            fileName: msgOptions?.fileName,
            signal: controller.signal,
          });
          for await (const chunk of localStream) {
            yield chunk;
          }
          return;
        }

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
          return;
        }
        const errorMsg =
          err instanceof Error ? err.message : "Erro durante a geração com IA.";
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [
      apiKey,
      isOnline,
      activeEngine,
      isLiteRtChatReady,
      openDrawer,
      options.systemInstruction,
      abortCurrentRequest,
    ],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setStatus("idle");
    setError(null);
  }, []);

  const sendPrompt = useCallback(
    async (
      promptText: string,
      msgOptions?: SendPromptOptions,
    ) => {
      const cleanPrompt = promptText.trim();
      const attachments = msgOptions?.attachments ?? [];
      const hasAttachments = attachments.length > 0;
      if (!cleanPrompt && !hasAttachments) return;

      const userMsgId = `user-${Date.now()}`;
      const assistantMsgId = `assistant-${Date.now()}`;

      const useLiteRt =
        (hasAttachments && isLiteRtChatReady) || activeEngine === "litert-lm";

      const expectedSource: ChatMessage["source"] = useLiteRt
        ? "litert-lm"
        : isOnline && apiKey && apiKey.length > 5
          ? "vertex"
          : "nano";

      const userMessage: ChatMessage = {
        id: userMsgId,
        role: "user",
        content:
          cleanPrompt ||
          `Anexo(s): ${attachments.map((a) => a.name).join(", ")}`,
        createdAt: new Date(),
        attachments: hasAttachments ? attachments : undefined,
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
        if (hasAttachments && !isLiteRtChatReady) {
          openDrawer("gemma-4-e2b-chat");
          throw new LocalModelNotDownloadedError("gemma-4-e2b-chat");
        }

        let accumulated = "";
        const controller = new AbortController();
        abortControllerRef.current = controller;
        setStatus("streaming");

        if (useLiteRt) {
          setInferenceSource("ON_DEVICE");
          const localStream = getLocalChatEngine().streamMultimodalPrompt({
            prompt: cleanPrompt,
            attachments,
            context: msgOptions?.context,
            fileName: msgOptions?.fileName,
            signal: controller.signal,
          });
          for await (const textChunk of localStream) {
            accumulated += textChunk;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? { ...msg, content: accumulated, source: "litert-lm" }
                  : msg,
              ),
            );
          }
          setStatus("idle");
          return;
        }

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
        const sanitizedMsg = sanitizeClientAIError(err);
        setError(sanitizedMsg);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  content:
                    msg.content.length > 0
                      ? `${msg.content}\n\n⚠️ Interrompido: ${sanitizedMsg}`
                      : `⚠️ Não foi possível obter resposta: ${sanitizedMsg}`,
                }
              : msg,
          ),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      activeEngine,
      apiKey,
      isLiteRtChatReady,
      isOnline,
      openDrawer,
      options.systemInstruction,
    ],
  );

  return {
    apiKey,
    setApiKey,
    isOnline,
    onDeviceStatus,
    activeEngine,
    preferredChatEngine,
    setPreferredChatEngine,
    isLiteRtChatReady,
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
