/**
 * Abstração para Chrome Built-in AI (Prompt API / Gemini Nano local).
 * Permite execução de LLM 100% gratuita, privada e offline no navegador.
 */

export type ChromeAiAvailability = "readily" | "after-download" | "no";

export interface ChromeAiSessionOptions {
  systemPrompt?: string;
  temperature?: number;
  topK?: number;
  signal?: AbortSignal;
}

export interface ChromeAiLanguageModel {
  capabilities: () => Promise<{ available: ChromeAiAvailability }>;
  create: (options?: { systemPrompt?: string; temperature?: number; topK?: number; signal?: AbortSignal }) => Promise<{
    prompt: (text: string, options?: { signal?: AbortSignal }) => Promise<string>;
    promptStreaming: (
      text: string,
      options?: { signal?: AbortSignal }
    ) => AsyncIterable<string> | ReadableStream<string>;
    destroy: () => void;
  }>;
}

declare global {
  interface Window {
    ai?: {
      languageModel?: ChromeAiLanguageModel;
    };
  }
}

/** Obtém o namespace de IA do navegador com segurança */
function getLanguageModelApi(): ChromeAiLanguageModel | undefined {
  if (typeof window === "undefined") return undefined;
  // Suporte à especificação window.ai.languageModel ou global ai.languageModel
  if (window.ai?.languageModel) return window.ai.languageModel;
  const globalAi = (globalThis as unknown as { ai?: { languageModel?: ChromeAiLanguageModel } }).ai;
  return globalAi?.languageModel;
}

/** Verifica se a Prompt API / Gemini Nano está disponível no navegador */
export async function checkChromeAiAvailability(): Promise<ChromeAiAvailability> {
  try {
    const api = getLanguageModelApi();
    if (!api || typeof api.capabilities !== "function") {
      return "no";
    }
    const capabilities = await api.capabilities();
    return capabilities?.available ?? "no";
  } catch (error) {
    console.warn("Falha ao verificar disponibilidade do Chrome AI:", error);
    return "no";
  }
}

/**
 * Executa uma pergunta contra a IA local do navegador com streaming de resposta.
 */
export async function streamChromeAiPrompt({
  prompt,
  context,
  systemPrompt,
  onChunk,
  signal,
}: {
  prompt: string;
  context?: string;
  systemPrompt?: string;
  onChunk: (accumulatedText: string) => void;
  signal?: AbortSignal;
}): Promise<string> {
  const api = getLanguageModelApi();
  if (!api || typeof api.create !== "function") {
    throw new Error("Chrome Built-in AI não disponível neste navegador.");
  }

  const defaultSystemPrompt = [
    "Você é um assistente acadêmico e de leitura que responde perguntas sobre documentos PDF em português do Brasil.",
    "Responda de forma direta, clara e precisa com base no contexto fornecido.",
    context ? `\n=== CONTEÚDO DO DOCUMENTO ===\n${context.slice(0, 30000)}` : "",
  ].join("\n");

  const session = await api.create({
    systemPrompt: systemPrompt ?? defaultSystemPrompt,
    signal,
  });

  try {
    const stream = session.promptStreaming(prompt, { signal });
    let fullResponse = "";

    // A Prompt API do Chrome pode retornar tanto um AsyncIterable quanto um ReadableStream
    if (stream && typeof (stream as AsyncIterable<string>)[Symbol.asyncIterator] === "function") {
      for await (const chunk of stream as AsyncIterable<string>) {
        if (signal?.aborted) break;
        // Na especificação do Chrome, chunk pode ser cumulativo ou incremental
        fullResponse = chunk;
        onChunk(fullResponse);
      }
    } else if (stream instanceof ReadableStream) {
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      while (true) {
        if (signal?.aborted) {
          await reader.cancel();
          break;
        }
        const { done, value } = await reader.read();
        if (done) break;
        const text = typeof value === "string" ? value : decoder.decode(value, { stream: true });
        fullResponse += text;
        onChunk(fullResponse);
      }
    }

    return fullResponse;
  } finally {
    session.destroy?.();
  }
}
