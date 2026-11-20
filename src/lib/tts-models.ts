export type GeminiTtsProtocol = "interactions" | "generateContent";

export interface GeminiTtsModelSpec {
  readonly id: string;
  readonly label: string;
  readonly shortLabel: string;
  readonly tier: "primary" | "lite" | "legacy";
  readonly protocol: GeminiTtsProtocol;
}

export interface ActiveTtsModelInfo {
  id: string;
  label: string;
  shortLabel: string;
  isFallback: boolean;
}

export const TTS_MODEL_HEADER = "X-TTS-Model";
export const TTS_MODEL_LABEL_HEADER = "X-TTS-Model-Label";
export const TTS_FALLBACK_HEADER = "X-TTS-Fallback";

export const GEMINI_TTS_MODELS: readonly GeminiTtsModelSpec[] = [
  {
    id: "gemini-3.8-flash-tts",
    label: "Gemini 3.8 Flash TTS",
    shortLabel: "3.8 Flash",
    tier: "primary",
    protocol: "interactions",
  },
  {
    id: "gemini-3.8-flash-lite-tts",
    label: "Gemini 3.8 Flash-Lite TTS",
    shortLabel: "3.8 Lite",
    tier: "lite",
    protocol: "interactions",
  },
  {
    id: "gemini-3.1-flash-tts-preview",
    label: "Gemini 3.1 Flash TTS",
    shortLabel: "3.1 Flash",
    tier: "legacy",
    protocol: "generateContent",
  },
  {
    id: "gemini-2.5-flash-preview-tts",
    label: "Gemini 2.5 Flash TTS",
    shortLabel: "2.5 Flash",
    tier: "legacy",
    protocol: "generateContent",
  },
  {
    id: "gemini-2.5-pro-preview-tts",
    label: "Gemini 2.5 Pro TTS",
    shortLabel: "2.5 Pro",
    tier: "legacy",
    protocol: "generateContent",
  },
] as const;

export const PRIMARY_GEMINI_TTS_MODEL = GEMINI_TTS_MODELS[0];

/** Localiza a especificação de um modelo TTS pelo seu identificador na Gemini API. */
export function getGeminiTtsModelById(
  id: string | null | undefined,
): GeminiTtsModelSpec | undefined {
  if (!id) return undefined;
  return GEMINI_TTS_MODELS.find((model) => model.id === id);
}

/** Indica se o modelo informado corresponde a um modelo alternativo (fallback). */
export function isFallbackTtsModel(id: string | null | undefined): boolean {
  if (!id) return false;
  return id !== PRIMARY_GEMINI_TTS_MODEL.id;
}

/** Resolve metadados amigáveis do modelo TTS a partir dos headers retornados pelo BFF. */
export function resolveActiveTtsModelInfo(
  modelId: string | null,
  modelLabel: string | null,
  fallbackHeader: string | null,
): ActiveTtsModelInfo | null {
  const cleanId = modelId?.trim();
  if (!cleanId) return null;

  const spec = getGeminiTtsModelById(cleanId);
  const label = modelLabel?.trim() || spec?.label || cleanId;
  const shortLabel = spec?.shortLabel || label;
  const isFallback =
    fallbackHeader === "true"
      ? true
      : fallbackHeader === "false"
        ? false
        : isFallbackTtsModel(cleanId);

  return {
    id: cleanId,
    label,
    shortLabel,
    isFallback,
  };
}
