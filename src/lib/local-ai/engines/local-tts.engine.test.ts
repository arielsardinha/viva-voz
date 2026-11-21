import { LocalModelNotDownloadedError } from "../domain/local-model.types";
import type { LocalTtsProgressEvent } from "../domain/local-tts-load-state";
import { LocalTtsEngine, type LocalTtsWorkerLike } from "./local-tts.engine";
import type { LocalTtsWorkerRequest, LocalTtsWorkerResponse } from "./local-tts.protocol";
import type { LocalTtsRuntime } from "./local-tts.runtime";

class FakeWorker implements LocalTtsWorkerLike {
  readonly sent: LocalTtsWorkerRequest[] = [];
  terminated = false;
  private messageListeners: Array<(event: MessageEvent<LocalTtsWorkerResponse>) => void> = [];
  private errorListeners: Array<(event: Event) => void> = [];

  postMessage(message: LocalTtsWorkerRequest): void {
    this.sent.push(message);
  }

  addEventListener(type: "message" | "error", listener: (event: never) => void): void {
    if (type === "message") {
      this.messageListeners.push(
        listener as unknown as (event: MessageEvent<LocalTtsWorkerResponse>) => void,
      );
    } else {
      this.errorListeners.push(listener as unknown as (event: Event) => void);
    }
  }

  terminate(): void {
    this.terminated = true;
  }

  emit(message: LocalTtsWorkerResponse): void {
    for (const listener of this.messageListeners) {
      listener({ data: message } as MessageEvent<LocalTtsWorkerResponse>);
    }
  }

  crash(): void {
    for (const listener of this.errorListeners) listener(new Event("error"));
  }

  lastSynthesizeId(): number {
    const request = [...this.sent].reverse().find((m) => m.type === "synthesize");
    if (!request || request.type !== "synthesize") throw new Error("sem síntese");
    return request.id;
  }
}

function makeMainThreadRuntime() {
  let progress: ((event: LocalTtsProgressEvent) => void) | null = null;
  const runtime = {
    synthesizeToWav: jest.fn(async () => {
      progress?.({ phase: "ready" });
      return { buffer: new ArrayBuffer(46), sampleRateHz: 24000 };
    }),
    warmup: jest.fn(async () => undefined),
    cancel: jest.fn(),
    dispose: jest.fn(),
  };
  const factory = jest.fn(async (onProgress: (event: LocalTtsProgressEvent) => void) => {
    progress = onProgress;
    return runtime as unknown as LocalTtsRuntime;
  });
  return { runtime, factory };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("LocalTtsEngine (fachada com Web Worker)", () => {
  it("deve sintetizar no worker e reconstruir o WAV a partir do ArrayBuffer transferido", async () => {
    const worker = new FakeWorker();
    const engine = new LocalTtsEngine({ createWorker: async () => worker });

    const promise = engine.synthesizeToWavBlob("Olá VivaVoz", "pm_alex");
    await flush();

    expect(worker.sent).toEqual([
      { type: "synthesize", id: 1, text: "Olá VivaVoz", voiceId: "pm_alex" },
    ]);
    worker.emit({ type: "result", id: 1, buffer: new ArrayBuffer(50), sampleRateHz: 24000 });

    const result = await promise;
    expect(result.blob.type).toBe("audio/wav");
    expect(result.blob.size).toBe(50);
    expect(result.sampleRateHz).toBe(24000);
  });

  it("deve refletir o progresso do worker no estado observável e notificar assinantes", async () => {
    const worker = new FakeWorker();
    const engine = new LocalTtsEngine({ createWorker: async () => worker });
    const listener = jest.fn();
    engine.subscribe(listener);

    await engine.warmup();
    expect(worker.sent).toEqual([{ type: "warmup", voiceId: "pf_dora" }]);

    worker.emit({ type: "progress", event: { phase: "runtime", totalBytes: 1000 } });
    expect(engine.getLoadState().phase).toBe("runtime");
    expect(engine.getLoadState().startedAt).not.toBeNull();

    worker.emit({
      type: "progress",
      event: { phase: "model", delegate: "GPU", loadedBytes: 500, totalBytes: 1000 },
    });
    expect(engine.getLoadState()).toMatchObject({
      phase: "model",
      delegate: "GPU",
      loadedBytes: 500,
      totalBytes: 1000,
    });

    // warmup enquanto carrega não dispara outra mensagem
    await engine.warmup();
    expect(worker.sent).toHaveLength(1);

    worker.emit({ type: "progress", event: { phase: "ready" } });
    expect(engine.getLoadState().phase).toBe("ready");
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("deve preservar LocalModelNotDownloadedError e voltar ao estado ocioso", async () => {
    const worker = new FakeWorker();
    const engine = new LocalTtsEngine({ createWorker: async () => worker });

    const promise = engine.synthesizeToWavBlob("Frase", "pf_dora");
    await flush();
    worker.emit({ type: "progress", event: { phase: "runtime" } });
    worker.emit({
      type: "error",
      id: worker.lastSynthesizeId(),
      stage: "init",
      error: {
        name: "LocalModelNotDownloadedError",
        message: "não baixado",
        modelId: "kokoro-82m-tts",
      },
    });

    await expect(promise).rejects.toBeInstanceOf(LocalModelNotDownloadedError);
    expect(engine.getLoadState().phase).toBe("idle");
    expect(worker.terminated).toBe(false);
  });

  it("deve cair para a thread principal quando o MediaPipe não inicializa no worker", async () => {
    const worker = new FakeWorker();
    const { runtime, factory } = makeMainThreadRuntime();
    const engine = new LocalTtsEngine({
      createWorker: async () => worker,
      createMainThreadRuntime: factory,
    });

    const promise = engine.synthesizeToWavBlob("Frase", "pf_dora");
    await flush();
    worker.emit({ type: "progress", event: { phase: "error", errorMessage: "document is not defined" } });
    // O erro do worker não deve aparecer para o usuário: ainda há o fallback.
    expect(engine.getLoadState().phase).not.toBe("error");

    worker.emit({
      type: "error",
      id: worker.lastSynthesizeId(),
      stage: "init",
      error: { name: "ReferenceError", message: "document is not defined" },
    });

    const result = await promise;
    expect(worker.terminated).toBe(true);
    expect(runtime.synthesizeToWav).toHaveBeenCalledWith("Frase", "pf_dora");
    expect(result.blob.size).toBe(46);

    // Próximas chamadas vão direto para a thread principal
    await engine.synthesizeToWavBlob("Outra", "pf_dora");
    expect(runtime.synthesizeToWav).toHaveBeenCalledTimes(2);
  });

  it("não deve cair para a thread principal se a falha vier do modelo (após o runtime subir)", async () => {
    const worker = new FakeWorker();
    const { runtime, factory } = makeMainThreadRuntime();
    const engine = new LocalTtsEngine({
      createWorker: async () => worker,
      createMainThreadRuntime: factory,
    });

    const promise = engine.synthesizeToWavBlob("Frase", "pf_dora");
    await flush();
    worker.emit({ type: "progress", event: { phase: "runtime" } });
    worker.emit({
      type: "progress",
      event: { phase: "model", delegate: "CPU", loadedBytes: 10, totalBytes: 10 },
    });
    worker.emit({
      type: "error",
      id: worker.lastSynthesizeId(),
      stage: "init",
      error: { name: "Error", message: "Invalid magic number" },
    });

    await expect(promise).rejects.toThrow("Invalid magic number");
    expect(worker.terminated).toBe(false);
    expect(factory).not.toHaveBeenCalled();
    expect(runtime.synthesizeToWav).not.toHaveBeenCalled();
    expect(engine.getLoadState()).toMatchObject({
      phase: "error",
      errorMessage: "Invalid magic number",
    });
  });

  it("deve refazer pedidos pendentes na thread principal se o worker quebrar", async () => {
    const worker = new FakeWorker();
    const { runtime, factory } = makeMainThreadRuntime();
    const engine = new LocalTtsEngine({
      createWorker: async () => worker,
      createMainThreadRuntime: factory,
    });

    const promise = engine.synthesizeToWavBlob("Frase", "pf_dora");
    await flush();
    worker.crash();

    await expect(promise).resolves.toMatchObject({ sampleRateHz: 24000 });
    expect(runtime.synthesizeToWav).toHaveBeenCalledTimes(1);
  });

  it("deve usar a thread principal quando Web Workers não estão disponíveis", async () => {
    const { runtime, factory } = makeMainThreadRuntime();
    const engine = new LocalTtsEngine({
      createWorker: async () => null,
      createMainThreadRuntime: factory,
    });

    await engine.synthesizeToWavBlob("Frase", "pf_dora");
    expect(runtime.synthesizeToWav).toHaveBeenCalledTimes(1);
    expect(engine.getLoadState().phase).toBe("ready");
  });

  it("deve reportar erro de carregamento e permitir fechar o aviso", async () => {
    const worker = new FakeWorker();
    const engine = new LocalTtsEngine({ createWorker: async () => worker });

    const promise = engine.synthesizeToWavBlob("Frase", "pf_dora");
    await flush();
    worker.emit({ type: "progress", event: { phase: "warming", delegate: "CPU" } });
    worker.emit({
      type: "error",
      id: worker.lastSynthesizeId(),
      stage: "synthesize",
      error: { name: "Error", message: "Falha na inferência" },
    });

    await expect(promise).rejects.toThrow("Falha na inferência");
    expect(engine.getLoadState()).toMatchObject({
      phase: "error",
      errorMessage: "Falha na inferência",
    });

    engine.dismissLoadError();
    expect(engine.getLoadState().phase).toBe("idle");
  });

  it("deve encerrar o worker, rejeitar pendências e zerar o estado no dispose", async () => {
    const worker = new FakeWorker();
    const engine = new LocalTtsEngine({ createWorker: async () => worker });

    const promise = engine.synthesizeToWavBlob("Frase", "pf_dora");
    await flush();
    worker.emit({ type: "progress", event: { phase: "runtime" } });
    engine.cancel();
    expect(worker.sent.at(-1)).toEqual({ type: "cancel" });

    engine.dispose();
    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
    expect(worker.terminated).toBe(true);
    expect(engine.getLoadState().phase).toBe("idle");
  });

  it("deve devolver WAV vazio sem acionar o worker para texto em branco", async () => {
    const createWorker = jest.fn(async () => new FakeWorker());
    const engine = new LocalTtsEngine({ createWorker });

    const result = await engine.synthesizeToWavBlob("   ");
    expect(result.blob.size).toBe(44);
    expect(createWorker).not.toHaveBeenCalled();
  });
});
