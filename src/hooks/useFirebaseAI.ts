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
type RunnableEngine = Exclude<AIEngineType, "disconnected">;

const ENGINE_TO_SOURCE: Record<RunnableEngine, "vertex" | "nano" | "litert-lm"> = {
  vertex: "vertex",
  "gemini-nano": "nano",
  "litert-lm": "litert-lm",
};

const ENGINE_TO_INFERENCE_SOURCE: Record<RunnableEngine, "ON_DEVICE" | "IN_CLOUD"> = {
  vertex: "IN_CLOUD",
  "gemini-nano": "ON_DEVICE",
  "litert-lm": "ON_DEVICE",
};

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
  /** Instrução de sistema específica da tarefa; substitui a do chat. */
  systemPrompt?: string;
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
    readyChatModelId,
    preferredChatEngine,
    setPreferredChatEngine,
  } = useLocalAi();
  const isLiteRtChatReady = Boolean(readyChatModelId);

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

  const cloudAvailable = isOnline && (hasApiKey || Boolean(apiKey && apiKey.length > 5));
  const nanoAvailable = onDeviceStatus === "available";

  // Determina o motor ativo com suporte a nuvem BYOK, Gemini Nano e LiteRT-LM local
  const activeEngine: AIEngineType = (() => {
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

    if (cloudAvailable) return "vertex";
    if (nanoAvailable) return "gemini-nano";
    if (isLiteRtChatReady) return "litert-lm";
    return "disconnected";
  })();

  /**
   * Ordem de motores a tentar para uma mensagem.
   * - Anexos: somente o Gemma local (único motor multimodal).
   * - Automático: nuvem → Gemini Nano (navegador) → Gemma local, pulando os indisponíveis.
   * - Motor escolhido manualmente: apenas o motor ativo (respeita a escolha do usuário).
   */
  const resolveEngineChain = useCallback(
    (hasAttachments: boolean): RunnableEngine[] => {
      if (hasAttachments) return ["litert-lm"];

      if (preferredChatEngine === "auto") {
        const chain: RunnableEngine[] = [];
        if (cloudAvailable) chain.push("vertex");
        if (nanoAvailable) chain.push("gemini-nano");
        if (isLiteRtChatReady) chain.push("litert-lm");
        if (chain.length > 0) return chain;
      } else if (activeEngine !== "disconnected") {
        return [activeEngine];
      }

      // Nada disponível: tenta o Nano para que o erro real chegue ao usuário.
      return ["gemini-nano"];
    },
    [preferredChatEngine, cloudAvailable, nanoAvailable, isLiteRtChatReady, activeEngine],
  );

  const streamFromEngine = useCallback(
    async function* (
      engine: RunnableEngine,
      prompt: string,
      msgOptions: SendPromptOptions | undefined,
      signal: AbortSignal,
    ): AsyncIterable<string> {
      if (engine === "litert-lm") {
        yield* getLocalChatEngine().streamMultimodalPrompt({
          prompt,
          attachments: msgOptions?.attachments,
          context: msgOptions?.context,
          fileName: msgOptions?.fileName,
          systemPrompt: msgOptions?.systemPrompt,
          signal,
        });
        return;
      }

      const model = createHybridGenerativeModel({
        apiKey,
        mode:
          engine === "vertex"
            ? InferenceMode.ONLY_IN_CLOUD
            : InferenceMode.ONLY_ON_DEVICE,
        systemInstruction: options.systemInstruction,
      });

      for await (const chunk of streamHybridPrompt({
        model,
        prompt,
        context: msgOptions?.context,
        fileName: msgOptions?.fileName,
        systemPrompt: msgOptions?.systemPrompt,
        signal,
      })) {
        if (chunk.text) yield chunk.text;
      }
    },
    [apiKey, options.systemInstruction],
  );

  /**
   * Percorre a cadeia de motores. Se um motor falhar antes de produzir qualquer
   * texto, tenta o próximo. Falhas no meio da resposta são propagadas para não
   * misturar respostas de motores diferentes.
   */
  const streamWithFallback = useCallback(
    async function* (
      chain: RunnableEngine[],
      prompt: string,
      msgOptions: SendPromptOptions | undefined,
      signal: AbortSignal,
    ): AsyncIterable<{ text: string; engine: RunnableEngine }> {
      let lastError: unknown;
      for (const engine of chain) {
        if (signal.aborted) return;
        if (isMountedRef.current) {
          setInferenceSource(ENGINE_TO_INFERENCE_SOURCE[engine]);
        }
        let producedText = false;
        try {
          for await (const text of streamFromEngine(engine, prompt, msgOptions, signal)) {
            producedText = true;
            yield { text, engine };
          }
          return;
        } catch (err) {
          if (signal.aborted || (err as Error)?.name === "AbortError") throw err;
          if (producedText) throw err;
          lastError = err;
          console.warn(`[VivaVoz AI] Motor "${engine}" falhou; tentando o próximo.`, err);
        }
      }
      throw lastError ?? new Error("Nenhum motor de IA disponível.");
    },
    [streamFromEngine],
  );

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
      try {
        // Sem Gemma baixado, a mensagem de erro do chat orienta a ir à central /modelos;
        // não navegamos automaticamente para não descartar a conversa em andamento.
        if (hasAttachments && !isLiteRtChatReady) {
          throw new LocalModelNotDownloadedError("gemma-4-e2b-chat");
        }

        const chain = resolveEngineChain(hasAttachments);
        for await (const chunk of streamWithFallback(
          chain,
          prompt,
          msgOptions,
          controller.signal,
        )) {
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
      isLiteRtChatReady,
      abortCurrentRequest,
      resolveEngineChain,
      streamWithFallback,
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

      const chain = resolveEngineChain(hasAttachments);
      const expectedSource: ChatMessage["source"] = ENGINE_TO_SOURCE[chain[0]];

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
        // Sem Gemma baixado, a mensagem de erro do chat orienta a ir à central /modelos;
        // não navegamos automaticamente para não descartar a conversa em andamento.
        if (hasAttachments && !isLiteRtChatReady) {
          throw new LocalModelNotDownloadedError("gemma-4-e2b-chat");
        }

        let accumulated = "";
        const controller = new AbortController();
        abortControllerRef.current = controller;
        setStatus("streaming");

        for await (const chunk of streamWithFallback(
          chain,
          cleanPrompt,
          { ...msgOptions, attachments },
          controller.signal,
        )) {
          accumulated += chunk.text;
          const source = ENGINE_TO_SOURCE[chunk.engine];
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? { ...msg, content: accumulated, source }
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
    [isLiteRtChatReady, resolveEngineChain, streamWithFallback],
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
