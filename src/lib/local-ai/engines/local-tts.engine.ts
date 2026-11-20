import { resolveLiteRtVoiceLocale } from "@/lib/tts-engines";
import { encodeFloat32PcmToWavBlob } from "../domain/pcm-wav-encoder";
import { LocalModelNotDownloadedError } from "../domain/local-model.types";
import {
  detectLocalRuntimeSupport,
  getCachedModelBlob,
  getCachedModelMeta,
  getCachedModelStreamReader,
} from "../storage/model-storage.service";

export const MEDIAPIPE_AUDIO_WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-audio@1.2.3/wasm";

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
    forAudioTasks(basePath?: string): Promise<unknown>;
  };
  TextToSpeech: {
    createFromOptions(
      wasmFileset: unknown,
      options: {
        baseOptions: {
          modelAssetBuffer: Uint8Array | ReadableStreamDefaultReader<Uint8Array>;
          delegate: "CPU" | "GPU";
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

async function readModelBuffer(): Promise<
  Uint8Array | ReadableStreamDefaultReader<Uint8Array>
> {
  const reader = await getCachedModelStreamReader("kokoro-82m-tts");
  if (reader) return reader;

  const blob = await getCachedModelBlob("kokoro-82m-tts");
  if (blob) {
    return new Uint8Array(await readBlobAsArrayBuffer(blob));
  }

  throw new LocalModelNotDownloadedError("kokoro-82m-tts");
}

export class LocalTtsEngine {
  private instance: MediaPipeTextToSpeechInstance | null = null;
  private initPromise: Promise<MediaPipeTextToSpeechInstance> | null = null;
  private synthQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly moduleLoader: ILocalTtsModuleLoader = defaultModuleLoader,
  ) {}

  async ensureReady(): Promise<MediaPipeTextToSpeechInstance> {
    if (this.instance) return this.instance;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.initializeInstance().finally(() => {
      this.initPromise = null;
    });
    return this.initPromise;
  }

  private async initializeInstance(): Promise<MediaPipeTextToSpeechInstance> {
    const meta = await getCachedModelMeta("kokoro-82m-tts");
    if (!meta.cached) {
      throw new LocalModelNotDownloadedError("kokoro-82m-tts");
    }

    const mod = await this.moduleLoader.loadModule();
    const fileset = await mod.FilesetResolver.forAudioTasks(
      MEDIAPIPE_AUDIO_WASM_URL,
    );
    const preferGpu = detectLocalRuntimeSupport().webGpuSupported;

    if (preferGpu) {
      try {
        const buffer = await readModelBuffer();
        const gpuInstance = await mod.TextToSpeech.createFromOptions(fileset, {
          baseOptions: { modelAssetBuffer: buffer, delegate: "GPU" },
          defaultVoiceId: "pf_dora",
          defaultLocale: "pt-BR",
        });
        this.instance = gpuInstance;
        return gpuInstance;
      } catch {
        // Fallback automático para CPU (WASM SIMD) se o delegate GPU falhar
      }
    }

    const cpuBuffer = await readModelBuffer();
    const cpuInstance = await mod.TextToSpeech.createFromOptions(fileset, {
      baseOptions: { modelAssetBuffer: cpuBuffer, delegate: "CPU" },
      defaultVoiceId: "pf_dora",
      defaultLocale: "pt-BR",
    });
    this.instance = cpuInstance;
    return cpuInstance;
  }

  async synthesizeToWavBlob(
    text: string,
    voiceId = "pf_dora",
  ): Promise<{ blob: Blob; sampleRateHz: number }> {
    const cleanText = text.trim();
    if (!cleanText) {
      return {
        blob: encodeFloat32PcmToWavBlob(new Float32Array(0), 24000),
        sampleRateHz: 24000,
      };
    }

    const runSynthesis = async (): Promise<{ blob: Blob; sampleRateHz: number }> => {
      const tts = await this.ensureReady();
      const result = await tts.synthesize(cleanText, {
        voiceId,
        locale: resolveLiteRtVoiceLocale(voiceId),
      });
      const sampleRateHz = result.sampleRateHz || 24000;
      const blob = encodeFloat32PcmToWavBlob(result.samples, sampleRateHz);
      return { blob, sampleRateHz };
    };

    const nextTask = this.synthQueue.then(runSynthesis, runSynthesis);
    this.synthQueue = nextTask.then(
      () => undefined,
      () => undefined,
    );
    return nextTask;
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
    }
  }
}

let singletonInstance: LocalTtsEngine | null = null;

export function getLocalTtsEngine(): LocalTtsEngine {
  if (!singletonInstance) {
    singletonInstance = new LocalTtsEngine();
  }
  return singletonInstance;
}

export function resetLocalTtsEngineForTests(
  customLoader?: ILocalTtsModuleLoader,
): LocalTtsEngine {
  singletonInstance?.dispose();
  singletonInstance = customLoader
    ? new LocalTtsEngine(customLoader)
    : null;
  return singletonInstance ?? getLocalTtsEngine();
}
