import { getLocalModelById, resolveLocalTtsModelId } from "../domain/local-model-catalog";
import { encodeFloat32PcmToWavBuffer } from "../domain/pcm-wav-encoder";
import {
  LocalModelNotDownloadedError,
  type LocalModelId,
  type PiperVoiceConfig,
} from "../domain/local-model.types";
import type { LocalTtsProgressEvent } from "../domain/local-tts-load-state";
import { getCachedModelBlob, getCachedModelMeta } from "../storage/model-storage.service";
import type { LocalTtsWavResult } from "./local-tts.runtime";

/**
 * Runtime das vozes Piper (VITS em ONNX):
 * 1. o texto vira ids de fonemas com o espeak-ng compilado para WASM
 *    (`@diffusionstudio/piper-wasm`, o mesmo fonemizador do Piper oficial);
 * 2. o ONNX Runtime Web (backend WASM) gera o áudio a partir desses ids.
 *
 * Os arquivos do runtime vêm do CDN no primeiro uso e ficam guardados na
 * Cache API, para a voz continuar funcionando offline depois disso.
 */
export const ORT_WEB_VERSION = "1.22.0";
export const ORT_WEB_BASE_URL = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_WEB_VERSION}/dist/`;
export const PIPER_PHONEMIZE_BASE_URL =
  "https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize";
export const PIPER_RUNTIME_CACHE_NAME = "vivavoz-piper-runtime-v1";

const DEFAULT_VOICE_ID = "piper:pt_BR-cadu-medium";
/** Pausa entre frases quando o fonemizador divide o texto em várias. */
const SENTENCE_GAP_SECONDS = 0.18;
const WARMUP_TEXT = "Olá.";

// ---- Contratos mínimos das bibliotecas externas (carregadas do CDN) ----

export interface OrtTensorLike {
  readonly data: Float32Array | ArrayLike<number>;
}

export interface OrtSessionLike {
  run(feeds: Record<string, unknown>): Promise<Record<string, OrtTensorLike>>;
  release?(): Promise<void>;
}

export interface OrtModuleLike {
  env: { wasm: Record<string, unknown> };
  Tensor: new (type: string, data: unknown, dims?: readonly number[]) => unknown;
  InferenceSession: {
    create(model: Uint8Array, options?: Record<string, unknown>): Promise<OrtSessionLike>;
  };
}

/** Transforma texto em sequências de ids de fonemas (uma por frase). */
export type PiperPhonemizer = (text: string, espeakVoice: string) => Promise<number[][]>;

export interface PiperRuntimeLoader {
  loadOrt(): Promise<OrtModuleLike>;
  loadPhonemizer(): Promise<PiperPhonemizer>;
}

// ---- Cache dos arquivos do runtime ----

async function fetchRuntimeAsset(url: string): Promise<Response> {
  const cache =
    typeof caches !== "undefined"
      ? await caches.open(PIPER_RUNTIME_CACHE_NAME).catch(() => null)
      : null;
  const cached = await cache?.match(url);
  if (cached) return cached;

  const response = await fetch(url, { mode: "cors", credentials: "omit" });
  if (!response.ok) {
    throw new Error(`Não foi possível baixar o runtime da voz Piper (${response.status}).`);
  }
  if (cache) {
    await cache.put(url, response.clone()).catch(() => undefined);
  }
  return response;
}

async function fetchRuntimeBlobUrl(url: string, type: string): Promise<string> {
  const bytes = await (await fetchRuntimeAsset(url)).arrayBuffer();
  return URL.createObjectURL(new Blob([bytes], { type }));
}

type CreatePiperPhonemize = (moduleArg: Record<string, unknown>) => Promise<{
  callMain(args: string[]): number;
}>;

const defaultLoader: PiperRuntimeLoader = {
  async loadOrt(): Promise<OrtModuleLike> {
    const [entryUrl, glueUrl, wasmUrl] = await Promise.all([
      fetchRuntimeBlobUrl(`${ORT_WEB_BASE_URL}ort.wasm.min.mjs`, "text/javascript"),
      fetchRuntimeBlobUrl(`${ORT_WEB_BASE_URL}ort-wasm-simd-threaded.mjs`, "text/javascript"),
      fetchRuntimeBlobUrl(`${ORT_WEB_BASE_URL}ort-wasm-simd-threaded.wasm`, "application/wasm"),
    ]);
    const ort = (await import(
      /* webpackIgnore: true */ /* turbopackIgnore: true */ entryUrl
    )) as OrtModuleLike;
    ort.env.wasm.wasmPaths = { mjs: glueUrl, wasm: wasmUrl };
    // Multithread exige SharedArrayBuffer (página com cross-origin isolation).
    const isolated =
      typeof globalThis !== "undefined" &&
      (globalThis as { crossOriginIsolated?: boolean }).crossOriginIsolated === true;
    const cores =
      typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 1 : 1;
    ort.env.wasm.numThreads = isolated ? Math.min(4, cores) : 1;
    return ort;
  },

  async loadPhonemizer(): Promise<PiperPhonemizer> {
    const [script, wasmBytes, dataBytes] = await Promise.all([
      fetchRuntimeAsset(`${PIPER_PHONEMIZE_BASE_URL}.js`).then((r) => r.text()),
      fetchRuntimeAsset(`${PIPER_PHONEMIZE_BASE_URL}.wasm`).then((r) => r.arrayBuffer()),
      fetchRuntimeAsset(`${PIPER_PHONEMIZE_BASE_URL}.data`).then((r) => r.arrayBuffer()),
    ]);
    // O build do Emscripten não é um ES module: avalia o script e pega a fábrica.
    const createPiperPhonemize = new Function(
      `${script}\nreturn createPiperPhonemize;`,
    )() as CreatePiperPhonemize;
    const compiled = await WebAssembly.compile(wasmBytes);

    return async (text, espeakVoice) => {
      const lines: string[] = [];
      const errors: string[] = [];
      // Instância nova por chamada: o `main` do fonemizador não foi feito para
      // rodar várias vezes. Com o WASM já compilado e os dados em memória, é barato.
      const instance = await createPiperPhonemize({
        print: (line: string) => lines.push(line),
        printErr: (line: string) => errors.push(line),
        getPreloadedPackage: () => dataBytes,
        instantiateWasm: (
          imports: WebAssembly.Imports,
          receive: (instance: WebAssembly.Instance, module: WebAssembly.Module) => void,
        ) => {
          void WebAssembly.instantiate(compiled, imports).then((inst) => receive(inst, compiled));
          return {};
        },
      });
      instance.callMain([
        "-l",
        espeakVoice,
        "--input",
        JSON.stringify([{ text }]),
        "--espeak_data",
        "/espeak-ng-data",
      ]);

      const sequences: number[][] = [];
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line) as { phoneme_ids?: number[] };
          if (Array.isArray(parsed.phoneme_ids) && parsed.phoneme_ids.length > 0) {
            sequences.push(parsed.phoneme_ids);
          }
        } catch {
          // Linha de log, não de saída
        }
      }
      if (sequences.length === 0 && errors.length > 0) {
        throw new Error(`Falha ao converter o texto em fonemas: ${errors.join(" ")}`);
      }
      return sequences;
    };
  },
};

export interface PiperTtsRuntimeOptions {
  loader?: PiperRuntimeLoader;
  onProgress?: (event: LocalTtsProgressEvent) => void;
}

interface LoadedVoice {
  modelId: LocalModelId;
  config: PiperVoiceConfig;
  session: OrtSessionLike;
}

function concatWithGaps(chunks: Float32Array[], gapSamples: number): Float32Array {
  if (chunks.length === 1) return chunks[0];
  const total =
    chunks.reduce((sum, chunk) => sum + chunk.length, 0) + gapSamples * (chunks.length - 1);
  const out = new Float32Array(total);
  let offset = 0;
  chunks.forEach((chunk, index) => {
    out.set(chunk, offset);
    offset += chunk.length + (index < chunks.length - 1 ? gapSamples : 0);
  });
  return out;
}

/**
 * Mesma interface pública do `LocalTtsRuntime` (Kokoro), para reaproveitar o
 * `LocalTtsEngine` (worker + fallback na thread principal + estado de carga).
 */
export class PiperTtsRuntime {
  private readonly loader: PiperRuntimeLoader;
  private readonly onProgress: (event: LocalTtsProgressEvent) => void;
  private ort: Promise<OrtModuleLike> | null = null;
  private phonemizer: Promise<PiperPhonemizer> | null = null;
  private voice: LoadedVoice | null = null;
  private voicePromise: Promise<LoadedVoice> | null = null;
  private synthQueue: Promise<void> = Promise.resolve();
  private hasSynthesized = false;

  constructor(options: PiperTtsRuntimeOptions = {}) {
    this.loader = options.loader ?? defaultLoader;
    this.onProgress = options.onProgress ?? (() => undefined);
  }

  get isReady(): boolean {
    return this.voice !== null && this.hasSynthesized;
  }

  /** Carrega runtime + modelo da voz. Mantém só uma voz Piper em memória. */
  async ensureReady(voiceId = DEFAULT_VOICE_ID): Promise<LoadedVoice> {
    const modelId = resolveLocalTtsModelId(voiceId);
    if (this.voice?.modelId === modelId) return this.voice;
    if (this.voicePromise) return this.voicePromise;

    this.voicePromise = this.loadVoice(modelId)
      .catch((error: unknown) => {
        this.emitFailure(error);
        throw error;
      })
      .finally(() => {
        this.voicePromise = null;
      });
    return this.voicePromise;
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
          : "Falha ao carregar a voz Piper.",
    });
  }

  private async loadVoice(modelId: LocalModelId): Promise<LoadedVoice> {
    const descriptor = getLocalModelById(modelId);
    if (!descriptor?.piper) {
      throw new Error(`O modelo "${modelId}" não é uma voz Piper.`);
    }
    const meta = await getCachedModelMeta(modelId);
    if (!meta.cached) throw new LocalModelNotDownloadedError(modelId);

    this.onProgress({ phase: "runtime", delegate: "CPU", loadedBytes: 0, totalBytes: meta.sizeBytes });
    this.ort ??= this.loader.loadOrt().catch((error: unknown) => {
      this.ort = null;
      throw error;
    });
    this.phonemizer ??= this.loader.loadPhonemizer().catch((error: unknown) => {
      this.phonemizer = null;
      throw error;
    });
    const ort = await this.ort;
    await this.phonemizer;

    this.onProgress({ phase: "model", delegate: "CPU", loadedBytes: 0, totalBytes: meta.sizeBytes });
    const blob = await getCachedModelBlob(modelId);
    if (!blob) throw new LocalModelNotDownloadedError(modelId);
    const bytes = new Uint8Array(await blob.arrayBuffer());

    this.onProgress({
      phase: "initializing",
      delegate: "CPU",
      loadedBytes: bytes.byteLength,
      totalBytes: bytes.byteLength,
    });
    const session = await ort.InferenceSession.create(bytes, {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all",
    });

    const previous = this.voice;
    this.voice = { modelId, config: descriptor.piper, session };
    this.hasSynthesized = false;
    void previous?.session.release?.().catch(() => undefined);
    this.onProgress({ phase: "warming", delegate: "CPU" });
    return this.voice;
  }

  private async infer(voice: LoadedVoice, phonemeIds: number[]): Promise<Float32Array> {
    const ort = await this.ort!;
    const { config } = voice;
    const ids = BigInt64Array.from(phonemeIds, (id) => BigInt(id));
    const outputs = await voice.session.run({
      input: new ort.Tensor("int64", ids, [1, ids.length]),
      input_lengths: new ort.Tensor("int64", BigInt64Array.from([BigInt(ids.length)]), [1]),
      scales: new ort.Tensor(
        "float32",
        Float32Array.from([config.noiseScale, config.lengthScale, config.noiseW]),
        [3],
      ),
    });
    const output = outputs.output ?? Object.values(outputs)[0];
    return output.data instanceof Float32Array
      ? output.data
      : Float32Array.from(output.data as ArrayLike<number>);
  }

  async synthesizeToWav(text: string, voiceId = DEFAULT_VOICE_ID): Promise<LocalTtsWavResult> {
    const cleanText = text.trim();
    const fallbackRate =
      getLocalModelById(resolveLocalTtsModelId(voiceId))?.piper?.sampleRateHz ?? 22050;
    if (!cleanText) {
      return {
        buffer: encodeFloat32PcmToWavBuffer(new Float32Array(0), fallbackRate),
        sampleRateHz: fallbackRate,
      };
    }

    const run = async (): Promise<LocalTtsWavResult> => {
      const voice = await this.ensureReady(voiceId);
      const isFirst = !this.hasSynthesized;
      try {
        const phonemize = await this.phonemizer!;
        const sequences = await phonemize(cleanText, voice.config.espeakVoice);
        const chunks: Float32Array[] = [];
        for (const ids of sequences) chunks.push(await this.infer(voice, ids));

        const sampleRateHz = voice.config.sampleRateHz;
        const samples = concatWithGaps(
          chunks.length > 0 ? chunks : [new Float32Array(0)],
          Math.round(SENTENCE_GAP_SECONDS * sampleRateHz),
        );
        const buffer = encodeFloat32PcmToWavBuffer(samples, sampleRateHz);
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

    const next = this.synthQueue.then(run, run);
    this.synthQueue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  async warmup(voiceId = DEFAULT_VOICE_ID): Promise<void> {
    if (this.isReady && this.voice?.modelId === resolveLocalTtsModelId(voiceId)) return;
    await this.synthesizeToWav(WARMUP_TEXT, voiceId);
  }

  /** O ONNX Runtime não interrompe uma inferência em andamento; nada a fazer. */
  cancel(): void {}

  dispose(): void {
    const voice = this.voice;
    this.voice = null;
    this.voicePromise = null;
    this.hasSynthesized = false;
    void voice?.session.release?.().catch(() => undefined);
  }
}
