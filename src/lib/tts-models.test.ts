import {
  GEMINI_TTS_MODELS,
  PRIMARY_GEMINI_TTS_MODEL,
  TTS_FALLBACK_HEADER,
  TTS_MODEL_HEADER,
  TTS_MODEL_LABEL_HEADER,
  getGeminiTtsModelById,
  isFallbackTtsModel,
  resolveActiveTtsModelInfo,
} from "./tts-models";

describe("tts-models", () => {
  it("deve definir a cascata de modelos na ordem esperada com Gemini 3.8 Flash como principal", () => {
    expect(PRIMARY_GEMINI_TTS_MODEL.id).toBe("gemini-3.8-flash-tts");
    expect(PRIMARY_GEMINI_TTS_MODEL.protocol).toBe("interactions");
    expect(GEMINI_TTS_MODELS.map((m) => m.id)).toEqual([
      "gemini-3.8-flash-tts",
      "gemini-3.8-flash-lite-tts",
      "gemini-3.1-flash-tts-preview",
      "gemini-2.5-flash-preview-tts",
      "gemini-2.5-pro-preview-tts",
    ]);
  });

  it("deve expor os nomes canônicos de headers HTTP", () => {
    expect(TTS_MODEL_HEADER).toBe("X-TTS-Model");
    expect(TTS_MODEL_LABEL_HEADER).toBe("X-TTS-Model-Label");
    expect(TTS_FALLBACK_HEADER).toBe("X-TTS-Fallback");
  });

  it("deve localizar especificações pelo ID via getGeminiTtsModelById", () => {
    const lite = getGeminiTtsModelById("gemini-3.8-flash-lite-tts");
    expect(lite).toEqual({
      id: "gemini-3.8-flash-lite-tts",
      label: "Gemini 3.8 Flash-Lite TTS",
      shortLabel: "3.8 Lite",
      tier: "lite",
      protocol: "interactions",
    });

    const legacy = getGeminiTtsModelById("gemini-2.5-flash-preview-tts");
    expect(legacy?.protocol).toBe("generateContent");
    expect(legacy?.tier).toBe("legacy");

    expect(getGeminiTtsModelById("modelo-inexistente")).toBeUndefined();
    expect(getGeminiTtsModelById(null)).toBeUndefined();
    expect(getGeminiTtsModelById(undefined)).toBeUndefined();
  });

  it("deve identificar corretamente modelos de fallback em isFallbackTtsModel", () => {
    expect(isFallbackTtsModel("gemini-3.8-flash-tts")).toBe(false);
    expect(isFallbackTtsModel("gemini-3.8-flash-lite-tts")).toBe(true);
    expect(isFallbackTtsModel("gemini-2.5-flash-preview-tts")).toBe(true);
    expect(isFallbackTtsModel(null)).toBe(false);
    expect(isFallbackTtsModel("")).toBe(false);
  });

  it("deve resolver metadados de modelo ativo a partir dos headers HTTP", () => {
    expect(resolveActiveTtsModelInfo(null, null, null)).toBeNull();

    expect(
      resolveActiveTtsModelInfo("gemini-3.8-flash-tts", null, "false"),
    ).toEqual({
      id: "gemini-3.8-flash-tts",
      label: "Gemini 3.8 Flash TTS",
      shortLabel: "3.8 Flash",
      isFallback: false,
    });

    expect(
      resolveActiveTtsModelInfo(
        "gemini-3.8-flash-lite-tts",
        "Gemini 3.8 Flash-Lite TTS",
        "true",
      ),
    ).toEqual({
      id: "gemini-3.8-flash-lite-tts",
      label: "Gemini 3.8 Flash-Lite TTS",
      shortLabel: "3.8 Lite",
      isFallback: true,
    });

    // Quando fallbackHeader não for explícito, infere pelo ID do modelo
    expect(
      resolveActiveTtsModelInfo("gemini-3.1-flash-tts-preview", null, null),
    ).toEqual({
      id: "gemini-3.1-flash-tts-preview",
      label: "Gemini 3.1 Flash TTS",
      shortLabel: "3.1 Flash",
      isFallback: true,
    });
  });
});
