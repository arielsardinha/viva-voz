import { buildDocumentSystemPrompt } from "@/lib/ai/system-instructions";
import {
  clearRiskyStage,
  describeError,
  markRiskyStage,
  reportLocalAiFailure,
  traceLocalAi,
} from "../diagnostics";
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

/**
 * Perfil de execução do Gemma local.
 *
 * - `full`: desktop e aparelhos com folga de memória. Texto, imagem e áudio,
 *   janela de 4096 tokens (~8000 chars de documento = 2000-2500 tokens).
 * - `lite`: iPhone/iPad (todo navegador no iOS é WebKit, com limite de memória
 *   por aba bem menor) e aparelhos com <= 4 GB de RAM. Só texto, sem carregar os
 *   codificadores de visão/áudio na GPU, e janela de 2048 tokens. Com o perfil
 *   completo o iOS criava o motor e matava a aba na primeira resposta.
 */
export interface LocalChatProfile {
  name: "full" | "lite";
  maxNumTokens: number;
  maxContextChars: number;
  multimodal: boolean;
}

const FULL_PROFILE: LocalChatProfile = {
  name: "full",
  maxNumTokens: 4096,
  maxContextChars: 8000,
  multimodal: true,
};

const LITE_PROFILE: LocalChatProfile = {
  name: "lite",
  maxNumTokens: 2048,
  maxContextChars: 3000,
  multimodal: false,
};

export function isAppleMobileWebKit(nav?: Navigator): boolean {
  if (!nav) return false;
  const ua = nav.userAgent ?? "";
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  // O iPadOS se apresenta como Mac; o suporte a toque denuncia.
  return /Macintosh/i.test(ua) && (nav.maxTouchPoints ?? 0) > 1;
}

export function resolveLocalChatProfile(
  nav: Navigator | undefined = typeof navigator !== "undefined" ? navigator : undefined,
): LocalChatProfile {
  if (!nav) return FULL_PROFILE;
  if (isAppleMobileWebKit(nav)) return LITE_PROFILE;
  const deviceMemory = (nav as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof deviceMemory === "number" && deviceMemory <= 4) return LITE_PROFILE;
  return FULL_PROFILE;
}

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
  private readonly profile: LocalChatProfile = resolveLocalChatProfile();
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
      const err = new Error(
        "Seu navegador não possui WebGPU habilitado para executar o chat multimodal local.",
      );
      await reportLocalAiFailure("engine_create", err, { webGpu: false });
      throw err;
    }

    const modelId = "gemma-4-e2b-chat";
    let modelBlob: Blob | null;
    try {
      modelBlob = await getCachedModelBlob(modelId);
    } catch (err) {
      await reportLocalAiFailure("engine_load_blob", err, { modelId });
      throw err;
    }
    if (!modelBlob) {
      const err = new LocalModelNotDownloadedError(modelId);
      await reportLocalAiFailure("engine_load_blob", err, { modelId, blobMissing: true });
      throw err;
    }
    traceLocalAi("modelo lido do cache", { modelId, blobBytes: modelBlob.size });

    let mod: LiteRtLmCoreModule;
    try {
      mod = await this.moduleLoader.loadModule();
    } catch (err) {
      await reportLocalAiFailure("engine_load_module", err, { modelId });
      throw err;
    }
    const { Engine, Backend } = mod;
    const profile = this.profile;
    const maxNumTokens = profile.maxNumTokens;

    const textOnly = {
      model: modelBlob,
      backend: Backend.GPU,
      mainExecutorSettings: { maxNumTokens },
    };
    const attempts = profile.multimodal
      ? [
          {
            model: modelBlob,
            backend: Backend.GPU,
            visionBackend: Backend.GPU,
            audioBackend: Backend.GPU,
            mainExecutorSettings: { maxNumTokens, maxNumImages: 4 },
          },
          {
            model: modelBlob,
            backend: Backend.GPU,
            visionBackend: Backend.CPU,
            audioBackend: Backend.CPU,
            mainExecutorSettings: { maxNumTokens, maxNumImages: 4 },
          },
          textOnly,
        ]
      : [textOnly];

    let lastError: unknown;
    for (const [index, settings] of attempts.entries()) {
      const startedAt = Date.now();
      try {
        markRiskyStage("engine_create", {
          modelId,
          attempt: index + 1,
          profile: profile.name,
          maxNumTokens,
          multimodal: "visionBackend" in settings,
        });
        const instance = await Engine.create(settings);
        clearRiskyStage();
        traceLocalAi("motor criado", {
          modelId,
          attempt: index + 1,
          profile: profile.name,
          elapsedMs: Date.now() - startedAt,
        });
        this.engine = instance;
        return instance;
      } catch (err) {
        clearRiskyStage();
        lastError = err;
        const info = describeError(err);
        traceLocalAi("falha ao criar motor", {
          modelId,
          attempt: index + 1,
          elapsedMs: Date.now() - startedAt,
          errorName: info.name,
          errorMessage: info.message,
        });
      }
    }

    await reportLocalAiFailure("engine_create", lastError, {
      modelId,
      attempts: attempts.length,
      blobBytes: modelBlob.size,
    });

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
      maxContextChars: this.profile.maxContextChars,
    });

    markRiskyStage("chat_conversation", {
      modelId: "gemma-4-e2b-chat",
      profile: this.profile.name,
      systemPromptChars: systemPrompt.length,
    });
    const conv = await engine.createConversation({
      preface: {
        messages: [{ role: "system", content: systemPrompt }],
      },
    });
    clearRiskyStage();
    this.conversation = conv;
    return conv;
  }

  /**
   * Cada pergunta usa uma conversa nova (apenas o prompt de sistema + documento).
   * A janela do Gemma local é de `profile.maxNumTokens` tokens e o documento sozinho
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

    if (!this.profile.multimodal && params.attachments && params.attachments.length > 0) {
      throw new Error(
        "Neste aparelho o chat local funciona só com texto. Remova o anexo ou use o modo nuvem.",
      );
    }

    const conversation = await this.createFreshConversation(
      params.context,
      params.fileName,
    );
    const parts = buildUserContentParts(params.prompt, params.attachments);
    markRiskyStage("chat_stream", {
      modelId: "gemma-4-e2b-chat",
      profile: this.profile.name,
      promptChars: params.prompt.length,
      attachments: params.attachments?.length ?? 0,
    });
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
          if (!yieldedAny) {
            traceLocalAi("primeiro token do chat local", { profile: this.profile.name });
          }
          yieldedAny = true;
          yield text;
        }
      }
    } catch (err) {
      await reportLocalAiFailure("chat_stream", err, {
        modelId: "gemma-4-e2b-chat",
        profile: this.profile.name,
        yieldedAny,
      });
      throw err;
    } finally {
      clearRiskyStage();
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
