import {
  LOCAL_AI_CACHE_NAME,
  LOCAL_MODELS_PAGE_PATH,
  buildModelsPageHref,
  LOCAL_AI_MODELS,
  createInitialModelStates,
  estimateEtaSeconds,
  formatBytes,
  formatSpeed,
  getLocalModelById,
  resolveModelDownloadUrl,
  LOCAL_TTS_MODEL_IDS,
  getDefaultVoiceForLocalModel,
  isPiperVoiceId,
  resolveLocalTtsModelId,
} from "./local-model-catalog";

describe("local-model-catalog", () => {
  it("deve montar a URL da central /modelos destacando o modelo pedido", () => {
    expect(LOCAL_MODELS_PAGE_PATH).toBe("/modelos");
    expect(buildModelsPageHref()).toBe("/modelos");
    expect(buildModelsPageHref(null)).toBe("/modelos");
    expect(buildModelsPageHref("kokoro-82m-tts")).toBe(
      "/modelos?model=kokoro-82m-tts",
    );
    expect(buildModelsPageHref("gemma-4-e2b-chat")).toBe(
      "/modelos?model=gemma-4-e2b-chat",
    );
  });

  it("deve definir os modelos esperados (Kokoro 82M, Piper Cadu/Faber e Gemma 4 E2B)", () => {
    expect(LOCAL_AI_CACHE_NAME).toBe("vivavoz-local-ai-models-v1");
    expect(LOCAL_AI_MODELS).toHaveLength(4);

    const faber = getLocalModelById("piper-faber-tts");
    expect(faber?.category).toBe("tts");
    expect(faber?.sizeBytes).toBe(63_221_984);
    expect(faber?.downloadUrl).toContain("pt_BR-faber-medium.onnx");
    expect(faber?.piper?.espeakVoice).toBe("pt-br");

    const cadu = getLocalModelById("piper-cadu-tts");
    expect(cadu?.category).toBe("tts");
    expect(cadu?.sizeBytes).toBe(63_221_984);
    expect(cadu?.license).toBe("CC0-1.0");
    expect(cadu?.downloadUrl).toContain("pt_BR-cadu-medium.onnx");
    expect(cadu?.piper).toEqual({
      espeakVoice: "pt-br",
      sampleRateHz: 22050,
      noiseScale: 0.5,
      lengthScale: 1.0,
      noiseW: 0.333,
    });

    const kokoro = getLocalModelById("kokoro-82m-tts");
    expect(kokoro).toBeDefined();
    expect(kokoro?.category).toBe("tts");
    expect(kokoro?.sizeBytes).toBe(294_750_530);
    expect(kokoro?.requiresWebGpu).toBe(false);
    expect(kokoro?.inputModalities).toEqual(["text"]);
    expect(kokoro?.outputModality).toBe("audio");

    const gemma = getLocalModelById("gemma-4-e2b-chat");
    expect(gemma).toBeDefined();
    expect(gemma?.category).toBe("chat");
    expect(gemma?.sizeBytes).toBe(2_008_432_640);
    expect(gemma?.requiresWebGpu).toBe(true);
    expect(gemma?.inputModalities).toEqual(["text", "image", "audio"]);
    expect(gemma?.outputModality).toBe("text");
  });

  it("deve resolver URL GPU ou fallback CPU para modelos com variante CPU", () => {
    const kokoro = getLocalModelById("kokoro-82m-tts")!;
    expect(resolveModelDownloadUrl(kokoro, true)).toContain("kokoro_int8_gpu_fp16.litertlm");
    expect(resolveModelDownloadUrl(kokoro, false)).toContain("kokoro_int8_fp16.litertlm");

    const gemma = getLocalModelById("gemma-4-e2b-chat")!;
    expect(resolveModelDownloadUrl(gemma, true)).toContain("gemma-4-E2B-it-web.litertlm");
    expect(resolveModelDownloadUrl(gemma, false)).toContain("gemma-4-E2B-it-web.litertlm");
  });

  it("deve formatar tamanhos, velocidades e estimativa de tempo corretamente", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(294_750_530)).toBe("281.1 MB");
    expect(formatBytes(2_008_432_640)).toBe("1.87 GB");

    expect(formatSpeed(0)).toBe("0 KB/s");
    expect(formatSpeed(5 * 1024 * 1024)).toBe("5.0 MB/s");

    expect(estimateEtaSeconds(1000, 0)).toBeNull();
    expect(estimateEtaSeconds(0, 1000)).toBe(0);
    expect(estimateEtaSeconds(1000, 250)).toBe(4);
  });

  it("deve criar estados iniciais limpos para todos os modelos do catálogo", () => {
    const initial = createInitialModelStates();
    expect(initial["kokoro-82m-tts"].status).toBe("not_downloaded");
    expect(initial["kokoro-82m-tts"].totalBytes).toBe(294_750_530);
    expect(initial["kokoro-82m-tts"].progressPercent).toBe(0);
    expect(initial["gemma-4-e2b-chat"].status).toBe("not_downloaded");
    expect(initial["gemma-4-e2b-chat"].totalBytes).toBe(2_008_432_640);
  });

  it("deve mapear cada voz local para o modelo que precisa estar baixado", () => {
    expect(LOCAL_TTS_MODEL_IDS).toEqual(["kokoro-82m-tts", "piper-cadu-tts", "piper-faber-tts"]);
    expect(resolveLocalTtsModelId("piper:pt_BR-faber-medium")).toBe("piper-faber-tts");
    expect(getDefaultVoiceForLocalModel("piper-faber-tts")).toBe("piper:pt_BR-faber-medium");
    expect(isPiperVoiceId("piper:pt_BR-cadu-medium")).toBe(true);
    expect(isPiperVoiceId("pf_dora")).toBe(false);
    expect(isPiperVoiceId(undefined)).toBe(false);
    expect(resolveLocalTtsModelId("piper:pt_BR-cadu-medium")).toBe("piper-cadu-tts");
    expect(resolveLocalTtsModelId("pm_alex")).toBe("kokoro-82m-tts");
    expect(resolveLocalTtsModelId("")).toBe("kokoro-82m-tts");
    expect(getDefaultVoiceForLocalModel("kokoro-82m-tts")).toBe("pf_dora");
    expect(getDefaultVoiceForLocalModel("piper-cadu-tts")).toBe("piper:pt_BR-cadu-medium");
    expect(getDefaultVoiceForLocalModel("gemma-4-e2b-chat")).toBeNull();
    expect(createInitialModelStates()["piper-cadu-tts"].totalBytes).toBe(63_221_984);
  });
});
