/** Motores de narração disponíveis no leitor. */
export type TtsEngine = "system" | "google" | "litert";

export interface VoiceOption {
  id: string;
  label: string;
}

export const TTS_ENGINES: { id: TtsEngine; label: string; hint: string }[] = [
  { id: "system", label: "Sistema (grátis)", hint: "Vozes do navegador/sistema operacional" },
  { id: "litert", label: "IA Local (Offline)", hint: "Kokoro 82M e Piper — vozes neurais no dispositivo" },
  { id: "google", label: "Google (IA)", hint: "Gemini TTS — melhor qualidade" },
];

export const GOOGLE_VOICES: VoiceOption[] = [
  { id: "Kore", label: "Kore (firme)" },
  { id: "Puck", label: "Puck (animada)" },
  { id: "Charon", label: "Charon (informativa)" },
  { id: "Aoede", label: "Aoede (leve)" },
  { id: "Zephyr", label: "Zephyr (clara)" },
];

export const LITERT_VOICES: VoiceOption[] = [
  { id: "pf_dora", label: "Dora (PT-BR · Feminina)" },
  { id: "pm_alex", label: "Alex (PT-BR · Masculina)" },
  { id: "pm_santa", label: "Santa (PT-BR · Grave)" },
  { id: "piper:pt_BR-cadu-medium", label: "Cadu (PT-BR · Masculina · Piper)" },
  { id: "af_heart", label: "Heart (EN-US · Feminina)" },
  { id: "am_michael", label: "Michael (EN-US · Masculina)" },
];

export const DEFAULT_VOICE: Record<TtsEngine, string> = {
  system: "",
  google: "Kore",
  litert: "pf_dora",
};

/** Resolve o idioma BCP-47 correspondente a uma voz do Kokoro 82M. */
export function resolveLiteRtVoiceLocale(voiceId: string): string {
  if (voiceId.startsWith("af_") || voiceId.startsWith("am_")) {
    return "en-US";
  }
  return "pt-BR";
}

/** Retorna a lista de vozes disponíveis conforme o motor selecionado. */
export function getVoicesForEngine(
  engine: TtsEngine,
  systemVoices: VoiceOption[],
): VoiceOption[] {
  if (engine === "system") return systemVoices;
  if (engine === "litert") return LITERT_VOICES;
  return GOOGLE_VOICES;
}

/** Vozes instaladas no navegador/sistema, priorizando português. */
export function listSystemVoices(): VoiceOption[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  return window.speechSynthesis
    .getVoices()
    .slice()
    .sort((a, b) => {
      const score = (v: SpeechSynthesisVoice) => (v.lang.toLowerCase().startsWith("pt") ? 0 : 1);
      return score(a) - score(b) || a.name.localeCompare(b.name);
    })
    .map((voice) => ({ id: voice.voiceURI, label: `${voice.name} (${voice.lang})` }));
}
