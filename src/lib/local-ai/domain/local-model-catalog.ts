import type {
  LocalModelDescriptor,
  LocalModelId,
  LocalModelState,
} from "./local-model.types";

export const LOCAL_AI_CACHE_NAME = "vivavoz-local-ai-models-v1";

export const LOCAL_AI_MODELS: readonly LocalModelDescriptor[] = [
  {
    id: "kokoro-82m-tts",
    name: "Kokoro 82M (Voz Neural PT-BR)",
    shortName: "Kokoro 82M",
    category: "tts",
    description:
      "Motor de síntese de voz neural 100% offline com suporte nativo a Português Brasileiro (vozes Dora, Alex e Santa) e execução via WebGPU ou WASM.",
    fileName: "kokoro_int8_gpu_fp16.litertlm",
    cpuFallbackFileName: "kokoro_int8_fp16.litertlm",
    downloadUrl:
      "https://huggingface.co/litert-community/Kokoro-82M/resolve/main/kokoro_int8_gpu_fp16.litertlm",
    cpuFallbackDownloadUrl:
      "https://huggingface.co/litert-community/Kokoro-82M/resolve/main/kokoro_int8_fp16.litertlm",
    sizeBytes: 294_750_530,
    requiresWebGpu: false,
    inputModalities: ["text"],
    outputModality: "audio",
    license: "Apache-2.0",
    estimatedRamMb: 450,
    highlights: [
      "Narração fluida em Português do Brasil sem chave de API",
      "Funciona totalmente offline após o download inicial",
      "Compatível com WebGPU e CPU (WASM SIMD)",
    ],
  },
  {
    id: "piper-cadu-tts",
    name: "Piper · Voz Cadu (PT-BR)",
    shortName: "Piper Cadu",
    category: "tts",
    description:
      "Voz masculina brasileira (Cadu) do Piper, leve e 100% offline, executada via ONNX Runtime Web (WASM) dentro de um Web Worker.",
    fileName: "pt_BR-cadu-medium.onnx",
    downloadUrl:
      "https://huggingface.co/rhasspy/piper-voices/resolve/main/pt/pt_BR/cadu/medium/pt_BR-cadu-medium.onnx",
    sizeBytes: 63_221_984,
    requiresWebGpu: false,
    inputModalities: ["text"],
    outputModality: "audio",
    license: "CC0-1.0",
    estimatedRamMb: 250,
    highlights: [
      "Voz masculina natural em Português do Brasil",
      "Download leve (~60 MB) e funciona offline",
      "Roda em CPU (WASM), inclusive em celulares sem WebGPU",
    ],
    piper: {
      espeakVoice: "pt-br",
      sampleRateHz: 22050,
      noiseScale: 0.5,
      lengthScale: 1.0,
      noiseW: 0.333,
    },
  },
  {
    id: "piper-faber-tts",
    name: "Piper · Voz Faber (PT-BR)",
    shortName: "Piper Faber",
    category: "tts",
    description:
      "Voz brasileira Faber do Piper, leve e 100% offline, executada via ONNX Runtime Web (WASM) dentro de um Web Worker.",
    fileName: "pt_BR-faber-medium.onnx",
    downloadUrl:
      "https://huggingface.co/rhasspy/piper-voices/resolve/main/pt/pt_BR/faber/medium/pt_BR-faber-medium.onnx",
    sizeBytes: 63_221_984,
    requiresWebGpu: false,
    inputModalities: ["text"],
    outputModality: "audio",
    license: "CC0-1.0 (dataset) · base Hi-Fi TTS CC-BY-4.0",
    estimatedRamMb: 250,
    highlights: [
      "Voz natural em Português do Brasil",
      "Download leve (~60 MB) e funciona offline",
      "Roda em CPU (WASM), inclusive em celulares sem WebGPU",
    ],
    piper: {
      espeakVoice: "pt-br",
      sampleRateHz: 22050,
      noiseScale: 0.5,
      lengthScale: 1.0,
      noiseW: 0.333,
    },
  },
  {
    id: "gemma-4-e2b-chat",
    name: "Gemma 4 E2B Multimodal (Chat Local)",
    shortName: "Gemma 4 E2B",
    category: "chat",
    description:
      "Modelo multimodal LiteRT-LM para conversar sobre documentos localmente no navegador com suporte a texto, imagens e áudios via WebGPU.",
    fileName: "gemma-4-E2B-it-web.litertlm",
    downloadUrl:
      "https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it-web.litertlm",
    sizeBytes: 2_008_432_640,
    requiresWebGpu: true,
    inputModalities: ["text", "image", "audio"],
    outputModality: "text",
    license: "Gemma Terms of Use",
    estimatedRamMb: 2600,
    highlights: [
      "Entrada multimodal: texto, imagens e áudios → texto",
      "Processamento privado 100% local via @litert-lm/core",
      "Ideal para estudar documentos offline sem consumir API",
    ],
  },
] as const;

/** Central única de gestão dos modelos locais (substituiu o antigo menu lateral). */
export const LOCAL_MODELS_PAGE_PATH = "/modelos";

/** URL da central `/modelos`; com `modelId`, o card correspondente aparece destacado. */
export function buildModelsPageHref(modelId?: LocalModelId | null): string {
  if (!modelId) return LOCAL_MODELS_PAGE_PATH;
  return `${LOCAL_MODELS_PAGE_PATH}?model=${encodeURIComponent(modelId)}`;
}

export function getLocalModelById(
  id: LocalModelId,
): LocalModelDescriptor | undefined {
  return LOCAL_AI_MODELS.find((model) => model.id === id);
}

export function resolveModelDownloadUrl(
  descriptor: LocalModelDescriptor,
  hasWebGpu: boolean,
): string {
  if (!hasWebGpu && descriptor.cpuFallbackDownloadUrl) {
    return descriptor.cpuFallbackDownloadUrl;
  }
  return descriptor.downloadUrl;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const kb = 1024;
  const mb = kb * 1024;
  const gb = mb * 1024;
  if (bytes >= gb) return `${(bytes / gb).toFixed(2)} GB`;
  if (bytes >= mb) return `${(bytes / mb).toFixed(1)} MB`;
  if (bytes >= kb) return `${(bytes / kb).toFixed(1)} KB`;
  return `${Math.round(bytes)} B`;
}

export function formatSpeed(bytesPerSec: number): string {
  if (!Number.isFinite(bytesPerSec) || bytesPerSec <= 0) return "0 KB/s";
  const mb = 1024 * 1024;
  if (bytesPerSec >= mb) return `${(bytesPerSec / mb).toFixed(1)} MB/s`;
  return `${Math.max(1, Math.round(bytesPerSec / 1024))} KB/s`;
}

export function estimateEtaSeconds(
  remainingBytes: number,
  speedBytesPerSec: number,
): number | null {
  if (!Number.isFinite(speedBytesPerSec) || speedBytesPerSec <= 0) return null;
  if (remainingBytes <= 0) return 0;
  return Math.ceil(remainingBytes / speedBytesPerSec);
}

export function createInitialModelStates(): Record<LocalModelId, LocalModelState> {
  const states = {} as Record<LocalModelId, LocalModelState>;
  for (const model of LOCAL_AI_MODELS) {
    states[model.id] = {
      id: model.id,
      status: "not_downloaded",
      downloadedBytes: 0,
      totalBytes: model.sizeBytes,
      progressPercent: 0,
      speedBytesPerSec: 0,
      errorMessage: null,
      cachedAt: null,
      cachedSizeBytes: 0,
    };
  }
  return states;
}

/** Modelos de voz (TTS) locais, na ordem em que aparecem no catálogo. */
export const LOCAL_TTS_MODEL_IDS: readonly LocalModelId[] = LOCAL_AI_MODELS.filter(
  (model) => model.category === "tts",
).map((model) => model.id);

/** Prefixo dos ids de voz do Piper (ex.: `piper:pt_BR-cadu-medium`). */
export const PIPER_VOICE_PREFIX = "piper:";

const PIPER_VOICE_MODELS: Readonly<Record<string, LocalModelId>> = {
  "piper:pt_BR-cadu-medium": "piper-cadu-tts",
  "piper:pt_BR-faber-medium": "piper-faber-tts",
};

export function isPiperVoiceId(voiceId: string | null | undefined): boolean {
  return !!voiceId && voiceId.startsWith(PIPER_VOICE_PREFIX);
}

/** Modelo local que precisa estar baixado para narrar com a voz informada. */
export function resolveLocalTtsModelId(voiceId: string | null | undefined): LocalModelId {
  if (voiceId && PIPER_VOICE_MODELS[voiceId]) return PIPER_VOICE_MODELS[voiceId];
  return "kokoro-82m-tts";
}

/** Voz padrão de cada modelo de TTS local (usada ao ativar o modelo). */
export function getDefaultVoiceForLocalModel(modelId: LocalModelId): string | null {
  if (modelId === "kokoro-82m-tts") return "pf_dora";
  const entry = Object.entries(PIPER_VOICE_MODELS).find(([, id]) => id === modelId);
  return entry ? entry[0] : null;
}
