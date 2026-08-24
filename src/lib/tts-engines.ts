/** Motores de narração disponíveis no leitor. */
export type TtsEngine = "system" | "google";

export interface VoiceOption {
  id: string;
  label: string;
}

export const TTS_ENGINES: { id: TtsEngine; label: string; hint: string }[] = [
  { id: "system", label: "Sistema (grátis)", hint: "Vozes do navegador/sistema operacional" },
  { id: "google", label: "Google (IA)", hint: "Gemini TTS — melhor qualidade" },
];

export const GOOGLE_VOICES: VoiceOption[] = [
  { id: "Kore", label: "Kore (firme)" },
  { id: "Puck", label: "Puck (animada)" },
  { id: "Charon", label: "Charon (informativa)" },
  { id: "Aoede", label: "Aoede (leve)" },
  { id: "Zephyr", label: "Zephyr (clara)" },
];

export const DEFAULT_VOICE: Record<TtsEngine, string> = {
  system: "",
  google: "Kore",
};

export const VOICE_TIER = {
  PT_BR_NEURAL: 1,
  PT_BR_NEURAL_MULTI: 2,
  PT_BR_CONVENTIONAL: 3,
  PT_GENERIC: 4,
  SYSTEM_FALLBACK: 5,
} as const;

export type VoiceTier = typeof VOICE_TIER[keyof typeof VOICE_TIER];

export interface VoiceOption {
  id: string;
  label: string;
}

/**
 * Classifica a voz de síntese em tiers de qualidade/compatibilidade PT-BR.
 */
export function getVoiceTier(voice: SpeechSynthesisVoice): VoiceTier {
  const name = (voice.name || "").toLowerCase();
  const lang = (voice.lang || "").toLowerCase().replace(/_/g, "-");

  const isPtBr =
    lang === "pt-br" ||
    lang.startsWith("pt-br") ||
    name.includes("brazil") ||
    name.includes("brasil");
  const isGenericPt = lang === "pt" || lang.startsWith("pt-");

  const isNeural = name.includes("natural") || name.includes("neural");
  const isMultilingual = name.includes("multilingual");

  if (isPtBr) {
    if (isNeural && !isMultilingual) {
      return VOICE_TIER.PT_BR_NEURAL;
    }
    if (isNeural && isMultilingual) {
      return VOICE_TIER.PT_BR_NEURAL_MULTI;
    }
    return VOICE_TIER.PT_BR_CONVENTIONAL;
  }

  if (isGenericPt) {
    return VOICE_TIER.PT_GENERIC;
  }

  return VOICE_TIER.SYSTEM_FALLBACK;
}

/**
 * Seleciona o melhor voiceURI disponível seguindo a cascata de prioridades.
 */
export function selectBestPtBrVoice(voices: SpeechSynthesisVoice[]): string {
  if (!voices || voices.length === 0) {
    return "";
  }

  const sorted = [...voices].sort((a, b) => {
    const tierA = getVoiceTier(a);
    const tierB = getVoiceTier(b);

    if (tierA !== tierB) {
      return tierA - tierB;
    }

    if (tierA === VOICE_TIER.SYSTEM_FALLBACK) {
      if (a.default && !b.default) return -1;
      if (!a.default && b.default) return 1;
    }

    return 0;
  });

  return sorted[0].voiceURI ?? "";
}

/**
 * Lista as vozes do sistema ordenadas por relevância PT-BR e desempate alfabético.
 * Aceita um objeto `customWindow` opcional para permitir testes isolados de SSR.
 */
export function listSystemVoices(customWindow?: Window | null): VoiceOption[] {
  const win =
    customWindow !== undefined
      ? customWindow
      : typeof window !== "undefined"
        ? window
        : null;

  if (!win || !win.speechSynthesis || typeof win.speechSynthesis.getVoices !== "function") {
    return [];
  }

  const voices = win.speechSynthesis.getVoices() || [];

  const sorted = [...voices].sort((a, b) => {
    const tierA = getVoiceTier(a);
    const tierB = getVoiceTier(b);

    if (tierA !== tierB) {
      return tierA - tierB;
    }

    return (a.name || "").localeCompare(b.name || "");
  });

  return sorted.map((voice) => ({
    id: voice.voiceURI,
    label: `${voice.name} (${voice.lang})`,
  }));
}