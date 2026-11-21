import { resolveLiteRtVoiceLocale } from "@/lib/tts-engines";
import { encodeFloat32PcmToWavBuffer } from "../domain/pcm-wav-encoder";
import { LocalModelNotDownloadedError } from "../domain/local-model.types";
import type {
  LocalTtsDelegate,
  LocalTtsProgressEvent,
} from "../domain/local-tts-load-state";
import {
  detectLocalRuntimeSupport,
  getCachedModelBlob,
  getCachedModelMeta,
  getCachedModelStreamReader,
} from "../storage/model-storage.service";

export const MEDIAPIPE_AUDIO_WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-audio@1.2.3/wasm";

const KOKORO_MODEL_ID = "kokoro-82m-tts" as const;
const DEFAULT_VOICE_ID = "pf_dora";
const DEFAULT_SAMPLE_RATE_HZ = 24000;
/** Texto curto usado para aquecer o modelo (compila shaders / aloca buffers). */
const WARMUP_TEXT = "Olá.";

export interface MediaPipeTextToSpeechInstance {
  synthesize(
    text: string,
    options?: { voiceId?: string; locale?: string },
  ): Promise<{ samples: Float32Array; sampleRateHz: number }>;
  cancel(): void;
  close(): void;
}

export interface MediaPipeAudioModule {
  FilesetResolver: {
    forAudioTasks(basePath?: string, useModule?: boolean): Promise<unknown>;
  };
  TextToSpeech: {
    createFromOptions(
      wasmFileset: unknown,
      options: {
        baseOptions: {
          modelAssetBuffer: Uint8Array | ReadableStreamDefaultReader<Uint8Array>;
          delegate: LocalTtsDelegate;
        };
        defaultVoiceId?: string;
        defaultLocale?: string;
      },
    ): Promise<MediaPipeTextToSpeechInstance>;
  };
}

export interface ILocalTtsModuleLoader {
  loadModule(): Promise<MediaPipeAudioModule>;
}

const defaultModuleLoader: ILocalTtsModuleLoader = {
  async loadModule(): Promise<MediaPipeAudioModule> {
    const mod = await import("@mediapipe/tasks-audio");
    return mod as unknown as MediaPipeAudioModule;
  },
};

export interface LocalTtsRuntimeOptions {
  moduleLoader?: ILocalTtsModuleLoader;
  /** Recebe cada mudança de etapa do carregamento inicial. */
  onProgress?: (event: LocalTtsProgressEvent) => void;
  /**
   * Usa a variante ES module do runtime WASM. Obrigatório dentro de um module
   * worker, onde `importScripts` não existe e o loader cai para `import()`.
   */
  useModuleWasm?: boolean;
}

export interface LocalTtsWavResult {
  buffer: ArrayBuffer;
  sampleRateHz: number;
}

async function readBlobAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === "function") {
    return blob.arrayBuffer();
  }
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error("Não foi possível ler os bytes do modelo local."));
      }
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("Erro ao ler modelo em cache."));
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * Envolve o reader do cache para contar os bytes à medida que o MediaPipe os
 * consome. Como o `createFromOptions` lê o stream durante a inicialização,
 * isso dá um progresso real da etapa de carregamento do modelo.
 */
function trackReaderProgress(
  source: ReadableStreamDefaultReader<Uint8Array>,
  onChunk: (byteLength: number) => void,
  onDone: () => void,
): ReadableStreamDefaultReader<Uint8Array> {
  if (typeof ReadableStream === "undefined") return source;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await source.read();
      if (done) {
        onDone();
        controller.close();
        return;
      }
      if (value) {
        onChunk(value.byteLength);
        controller.enqueue(value);
      }
    },
    cancel(reason) {
      return source.cancel(reason);
    },
  }).getReader();
}

/**
 * Runtime do Kokoro 82M via MediaPipe. Não conhece Web Workers: roda tanto
 * dentro do worker dedicado (caminho padrão) quanto na thread principal
 * (fallback quando o worker não está disponível).
 */
export class LocalTtsRuntime {
  private instance: MediaPipeTextToSpeechInstance | null = null;
  private initPromise: Promise<MediaPipeTextToSpeechInstance> | null = null;
  private synthQueue: Promise<void> = Promise.resolve();
  private hasSynthesized = false;
  private readonly moduleLoader: ILocalTtsModuleLoader;
  private readonly onProgress: (event: LocalTtsProgressEvent) => void;
  private readonly useModuleWasm: boolean;

  constructor(options: LocalTtsRuntimeOptions = {}) {
    this.moduleLoader = options.moduleLoader ?? defaultModuleLoader;
    this.onProgress = options.onProgress ?? (() => undefined);
    this.useModuleWasm = options.useModuleWasm ?? false;
  }

  get isReady(): boolean {
    return this.instance !== null && this.hasSynthesized;
  }

  async ensureReady(): Promise<MediaPipeTextToSpeechInstance> {
    if (this.instance) return this.instance;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.initializeInstance()
      .catch((error: unknown) => {
        this.emitFailure(error);
        throw error;
      })
      .finally(() => {
        this.initPromise = null;
      });
    return this.initPromise;
  }

  private emitFailure(error: unknown): void {
    if (error instanceof LocalModelNotDownloadedError) {
      this.onProgress({ phase: "idle" });
      return;
    }
    this.onProgress({
      phase: "error",
      errorMessage:
        error instanceof Error && error.message
          ? error.message
          : "Falha ao carregar o modelo de voz local.",
    });
  }

  private async readModelBuffer(
    delegate: LocalTtsDelegate,
    totalBytes: number,
  ): Promise<Uint8Array | ReadableStreamDefaultReader<Uint8Array>> {
    this.onProgress({ phase: "model", delegate, loadedBytes: 0, totalBytes });

    const reader = await getCachedModelStreamReader(KOKORO_MODEL_ID);
    if (reader) {
      let loadedBytes = 0;
      let lastPercent = -1;
      return trackReaderProgress(
        reader,
        (byteLength) => {
          loadedBytes += byteLength;
          const total = Math.max(totalBytes, loadedBytes, 1);
          const percent = Math.floor((loadedBytes / total) * 100);
          // Evita inundar o canal de mensagens: só reporta a cada 1%.
          if (percent !== lastPercent) {
            lastPercent = percent;
            this.onProgress({
              phase: "model",
              delegate,
              loadedBytes,
              totalBytes: total,
            });
          }
        },
        () => this.onProgress({ phase: "initializing", delegate }),
      );
    }

    const blob = await getCachedModelBlob(KOKORO_MODEL_ID);
    if (blob) {
      const bytes = new Uint8Array(await readBlobAsArrayBuffer(blob));
      this.onProgress({ phase: "initializing", delegate, loadedBytes: bytes.byteLength });
      return bytes;
    }

    throw new LocalModelNotDownloadedError(KOKORO_MODEL_ID);
  }

  private async createInstance(
    mod: MediaPipeAudioModule,
    fileset: unknown,
    delegate: LocalTtsDelegate,
    totalBytes: number,
  ): Promise<MediaPipeTextToSpeechInstance> {
    const buffer = await this.readModelBuffer(delegate, totalBytes);
    const instance = await mod.TextToSpeech.createFromOptions(fileset, {
      baseOptions: { modelAssetBuffer: buffer, delegate },
      defaultVoiceId: DEFAULT_VOICE_ID,
      defaultLocale: "pt-BR",
    });
    this.onProgress({ phase: "warming", delegate });
    return instance;
  }

  private async initializeInstance(): Promise<MediaPipeTextToSpeechInstance> {
    const meta = await getCachedModelMeta(KOKORO_MODEL_ID);
    if (!meta.cached) {
      throw new LocalModelNotDownloadedError(KOKORO_MODEL_ID);
    }

    this.onProgress({ phase: "runtime", delegate: null, loadedBytes: 0, totalBytes: meta.sizeBytes });
    const mod = await this.moduleLoader.loadModule();
    const fileset = this.useModuleWasm
      ? await mod.FilesetResolver.forAudioTasks(MEDIAPIPE_AUDIO_WASM_URL, true)
      : await mod.FilesetResolver.forAudioTasks(MEDIAPIPE_AUDIO_WASM_URL);
    const preferGpu = detectLocalRuntimeSupport().webGpuSupported;

    if (preferGpu) {
      try {
        const gpuInstance = await this.createInstance(mod, fileset, "GPU", meta.sizeBytes);
        this.instance = gpuInstance;
        return gpuInstance;
      } catch (error) {
        if (error instanceof LocalModelNotDownloadedError) throw error;
        // Fallback automático para CPU (WASM SIMD) se o delegate GPU falhar
      }
    }

    const cpuInstance = await this.createInstance(mod, fileset, "CPU", meta.sizeBytes);
    this.instance = cpuInstance;
    return cpuInstance;
  }

  async synthesizeToWav(
    text: string,
    voiceId = DEFAULT_VOICE_ID,
  ): Promise<LocalTtsWavResult> {
    const cleanText = text.trim();
    if (!cleanText) {
      return {
        buffer: encodeFloat32PcmToWavBuffer(new Float32Array(0), DEFAULT_SAMPLE_RATE_HZ),
        sampleRateHz: DEFAULT_SAMPLE_RATE_HZ,
      };
    }

    const runSynthesis = async (): Promise<LocalTtsWavResult> => {
      const tts = await this.ensureReady();
      const isFirst = !this.hasSynthesized;
      try {
        const result = await tts.synthesize(cleanText, {
          voiceId,
          locale: resolveLiteRtVoiceLocale(voiceId),
        });
        const sampleRateHz = result.sampleRateHz || DEFAULT_SAMPLE_RATE_HZ;
        const buffer = encodeFloat32PcmToWavBuffer(result.samples, sampleRateHz);
        if (isFirst) {
          this.hasSynthesized = true;
          this.onProgress({ phase: "ready" });
        }
        return { buffer, sampleRateHz };
      } catch (error) {
        if (isFirst) this.emitFailure(error);
        throw error;
      }
    };

    const nextTask = this.synthQueue.then(runSynthesis, runSynthesis);
    this.synthQueue = nextTask.then(
      () => undefined,
      () => undefined,
    );
    return nextTask;
  }

  /**
   * Carrega o modelo e faz uma síntese curta descartável, para que a primeira
   * frase real do usuário já saia sem o custo de compilação.
   */
  async warmup(voiceId = DEFAULT_VOICE_ID): Promise<void> {
    if (this.isReady) return;
    await this.synthesizeToWav(WARMUP_TEXT, voiceId);
  }

  cancel(): void {
    this.instance?.cancel();
  }

  dispose(): void {
    try {
      this.instance?.cancel();
      this.instance?.close();
    } finally {
      this.instance = null;
      this.initPromise = null;
      this.hasSynthesized = false;
    }
  }
}
