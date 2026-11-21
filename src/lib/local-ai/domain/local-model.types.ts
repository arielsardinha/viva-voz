/**
 * Entidades e contratos de domínio para modelos de IA local (LiteRT-LM / MediaPipe).
 * Armazenamento exclusivo via Cache API (nunca IndexedDB) para pesos binários .litertlm.
 */

export type LocalModelId =
  | "kokoro-82m-tts"
  | "piper-cadu-tts"
  | "piper-faber-tts"
  | "gemma-4-e2b-chat"
  | "gemma-4-e4b-chat";

export type LocalModelCategory = "tts" | "chat";

export type LocalModelModality = "text" | "image" | "audio";

export type LocalModelStatus =
  | "not_downloaded"
  | "downloading"
  | "ready"
  | "error";

export interface LocalModelRuntimeSupport {
  webGpuSupported: boolean;
  cacheApiSupported: boolean;
  wasmSupported: boolean;
}

/**
 * Parâmetros de uma voz Piper (VITS em ONNX), copiados do `.onnx.json` oficial
 * para não precisar baixar o arquivo de configuração separado.
 */
export interface PiperVoiceConfig {
  /** Voz do espeak-ng usada pelo fonemizador (ex.: `pt-br`). */
  readonly espeakVoice: string;
  readonly sampleRateHz: number;
  readonly noiseScale: number;
  readonly lengthScale: number;
  readonly noiseW: number;
}

export interface LocalModelDescriptor {
  readonly id: LocalModelId;
  readonly name: string;
  readonly shortName: string;
  readonly category: LocalModelCategory;
  readonly description: string;
  readonly fileName: string;
  readonly cpuFallbackFileName?: string;
  readonly downloadUrl: string;
  readonly cpuFallbackDownloadUrl?: string;
  readonly sizeBytes: number;
  readonly requiresWebGpu: boolean;
  readonly inputModalities: readonly LocalModelModality[];
  readonly outputModality: LocalModelModality;
  readonly license: string;
  readonly estimatedRamMb: number;
  readonly highlights: readonly string[];
  /** Presente nas vozes Piper: configuração de inferência do modelo ONNX. */
  readonly piper?: PiperVoiceConfig;
  /** Configuração de máquina recomendada, exibida no card. */
  readonly recommendedSpecs: readonly string[];
  /** Só aparece e só pode ser baixado em computadores (nunca em celulares). */
  readonly desktopOnly?: boolean;
  /**
   * Modelos do mesmo grupo são mutuamente exclusivos: para baixar um, o outro
   * precisa ser removido (ex.: Gemma 4 E2B x E4B).
   */
  readonly exclusiveGroup?: "local-chat";
}

export interface LocalModelState {
  id: LocalModelId;
  status: LocalModelStatus;
  downloadedBytes: number;
  totalBytes: number;
  progressPercent: number;
  speedBytesPerSec: number;
  errorMessage: string | null;
  cachedAt: number | null;
  cachedSizeBytes: number;
  /**
   * O arquivo no cache veio de outra URL que a atual do catálogo (ex.: o antigo
   * `gemma-4-E2B-it-web.litertlm`). Continua funcionando; a UI sugere atualizar.
   */
  outdated?: boolean;
}

export interface ModelDownloadProgress {
  downloadedBytes: number;
  totalBytes: number;
  progressPercent: number;
  speedBytesPerSec: number;
}

export interface CachedModelMetadata {
  cached: boolean;
  sizeBytes: number;
  cachedAt: number | null;
  sourceUrl: string | null;
}

export interface ChatAttachment {
  id: string;
  type: "image" | "audio";
  file: Blob;
  name: string;
  mimeType: string;
  previewUrl?: string;
}

export type ChatEnginePreference = "auto" | "cloud" | "gemini-nano" | "litert-lm";

/**
 * Erro de domínio lançado quando o usuário tenta executar um motor local
 * cujo pacote .litertlm ainda não foi baixado para a Cache API.
 */
export class LocalModelNotDownloadedError extends Error {
  readonly modelId: LocalModelId;

  constructor(modelId: LocalModelId, message?: string) {
    super(
      message ??
        `O modelo local "${modelId}" ainda não foi baixado no dispositivo.`,
    );
    this.name = "LocalModelNotDownloadedError";
    this.modelId = modelId;
  }
}
