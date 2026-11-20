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
  private activeContextKey: string | null = null;
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
        mainExecutorSettings: { maxNumTokens: 4096, maxNumImages: 4 },
      },
      {
        model: modelBlob,
        backend: Backend.GPU,
        visionBackend: Backend.CPU,
        audioBackend: Backend.CPU,
        mainExecutorSettings: { maxNumTokens: 4096, maxNumImages: 4 },
      },
      {
        model: modelBlob,
        backend: Backend.GPU,
        mainExecutorSettings: { maxNumTokens: 4096 },
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

  private async getOrCreateConversation(
    context?: string,
    fileName?: string | null,
  ): Promise<LiteRtConversation> {
    const engine = await this.ensureEngine();
    const nextKey = `${fileName ?? ""}::${context?.slice(0, 200) ?? ""}::${context?.length ?? 0}`;

    if (this.conversation && this.activeContextKey === nextKey) {
      return this.conversation;
    }

    if (this.conversation) {
      await this.conversation.delete().catch(() => undefined);
      this.conversation = null;
    }

    const systemPrompt = buildDocumentSystemPrompt({
      context,
      fileName,
      maxContextChars: 12000,
    });

    const conv = await engine.createConversation({
      preface: {
        messages: [{ role: "system", content: systemPrompt }],
      },
    });
    this.conversation = conv;
    this.activeContextKey = nextKey;
    return conv;
  }

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

    const conversation = await this.getOrCreateConversation(
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

    try {
      while (true) {
        if (params.signal?.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;
        const text = value ? extractChunkText(value) : "";
        if (text) yield text;
      }
    } finally {
      params.signal?.removeEventListener("abort", handleAbort);
      reader.releaseLock();
    }
  }

  async resetConversation(): Promise<void> {
    if (this.conversation) {
      await this.conversation.delete().catch(() => undefined);
      this.conversation = null;
      this.activeContextKey = null;
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
