import {
  resetTtsModelCooldowns,
  synthesizeSpeechWithFallback,
} from "./tts-fallback.service";

function buildMinimalWavBytes(pcmPayload: number[] = [1, 2, 3, 4]): Uint8Array {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + pcmPayload.length, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 24000, true);
  view.setUint32(28, 48000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, pcmPayload.length, true);
  const wav = new Uint8Array(44 + pcmPayload.length);
  wav.set(new Uint8Array(header), 0);
  wav.set(new Uint8Array(pcmPayload), 44);
  return wav;
}

function uint8ToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function mockJsonResponse(status: number, body: unknown, headers?: Record<string, string>) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(typeof body === "string" ? body : JSON.stringify(body)),
  } as unknown as Response;
}

describe("tts-fallback.service", () => {
  beforeEach(() => {
    resetTtsModelCooldowns();
    jest.clearAllMocks();
  });

  it("deve sintetizar usando gemini-3.8-flash-tts via Interactions API preservando WAV sem duplicar cabeçalho RIFF", async () => {
    const wavBytes = buildMinimalWavBytes([10, 20, 30, 40]);
    const fetchMock = jest.fn().mockResolvedValue(
      mockJsonResponse(200, {
        steps: [
          {
            type: "model_output",
            content: [{ type: "audio", data: uint8ToBase64(wavBytes) }],
          },
        ],
      }),
    );

    const result = await synthesizeSpeechWithFallback({
      text: "Olá mundo",
      voice: "Kore",
      apiKey: "AIzaSyPrimaryKey123456",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Esperava sucesso");

    expect(result.model.id).toBe("gemini-3.8-flash-tts");
    expect(result.didFallback).toBe(false);
    expect(result.failedModels).toEqual([]);
    expect(result.wav).toEqual(wavBytes);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-goog-api-key": "AIzaSyPrimaryKey123456",
        }),
      }),
    );
  });

  it("deve fazer fallback de 3.8 Flash (429) para 3.8 Flash-Lite (200) e aplicar cooldown na chamada seguinte", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const wavBytes = buildMinimalWavBytes([5, 6, 7, 8]);
    let currentTime = 1_000_000;

    const fetchMock = jest.fn().mockImplementation((_url: string, init?: RequestInit) => {
      const parsed = JSON.parse(String(init?.body ?? "{}")) as { model?: string };
      if (parsed.model === "gemini-3.8-flash-tts") {
        return Promise.resolve(mockJsonResponse(429, "Quota exceeded"));
      }
      return Promise.resolve(
        mockJsonResponse(200, {
          steps: [
            {
              type: "model_output",
              content: [{ type: "audio", data: uint8ToBase64(wavBytes) }],
            },
          ],
        }),
      );
    });

    const first = await synthesizeSpeechWithFallback({
      text: "Trecho 1",
      voice: "Kore",
      apiKey: "AIzaSyCooldownKey123456",
      fetchImpl: fetchMock as unknown as typeof fetch,
      now: () => currentTime,
    });

    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error("Esperava sucesso no fallback");
    expect(first.model.id).toBe("gemini-3.8-flash-lite-tts");
    expect(first.didFallback).toBe(true);
    expect(first.failedModels).toEqual([{ modelId: "gemini-3.8-flash-tts", status: 429 }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // 2ª chamada dentro da janela de cooldown: deve pular gemini-3.8-flash-tts
    fetchMock.mockClear();
    currentTime += 5_000;

    const second = await synthesizeSpeechWithFallback({
      text: "Trecho 2",
      voice: "Kore",
      apiKey: "AIzaSyCooldownKey123456",
      fetchImpl: fetchMock as unknown as typeof fetch,
      now: () => currentTime,
    });

    expect(second.ok).toBe(true);
    if (!second.ok) throw new Error("Esperava sucesso no fallback em cooldown");
    expect(second.model.id).toBe("gemini-3.8-flash-lite-tts");
    expect(second.didFallback).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const secondPayload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as { model?: string };
    expect(secondPayload.model).toBe("gemini-3.8-flash-lite-tts");

    // 3ª chamada após expirar o cooldown de 60s: volta a tentar o modelo principal
    fetchMock.mockClear();
    currentTime += 61_000;
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse(200, {
        steps: [
          {
            type: "model_output",
            content: [{ type: "audio", data: uint8ToBase64(wavBytes) }],
          },
        ],
      }),
    );

    const third = await synthesizeSpeechWithFallback({
      text: "Trecho 3",
      voice: "Kore",
      apiKey: "AIzaSyCooldownKey123456",
      fetchImpl: fetchMock as unknown as typeof fetch,
      now: () => currentTime,
    });

    expect(third.ok).toBe(true);
    if (!third.ok) throw new Error("Esperava recuperação após cooldown");
    expect(third.model.id).toBe("gemini-3.8-flash-tts");
    expect(third.didFallback).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    errorSpy.mockRestore();
  });

  it("deve isolar o cooldown entre chaves de API diferentes", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const wavBytes = buildMinimalWavBytes([9, 9, 9, 9]);

    const fetchMock = jest.fn().mockImplementation((_url: string, init?: RequestInit) => {
      const headers = (init?.headers ?? {}) as Record<string, string>;
      const parsed = JSON.parse(String(init?.body ?? "{}")) as { model?: string };
      if (headers["x-goog-api-key"] === "AIzaSyKeyA123456789" && parsed.model === "gemini-3.8-flash-tts") {
        return Promise.resolve(mockJsonResponse(429, "Rate limit for Key A"));
      }
      return Promise.resolve(
        mockJsonResponse(200, {
          steps: [
            {
              type: "model_output",
              content: [{ type: "audio", data: uint8ToBase64(wavBytes) }],
            },
          ],
        }),
      );
    });

    await synthesizeSpeechWithFallback({
      text: "Teste chave A",
      voice: "Kore",
      apiKey: "AIzaSyKeyA123456789",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const keyBResult = await synthesizeSpeechWithFallback({
      text: "Teste chave B",
      voice: "Kore",
      apiKey: "AIzaSyKeyB987654321",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(keyBResult.ok).toBe(true);
    if (!keyBResult.ok) throw new Error("Esperava sucesso para Chave B");
    expect(keyBResult.model.id).toBe("gemini-3.8-flash-tts");
    expect(keyBResult.didFallback).toBe(false);

    errorSpy.mockRestore();
  });

  it("deve fazer fallback até modelos generateContent (2.5/3.1) e envolver PCM bruto em WAV", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const rawPcm = new Uint8Array([0, 1, 2, 3]);

    const fetchMock = jest.fn().mockImplementation((url: string) => {
      if (url.endsWith("/v1beta/interactions")) {
        return Promise.resolve(mockJsonResponse(404, "Model not found"));
      }
      if (url.includes("gemini-3.1-flash-tts-preview")) {
        return Promise.resolve(mockJsonResponse(503, "Service unavailable"));
      }
      if (url.includes("gemini-2.5-flash-preview-tts")) {
        return Promise.resolve(
          mockJsonResponse(200, {
            candidates: [
              {
                content: {
                  parts: [{ inlineData: { data: uint8ToBase64(rawPcm) } }],
                },
              },
            ],
          }),
        );
      }
      return Promise.resolve(mockJsonResponse(403, "Pro blocked on free tier"));
    });

    const result = await synthesizeSpeechWithFallback({
      text: "Texto legado",
      voice: "Puck",
      apiKey: "AIzaSyLegacyFallback12345",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Esperava sucesso no fallback generateContent");
    expect(result.model.id).toBe("gemini-2.5-flash-preview-tts");
    expect(result.didFallback).toBe(true);
    expect(result.wav.byteLength).toBe(44 + rawPcm.byteLength);
    expect(String.fromCharCode(...result.wav.slice(0, 4))).toBe("RIFF");
    expect(String.fromCharCode(...result.wav.slice(8, 12))).toBe("WAVE");

    errorSpy.mockRestore();
  });

  it("deve abortar imediatamente em 401 sem tentar modelos seguintes", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = jest.fn().mockResolvedValue(mockJsonResponse(401, "Unauthorized"));

    const result = await synthesizeSpeechWithFallback({
      text: "Texto sem chave válida",
      voice: "Kore",
      apiKey: "AIzaSyInvalidKey123456",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Esperava falha 401");
    expect(result.status).toBe(401);
    expect(result.error).toContain("Chave do Google AI Studio inválida");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    errorSpy.mockRestore();
  });

  it("deve retornar erro 429 sanitizado quando todos os modelos estiverem sem cota", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = jest.fn().mockResolvedValue(mockJsonResponse(429, "RESOURCE_EXHAUSTED"));

    const result = await synthesizeSpeechWithFallback({
      text: "Texto sem cota",
      voice: "Kore",
      apiKey: "AIzaSyExhaustedKey12345",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Esperava erro 429");
    expect(result.status).toBe(429);
    expect(result.error).toContain("Cota de narração com IA esgotada");
    expect(fetchMock).toHaveBeenCalledTimes(5);

    errorSpy.mockRestore();
  });
});
