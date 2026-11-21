import { encodeFloat32PcmToWavBlob } from "../domain/pcm-wav-encoder";
import {
  INITIAL_LOCAL_TTS_LOAD_STATE,
  applyLocalTtsProgress,
  isLocalTtsLoading,
  type LocalTtsLoadPhase,
  type LocalTtsLoadState,
  type LocalTtsProgressEvent,
} from "../domain/local-tts-load-state";
import {
  deserializeLocalTtsError,
  isModelMissingError,
  type LocalTtsWorkerRequest,
  type LocalTtsWorkerResponse,
  type SerializedLocalTtsError,
} from "./local-tts.protocol";
import type { LocalTtsRuntime } from "./local-tts.runtime";

export { MEDIAPIPE_AUDIO_WASM_URL } from "./local-tts.runtime";

const DEFAULT_VOICE_ID = "pf_dora";
const DEFAULT_SAMPLE_RATE_HZ = 24000;

/** Subconjunto de `Worker` usado pelo engine (facilita testes com fakes). */
export interface LocalTtsWorkerLike {
  postMessage(message: LocalTtsWorkerRequest): void;
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<LocalTtsWorkerResponse>) => void,
  ): void;
  addEventListener(type: "error", listener: (event: Event) => void): void;
  terminate(): void;
}

export interface LocalTtsEngineOptions {
  /** Cria o worker; `null` força a execução na thread principal. */
  createWorker?: () => Promise<LocalTtsWorkerLike | null>;
  /** Cria o runtime de fallback na thread principal. */
  createMainThreadRuntime?: (
    onProgress: (event: LocalTtsProgressEvent) => void,
  ) => Promise<LocalTtsRuntime>;
}

interface PendingSynthesis {
  text: string;
  voiceId: string;
  resolve: (value: { blob: Blob; sampleRateHz: number }) => void;
  reject: (reason: unknown) => void;
}

const defaultCreateWorker = async (): Promise<LocalTtsWorkerLike | null> => {
  const { createLocalTtsWorker } = await import("./create-local-tts-worker");
  return createLocalTtsWorker();
};

const defaultCreateMainThreadRuntime = async (
  onProgress: (event: LocalTtsProgressEvent) => void,
): Promise<LocalTtsRuntime> => {
  const { LocalTtsRuntime } = await import("./local-tts.runtime");
  return new LocalTtsRuntime({ onProgress });
};

function wavBlob(buffer: ArrayBuffer): Blob {
  return new Blob([buffer], { type: "audio/wav" });
}

/**
 * Fachada do TTS local usada pela UI. Roda o Kokoro em um Web Worker e expõe
 * o estado do carregamento inicial para o popup de progresso. Se o worker não
 * puder ser criado (ou o MediaPipe falhar dentro dele), cai para a thread
 * principal com a mesma API.
 */
export class LocalTtsEngine {
  private state: LocalTtsLoadState = INITIAL_LOCAL_TTS_LOAD_STATE;
  private readonly listeners = new Set<() => void>();
  private worker: LocalTtsWorkerLike | null = null;
  private workerPromise: Promise<LocalTtsWorkerLike | null> | null = null;
  private mainThreadRuntime: Promise<LocalTtsRuntime> | null = null;
  private useMainThread = false;
  /** Última etapa (sem erro) reportada pelo worker atual. */
  private workerPhase: LocalTtsLoadPhase = "idle";
  private readonly pending = new Map<number, PendingSynthesis>();
  private nextRequestId = 1;
  private readonly createWorker: () => Promise<LocalTtsWorkerLike | null>;
  private readonly createMainThreadRuntime: NonNullable<
    LocalTtsEngineOptions["createMainThreadRuntime"]
  >;

  constructor(options: LocalTtsEngineOptions = {}) {
    this.createWorker = options.createWorker ?? defaultCreateWorker;
    this.createMainThreadRuntime =
      options.createMainThreadRuntime ?? defaultCreateMainThreadRuntime;
  }

  // ---- Estado observável (useSyncExternalStore) ----

  getLoadState = (): LocalTtsLoadState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private setState(next: LocalTtsLoadState): void {
    if (next === this.state) return;
    this.state = next;
    for (const listener of this.listeners) listener();
  }

  private handleProgress = (event: LocalTtsProgressEvent): void => {
    this.setState(applyLocalTtsProgress(this.state, event));
  };

  // ---- Worker ----

  private async getWorker(): Promise<LocalTtsWorkerLike | null> {
    if (this.useMainThread) return null;
    if (this.worker) return this.worker;
    if (!this.workerPromise) {
      this.workerPromise = this.createWorker()
        .then((worker) => {
          if (!worker) {
            this.useMainThread = true;
            return null;
          }
          worker.addEventListener("message", (event) =>
            this.handleWorkerMessage(worker, event.data),
          );
          worker.addEventListener("error", (event) =>
            this.fallBackToMainThread(
              worker,
              event instanceof ErrorEvent ? event.message : "erro ao carregar o worker",
            ),
          );
          this.worker = worker;
          this.workerPhase = "idle";
          return worker;
        })
        .catch(() => {
          this.useMainThread = true;
          return null;
        })
        .finally(() => {
          this.workerPromise = null;
        });
    }
    return this.workerPromise;
  }

  private handleWorkerMessage(
    worker: LocalTtsWorkerLike,
    message: LocalTtsWorkerResponse,
  ): void {
    if (worker !== this.worker) return;

    switch (message.type) {
      case "progress":
        // Erros são tratados abaixo, para decidir antes se vale o fallback.
        if (message.event.phase !== "error") {
          this.workerPhase = message.event.phase;
          this.handleProgress(message.event);
        }
        return;
      case "result": {
        const request = this.pending.get(message.id);
        if (!request) return;
        this.pending.delete(message.id);
        request.resolve({ blob: wavBlob(message.buffer), sampleRateHz: message.sampleRateHz });
        return;
      }
      case "error":
        this.handleWorkerError(worker, message.id, message.stage, message.error);
        return;
    }
  }

  private handleWorkerError(
    worker: LocalTtsWorkerLike,
    id: number | null,
    stage: "init" | "synthesize",
    serialized: SerializedLocalTtsError,
  ): void {
    if (
      stage === "init" &&
      !isModelMissingError(serialized) &&
      (this.workerPhase === "idle" || this.workerPhase === "runtime")
    ) {
      // O runtime do MediaPipe não subiu no worker: tenta na thread principal.
      // Falhas depois disso (modelo inválido, por exemplo) se repetiriam lá e
      // ainda travariam a UI, então são reportadas como erro.
      this.fallBackToMainThread(worker, serialized.message);
      return;
    }

    if (isModelMissingError(serialized)) {
      this.handleProgress({ phase: "idle" });
    } else if (isLocalTtsLoading(this.state)) {
      this.handleProgress({ phase: "error", errorMessage: serialized.message });
    }

    if (id === null) return;
    const request = this.pending.get(id);
    if (!request) return;
    this.pending.delete(id);
    request.reject(deserializeLocalTtsError(serialized));
  }

  private fallBackToMainThread(worker: LocalTtsWorkerLike, reason: string): void {
    if (worker !== this.worker) return;
    console.warn(`[TTS local] Worker indisponível, usando a thread principal: ${reason}`);
    try {
      worker.terminate();
    } catch {
      // Worker já encerrado
    }
    this.worker = null;
    this.useMainThread = true;

    const retry = Array.from(this.pending.values());
    this.pending.clear();
    if (retry.length === 0 && isLocalTtsLoading(this.state)) {
      // Era só um warmup: refaz na thread principal para o progresso não travar.
      void this.getMainThreadRuntime()
        .then((runtime) => runtime.warmup())
        .catch(() => undefined);
    }
    for (const request of retry) {
      this.synthesizeOnMainThread(request.text, request.voiceId).then(
        request.resolve,
        request.reject,
      );
    }
  }

  // ---- Thread principal (fallback) ----

  private getMainThreadRuntime(): Promise<LocalTtsRuntime> {
    if (!this.mainThreadRuntime) {
      this.mainThreadRuntime = this.createMainThreadRuntime(this.handleProgress);
    }
    return this.mainThreadRuntime;
  }

  private async synthesizeOnMainThread(
    text: string,
    voiceId: string,
  ): Promise<{ blob: Blob; sampleRateHz: number }> {
    const runtime = await this.getMainThreadRuntime();
    const { buffer, sampleRateHz } = await runtime.synthesizeToWav(text, voiceId);
    return { blob: wavBlob(buffer), sampleRateHz };
  }

  // ---- API pública ----

  async synthesizeToWavBlob(
    text: string,
    voiceId = DEFAULT_VOICE_ID,
  ): Promise<{ blob: Blob; sampleRateHz: number }> {
    if (!text.trim()) {
      return {
        blob: encodeFloat32PcmToWavBlob(new Float32Array(0), DEFAULT_SAMPLE_RATE_HZ),
        sampleRateHz: DEFAULT_SAMPLE_RATE_HZ,
      };
    }

    const worker = await this.getWorker();
    if (!worker) return this.synthesizeOnMainThread(text, voiceId);

    const id = this.nextRequestId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { text, voiceId, resolve, reject });
      worker.postMessage({ type: "synthesize", id, text, voiceId });
    });
  }

  /**
   * Pré-carrega o modelo em segundo plano (com uma síntese curta descartável).
   * Seguro chamar várias vezes; falhas não são propagadas, só refletidas no estado.
   */
  async warmup(voiceId = DEFAULT_VOICE_ID): Promise<void> {
    if (this.state.phase === "ready" || isLocalTtsLoading(this.state)) return;

    const worker = await this.getWorker();
    if (worker) {
      worker.postMessage({ type: "warmup", voiceId });
      return;
    }
    try {
      const runtime = await this.getMainThreadRuntime();
      await runtime.warmup(voiceId);
    } catch {
      // Estado de erro já foi emitido pelo runtime
    }
  }

  /** Fecha o aviso de erro do carregamento (volta ao estado ocioso). */
  dismissLoadError(): void {
    if (this.state.phase === "error") this.handleProgress({ phase: "idle" });
  }

  cancel(): void {
    this.worker?.postMessage({ type: "cancel" });
    void this.mainThreadRuntime?.then((runtime) => runtime.cancel()).catch(() => undefined);
  }

  dispose(): void {
    const worker = this.worker;
    this.worker = null;
    this.workerPromise = null;
    this.useMainThread = false;
    if (worker) {
      try {
        worker.postMessage({ type: "dispose" });
        worker.terminate();
      } catch {
        // Worker já encerrado
      }
    }

    const runtime = this.mainThreadRuntime;
    this.mainThreadRuntime = null;
    void runtime?.then((r) => r.dispose()).catch(() => undefined);

    const aborted = Array.from(this.pending.values());
    this.pending.clear();
    for (const request of aborted) {
      request.reject(new DOMException("Motor de voz local encerrado.", "AbortError"));
    }

    this.setState(INITIAL_LOCAL_TTS_LOAD_STATE);
  }
}

let singletonInstance: LocalTtsEngine | null = null;

export function getLocalTtsEngine(): LocalTtsEngine {
  if (!singletonInstance) {
    singletonInstance = new LocalTtsEngine();
  }
  return singletonInstance;
}

export function resetLocalTtsEngineForTests(
  options?: LocalTtsEngineOptions,
): LocalTtsEngine {
  singletonInstance?.dispose();
  singletonInstance = new LocalTtsEngine(options);
  return singletonInstance;
}
