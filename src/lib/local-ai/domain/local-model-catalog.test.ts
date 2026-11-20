import {
  LOCAL_AI_CACHE_NAME,
  LOCAL_AI_MODELS,
  createInitialModelStates,
  estimateEtaSeconds,
  formatBytes,
  formatSpeed,
  getLocalModelById,
  resolveModelDownloadUrl,
} from "./local-model-catalog";

describe("local-model-catalog", () => {
  it("deve definir os dois modelos esperados (Kokoro 82M TTS e Gemma 4 E2B Chat)", () => {
    expect(LOCAL_AI_CACHE_NAME).toBe("vivavoz-local-ai-models-v1");
    expect(LOCAL_AI_MODELS).toHaveLength(2);

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
});
