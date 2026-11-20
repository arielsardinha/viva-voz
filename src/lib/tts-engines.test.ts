import {
  DEFAULT_VOICE,
  GOOGLE_VOICES,
  LITERT_VOICES,
  TTS_ENGINES,
  getVoicesForEngine,
  resolveLiteRtVoiceLocale,
} from "./tts-engines";

describe("tts-engines", () => {
  it("deve disponibilizar os três motores de narração incluindo IA Local (Offline)", () => {
    expect(TTS_ENGINES.map((e) => e.id)).toEqual(["system", "litert", "google"]);
    expect(DEFAULT_VOICE.litert).toBe("pf_dora");
    expect(LITERT_VOICES.map((v) => v.id)).toContain("pf_dora");
    expect(LITERT_VOICES.map((v) => v.id)).toContain("pm_alex");
    expect(LITERT_VOICES.map((v) => v.id)).toContain("pm_santa");
  });

  it("deve retornar as vozes adequadas para cada motor", () => {
    const sysVoices = [{ id: "sys-1", label: "Sistema PT-BR" }];
    expect(getVoicesForEngine("system", sysVoices)).toEqual(sysVoices);
    expect(getVoicesForEngine("google", sysVoices)).toEqual(GOOGLE_VOICES);
    expect(getVoicesForEngine("litert", sysVoices)).toEqual(LITERT_VOICES);
  });

  it("deve resolver o locale BCP-47 correto para vozes Kokoro", () => {
    expect(resolveLiteRtVoiceLocale("pf_dora")).toBe("pt-BR");
    expect(resolveLiteRtVoiceLocale("pm_alex")).toBe("pt-BR");
    expect(resolveLiteRtVoiceLocale("af_heart")).toBe("en-US");
    expect(resolveLiteRtVoiceLocale("am_michael")).toBe("en-US");
  });
});
