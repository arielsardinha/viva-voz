import { LocalModelNotDownloadedError } from "../domain/local-model.types";
import type { LocalTtsProgressEvent } from "../domain/local-tts-load-state";
import * as storageService from "../storage/model-storage.service";
import {
  PiperTtsRuntime,
  type OrtModuleLike,
  type PiperRuntimeLoader,
} from "./piper-tts.runtime";

jest.mock("../storage/model-storage.service", () => ({
  getCachedModelMeta: jest.fn(),
  getCachedModelBlob: jest.fn(),
}));

const mockedStorage = storageService as jest.Mocked<typeof storageService>;
const CADU = "piper:pt_BR-cadu-medium";

class FakeTensor {
  constructor(
    readonly type: string,
    readonly data: unknown,
    readonly dims?: readonly number[],
  ) {}
}

function makeLoader(sequences: number[][] = [[1, 0, 20, 0, 2]]) {
  const run = jest.fn(async (feeds: Record<string, FakeTensor>) => {
    const length = (feeds.input.data as BigInt64Array).length;
    return { output: { data: new Float32Array(length * 10).fill(0.25) } };
  });
  const release = jest.fn(async () => undefined);
  const create = jest.fn(async () => ({ run, release }));
  const ort: OrtModuleLike = {
    env: { wasm: {} },
    Tensor: FakeTensor as unknown as OrtModuleLike["Tensor"],
    InferenceSession: { create },
  };
  const phonemize = jest.fn(async () => sequences);
  const loader: PiperRuntimeLoader = {
    loadOrt: jest.fn(async () => ort),
    loadPhonemizer: jest.fn(async () => phonemize),
  };
  return { loader, run, create, release, phonemize };
}

function mockModelCached(cached: boolean) {
  mockedStorage.getCachedModelMeta.mockResolvedValue({
    cached,
    sizeBytes: cached ? 16 : 0,
    cachedAt: cached ? Date.now() : null,
    sourceUrl: null,
  });
  mockedStorage.getCachedModelBlob.mockResolvedValue(
    cached ? ({ arrayBuffer: async () => new ArrayBuffer(16) } as unknown as Blob) : null,
  );
}

describe("PiperTtsRuntime", () => {
  beforeEach(() => jest.clearAllMocks());

  it("lança LocalModelNotDownloadedError (piper-cadu-tts) sem carregar o runtime", async () => {
    mockModelCached(false);
    const { loader } = makeLoader();
    const runtime = new PiperTtsRuntime({ loader });

    const error = await runtime.synthesizeToWav("Olá", CADU).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(LocalModelNotDownloadedError);
    expect((error as LocalModelNotDownloadedError).modelId).toBe("piper-cadu-tts");
    expect(loader.loadOrt).not.toHaveBeenCalled();
  });

  it("fonemiza com espeak pt-br e roda o ONNX com os parâmetros da voz Cadu", async () => {
    mockModelCached(true);
    const { loader, run, create, phonemize } = makeLoader();
    const events: LocalTtsProgressEvent[] = [];
    const runtime = new PiperTtsRuntime({ loader, onProgress: (e) => events.push(e) });

    const result = await runtime.synthesizeToWav("Olá mundo.", CADU);

    expect(phonemize).toHaveBeenCalledWith("Olá mundo.", "pt-br");
    expect(create).toHaveBeenCalledTimes(1);
    const feeds = run.mock.calls[0][0] as Record<string, FakeTensor>;
    expect(Array.from(feeds.input.data as BigInt64Array, Number)).toEqual([1, 0, 20, 0, 2]);
    expect(feeds.input.dims).toEqual([1, 5]);
    expect(Array.from(feeds.input_lengths.data as BigInt64Array, Number)).toEqual([5]);
    expect(Array.from(feeds.scales.data as Float32Array)).toEqual([
      0.5,
      1,
      expect.closeTo(0.333, 5),
    ]);

    expect(result.sampleRateHz).toBe(22050);
    // Cabeçalho WAV (44 bytes) + 50 amostras PCM 16-bit.
    expect(result.buffer.byteLength).toBe(44 + 50 * 2);
    expect(events.map((e) => e.phase)).toEqual([
      "runtime",
      "model",
      "initializing",
      "warming",
      "ready",
    ]);
  });

  it("sintetiza cada frase separadamente e junta com uma pausa curta", async () => {
    mockModelCached(true);
    const { loader, run } = makeLoader([
      [1, 2],
      [1, 2, 3],
    ]);
    const runtime = new PiperTtsRuntime({ loader });

    const result = await runtime.synthesizeToWav("Primeira. Segunda.", CADU);

    expect(run).toHaveBeenCalledTimes(2);
    const gap = Math.round(0.18 * 22050);
    expect(result.buffer.byteLength).toBe(44 + (20 + 30 + gap) * 2);
  });

  it("carrega o modelo uma vez só e libera a sessão no dispose", async () => {
    mockModelCached(true);
    const { loader, create, release } = makeLoader();
    const runtime = new PiperTtsRuntime({ loader });

    await runtime.warmup(CADU);
    await runtime.synthesizeToWav("De novo.", CADU);
    expect(create).toHaveBeenCalledTimes(1);
    expect(runtime.isReady).toBe(true);

    runtime.dispose();
    expect(release).toHaveBeenCalledTimes(1);
    expect(runtime.isReady).toBe(false);
  });

  it("devolve WAV vazio para texto em branco sem carregar nada", async () => {
    const { loader } = makeLoader();
    const runtime = new PiperTtsRuntime({ loader });
    const result = await runtime.synthesizeToWav("   ", CADU);
    expect(result.buffer.byteLength).toBe(44);
    expect(loader.loadOrt).not.toHaveBeenCalled();
  });
});
