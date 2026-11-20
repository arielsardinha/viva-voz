import { LocalModelNotDownloadedError } from "../domain/local-model.types";
import * as storageService from "../storage/model-storage.service";
import {
  LocalTtsEngine,
  MEDIAPIPE_AUDIO_WASM_URL,
  type ILocalTtsModuleLoader,
  type MediaPipeTextToSpeechInstance,
} from "./local-tts.engine";

jest.mock("../storage/model-storage.service", () => ({
  detectLocalRuntimeSupport: jest.fn(),
  getCachedModelMeta: jest.fn(),
  getCachedModelBlob: jest.fn(),
  getCachedModelStreamReader: jest.fn(),
}));

const mockedStorage = storageService as jest.Mocked<typeof storageService>;

describe("LocalTtsEngine", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve lançar LocalModelNotDownloadedError quando o modelo Kokoro não estiver na Cache API", async () => {
    mockedStorage.getCachedModelMeta.mockResolvedValue({
      cached: false,
      sizeBytes: 0,
      cachedAt: null,
      sourceUrl: null,
    });

    const loader: ILocalTtsModuleLoader = {
      loadModule: jest.fn(),
    };
    const engine = new LocalTtsEngine(loader);

    await expect(engine.synthesizeToWavBlob("Olá mundo", "pf_dora")).rejects.toThrow(
      LocalModelNotDownloadedError,
    );
    expect(loader.loadModule).not.toHaveBeenCalled();
  });

  it("deve sintetizar áudio PCM para WAV usando Kokoro e fazer fallback de GPU para CPU", async () => {
    mockedStorage.getCachedModelMeta.mockResolvedValue({
      cached: true,
      sizeBytes: 128,
      cachedAt: Date.now(),
      sourceUrl: "https://example.com/kokoro.litertlm",
    });
    mockedStorage.detectLocalRuntimeSupport.mockReturnValue({
      webGpuSupported: true,
      cacheApiSupported: true,
      wasmSupported: true,
    });
    mockedStorage.getCachedModelStreamReader.mockImplementation(async () =>
      new ReadableStream<Uint8Array>().getReader(),
    );

    const mockSynthesize = jest.fn().mockResolvedValue({
      samples: new Float32Array([0.1, -0.2, 0.3]),
      sampleRateHz: 24000,
    });
    const mockTtsInstance: MediaPipeTextToSpeechInstance = {
      synthesize: mockSynthesize,
      cancel: jest.fn(),
      close: jest.fn(),
    };

    const createFromOptions = jest
      .fn()
      .mockRejectedValueOnce(new Error("WebGPU delegate unavailable"))
      .mockResolvedValueOnce(mockTtsInstance);
    const forAudioTasks = jest.fn().mockResolvedValue({ wasm: true });

    const engine = new LocalTtsEngine({
      loadModule: async () => ({
        FilesetResolver: { forAudioTasks },
        TextToSpeech: { createFromOptions },
      }),
    });

    const result = await engine.synthesizeToWavBlob("Olá VivaVoz", "pf_dora");

    expect(forAudioTasks).toHaveBeenCalledWith(MEDIAPIPE_AUDIO_WASM_URL);
    expect(createFromOptions).toHaveBeenCalledTimes(2);
    expect(createFromOptions.mock.calls[0]?.[1].baseOptions.delegate).toBe("GPU");
    expect(createFromOptions.mock.calls[1]?.[1].baseOptions.delegate).toBe("CPU");
    expect(mockSynthesize).toHaveBeenCalledWith("Olá VivaVoz", {
      voiceId: "pf_dora",
      locale: "pt-BR",
    });
    expect(result.sampleRateHz).toBe(24000);
    expect(result.blob.type).toBe("audio/wav");
    expect(result.blob.size).toBe(44 + 3 * 2);

    engine.cancel();
    expect(mockTtsInstance.cancel).toHaveBeenCalled();

    engine.dispose();
    expect(mockTtsInstance.close).toHaveBeenCalled();
  });

  it("deve serializar chamadas concorrentes na fila WASM sem sobrescrever estado", async () => {
    mockedStorage.getCachedModelMeta.mockResolvedValue({
      cached: true,
      sizeBytes: 64,
      cachedAt: Date.now(),
      sourceUrl: "https://example.com/kokoro.litertlm",
    });
    mockedStorage.detectLocalRuntimeSupport.mockReturnValue({
      webGpuSupported: false,
      cacheApiSupported: true,
      wasmSupported: true,
    });
    mockedStorage.getCachedModelStreamReader.mockResolvedValue(null);
    mockedStorage.getCachedModelBlob.mockResolvedValue(
      new Blob([new Uint8Array([1, 2, 3])]),
    );

    const callOrder: string[] = [];
    const mockTtsInstance: MediaPipeTextToSpeechInstance = {
      synthesize: jest.fn(async (text: string) => {
        callOrder.push(`start:${text}`);
        await Promise.resolve();
        callOrder.push(`end:${text}`);
        return { samples: new Float32Array([0.1]), sampleRateHz: 24000 };
      }),
      cancel: jest.fn(),
      close: jest.fn(),
    };

    const engine = new LocalTtsEngine({
      loadModule: async () => ({
        FilesetResolver: { forAudioTasks: jest.fn().mockResolvedValue({}) },
        TextToSpeech: {
          createFromOptions: jest.fn().mockResolvedValue(mockTtsInstance),
        },
      }),
    });

    await Promise.all([
      engine.synthesizeToWavBlob("Frase 1", "pm_alex"),
      engine.synthesizeToWavBlob("Frase 2", "pm_santa"),
    ]);

    expect(callOrder).toEqual([
      "start:Frase 1",
      "end:Frase 1",
      "start:Frase 2",
      "end:Frase 2",
    ]);
  });
});
