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
      assistant?: ChromeAiLanguageModel;
    };
  }
}

/** Obtém o namespace de IA do navegador com suporte a múltiplas versões da spec */
function getLanguageModelApi(): ChromeAiLanguageModel | undefined {
  if (typeof window === "undefined") return undefined;
  
  // 1. window.LanguageModel (Spec Chrome 138+ / W3C Prompt API)
  const winLangModel = (window as unknown as { LanguageModel?: ChromeAiLanguageModel }).LanguageModel;
  if (winLangModel) return winLangModel;

  // 2. window.ai.languageModel (Spec atual do Chrome 128+)
  if (window.ai?.languageModel) return window.ai.languageModel;
  
  // 3. window.ai.assistant (Spec inicial do Chrome 127)
  if (window.ai?.assistant) return window.ai.assistant;

  // 4. globalThis / self.ai
  const globalAi = (globalThis as unknown as { ai?: { languageModel?: ChromeAiLanguageModel; assistant?: ChromeAiLanguageModel } }).ai;
  if (globalAi?.languageModel) return globalAi.languageModel;
  if (globalAi?.assistant) return globalAi.assistant;

  return undefined;
}

/** Verifica se a Prompt API / Gemini Nano está disponível no navegador */
export async function checkChromeAiAvailability(): Promise<ChromeAiAvailability> {
  try {
    const api = getLanguageModelApi();
    if (!api) {
      return "no";
    }

    // Suporte a api.availability() (Spec W3C mais recente / Chrome 130+)
    const apiWithAvailability = api as unknown as { availability?: () => Promise<string> };
    if (typeof apiWithAvailability.availability === "function") {
      const avail = await apiWithAvailability.availability();
      if (avail === "available" || avail === "readily") return "readily";
      if (avail === "downloadable" || avail === "after-download") return "after-download";
      return "no";
    }

    // Suporte a api.capabilities() (Chrome 127/128/129)
    if (typeof api.capabilities === "function") {
      const caps = await api.capabilities();
      const status = caps?.available as string;
      if (status === "available" || status === "readily") return "readily";
      if (status === "downloadable" || status === "after-download") return "after-download";
      return "no";
    }

    // Se possui create mas sem método de checagem explícito
    if (typeof api.create === "function") {
      return "readily";
    }

    return "no";
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
