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
