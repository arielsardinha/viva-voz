import { buildDocumentSystemPrompt } from "@/lib/ai/system-instructions";
import {
  LocalModelNotDownloadedError,
  type ChatAttachment,
} from "../domain/local-model.types";
import {
  detectLocalRuntimeSupport,
  getCachedModelBlob,
} from "../storage/model-storage.service";

export type LiteRtContentPart =
  | { type: "text"; text: string }
  | { type: "image"; data: Blob | Uint8Array | ArrayBuffer | string }
  | { type: "audio"; data: Blob | Uint8Array | ArrayBuffer | string };

export interface LiteRtMessage {
  role: string;
  content?: string | LiteRtContentPart[];
}

export interface LiteRtConversation {
  sendMessageStreaming(message: LiteRtMessage): ReadableStream<LiteRtMessage>;
  cancel(): void;
  delete(): Promise<void>;
}

export interface LiteRtEngineInstance {
  createConversation(config?: {
    preface?: { messages?: LiteRtMessage[] };
  }): Promise<LiteRtConversation>;
  delete(): Promise<void>;
}

export interface LiteRtLmCoreModule {
  Backend: {
    CPU: number;
    GPU: number;
  };
  Engine: {
    create(settings: {
      model: Blob;
      backend?: number;
      visionBackend?: number;
      audioBackend?: number;
      mainExecutorSettings?: {
        maxNumTokens?: number;
        maxNumImages?: number;
      };
    }): Promise<LiteRtEngineInstance>;
  };
}

export interface ILocalChatModuleLoader {
  loadModule(): Promise<LiteRtLmCoreModule>;
}

const defaultModuleLoader: ILocalChatModuleLoader = {
  async loadModule(): Promise<LiteRtLmCoreModule> {
    const mod = await import("@litert-lm/core");
    return mod as unknown as LiteRtLmCoreModule;
  },
};

/** Janela de contexto (tokens) configurada para o Gemma 4 E2B local. */
const LOCAL_MAX_NUM_TOKENS = 4096;
/**
 * Limite de caracteres do documento no prompt de sistema. ~8000 chars em PT-BR
 * ficam em torno de 2000-2500 tokens, deixando espaço para pergunta e resposta.
 */
const LOCAL_MAX_CONTEXT_CHARS = 8000;

function isContextWindowFullError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err ?? "");
  return /context window is full|max number of tokens/i.test(message);
}

function extractChunkText(chunk: LiteRtMessage): string {
  if (typeof chunk.content === "string") return chunk.content;
  if (!Array.isArray(chunk.content)) return "";
  return chunk.content
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");
}

function buildUserContentParts(
  prompt: string,
  attachments: ChatAttachment[] = [],
): LiteRtContentPart[] {
  const parts: LiteRtContentPart[] = [];
  for (const attachment of attachments) {
    parts.push({ type: attachment.type, data: attachment.file });
  }
  const cleanPrompt = prompt.trim();
  const effectiveText =
    cleanPrompt.length > 0
      ? cleanPrompt
      : "Analise o anexo enviado e responda em português brasileiro.";
  parts.push({ type: "text", text: effectiveText });
  return parts;
}

export class LocalChatEngine {
  private engine: LiteRtEngineInstance | null = null;
  private conversation: LiteRtConversation | null = null;
  private initPromise: Promise<LiteRtEngineInstance> | null = null;

  constructor(
    private readonly moduleLoader: ILocalChatModuleLoader = defaultModuleLoader,
  ) {}

  async ensureEngine(): Promise<LiteRtEngineInstance> {
    if (this.engine) return this.engine;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.initializeEngine().finally(() => {
      this.initPromise = null;
    });
    return this.initPromise;
  }

  private async initializeEngine(): Promise<LiteRtEngineInstance> {
    const support = detectLocalRuntimeSupport();
    if (!support.webGpuSupported) {
      throw new Error(
        "Seu navegador não possui WebGPU habilitado para executar o chat multimodal local.",
      );
    }

    const modelBlob = await getCachedModelBlob("gemma-4-e2b-chat");
    if (!modelBlob) {
      throw new LocalModelNotDownloadedError("gemma-4-e2b-chat");
    }

    const mod = await this.moduleLoader.loadModule();
    const { Engine, Backend } = mod;

    const attempts = [
      {
        model: modelBlob,
        backend: Backend.GPU,
        visionBackend: Backend.GPU,
        audioBackend: Backend.GPU,
        mainExecutorSettings: { maxNumTokens: LOCAL_MAX_NUM_TOKENS, maxNumImages: 4 },
      },
      {
        model: modelBlob,
        backend: Backend.GPU,
        visionBackend: Backend.CPU,
        audioBackend: Backend.CPU,
        mainExecutorSettings: { maxNumTokens: LOCAL_MAX_NUM_TOKENS, maxNumImages: 4 },
      },
      {
        model: modelBlob,
        backend: Backend.GPU,
        mainExecutorSettings: { maxNumTokens: LOCAL_MAX_NUM_TOKENS },
      },
    ];

    let lastError: unknown;
    for (const settings of attempts) {
      try {
        const instance = await Engine.create(settings);
        this.engine = instance;
        return instance;
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("Não foi possível inicializar o motor de chat local.");
  }

  private async createFreshConversation(
    context?: string,
    fileName?: string | null,
  ): Promise<LiteRtConversation> {
    const engine = await this.ensureEngine();
    await this.resetConversation();

    const systemPrompt = buildDocumentSystemPrompt({
      context,
      fileName,
      maxContextChars: LOCAL_MAX_CONTEXT_CHARS,
    });

    const conv = await engine.createConversation({
      preface: {
        messages: [{ role: "system", content: systemPrompt }],
      },
    });
    this.conversation = conv;
    return conv;
  }

  /**
   * Cada pergunta usa uma conversa nova (apenas o prompt de sistema + documento).
   * A janela do Gemma local é de LOCAL_MAX_NUM_TOKENS tokens e o documento sozinho
   * já ocupa boa parte dela; reaproveitar a conversa acumulava o histórico e
   * estourava o limite logo na segunda pergunta ("context window is full").
   */
  async *streamMultimodalPrompt(params: {
    prompt: string;
    attachments?: ChatAttachment[];
    context?: string;
    fileName?: string | null;
    signal?: AbortSignal;
  }): AsyncIterable<string> {
    if (params.signal?.aborted) {
      throw new DOMException("Operação cancelada pelo usuário.", "AbortError");
    }

    const conversation = await this.createFreshConversation(
      params.context,
      params.fileName,
    );
    const parts = buildUserContentParts(params.prompt, params.attachments);
    const stream = conversation.sendMessageStreaming({
      role: "user",
      content: parts,
    });
    const reader = stream.getReader();

    const handleAbort = () => {
      conversation.cancel();
      void reader.cancel().catch(() => undefined);
    };
    params.signal?.addEventListener("abort", handleAbort, { once: true });

    let yieldedAny = false;
    try {
      while (true) {
        if (params.signal?.aborted) break;
        let result: ReadableStreamReadResult<LiteRtMessage>;
        try {
          result = await reader.read();
        } catch (err) {
          if (isContextWindowFullError(err)) {
            // Resposta já parcialmente entregue: encerra sem quebrar a UI.
            if (yieldedAny) break;
            throw new Error(
              "O documento é grande demais para o modelo local. Tente uma pergunta mais curta ou use o modo nuvem.",
              { cause: err },
            );
          }
          throw err;
        }
        if (result.done) break;
        const text = result.value ? extractChunkText(result.value) : "";
        if (text) {
          yieldedAny = true;
          yield text;
        }
      }
    } finally {
      params.signal?.removeEventListener("abort", handleAbort);
      reader.releaseLock();
      if (this.conversation === conversation) {
        this.conversation = null;
      }
      await conversation.delete().catch(() => undefined);
    }
  }

  async resetConversation(): Promise<void> {
    if (this.conversation) {
      await this.conversation.delete().catch(() => undefined);
      this.conversation = null;
    }
  }

  async dispose(): Promise<void> {
    await this.resetConversation();
    if (this.engine) {
      await this.engine.delete().catch(() => undefined);
      this.engine = null;
    }
    this.initPromise = null;
  }
}

let singletonInstance: LocalChatEngine | null = null;

export function getLocalChatEngine(): LocalChatEngine {
  if (!singletonInstance) {
    singletonInstance = new LocalChatEngine();
  }
  return singletonInstance;
}

export async function resetLocalChatEngineForTests(
  customLoader?: ILocalChatModuleLoader,
): Promise<LocalChatEngine> {
  if (singletonInstance) {
    await singletonInstance.dispose();
  }
  singletonInstance = customLoader ? new LocalChatEngine(customLoader) : null;
  return singletonInstance ?? getLocalChatEngine();
}
