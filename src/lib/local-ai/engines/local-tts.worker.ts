/**
 * Web Worker dedicado ao Kokoro local: carrega o MediaPipe e roda a síntese
 * fora da thread principal, para a UI não travar durante a inferência.
 */
import { LocalTtsRuntime } from "./local-tts.runtime";
import {
  serializeLocalTtsError,
  type LocalTtsWorkerRequest,
  type LocalTtsWorkerResponse,
} from "./local-tts.protocol";

interface WorkerScope {
  postMessage(message: LocalTtsWorkerResponse, transfer?: Transferable[]): void;
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<LocalTtsWorkerRequest>) => void,
  ): void;
  importScripts?: (...urls: string[]) => void;
  /** Hook usado pelo loader do MediaPipe quando `importScripts` não existe. */
  import?: (url: string) => Promise<unknown>;
}

const scope = self as unknown as WorkerScope;

/**
 * O bundler pode entregar o worker como clássico (Turbopack usa um bootstrap
 * com `importScripts`) ou como module worker. `importScripts()` sem argumentos
 * é no-op no clássico e lança TypeError no module worker.
 */
function isModuleWorker(): boolean {
  if (typeof scope.importScripts !== "function") return true;
  try {
    scope.importScripts();
    return false;
  } catch {
    return true;
  }
}

const moduleWorker = isModuleWorker();

if (moduleWorker) {
  // Em module workers o MediaPipe recorre a `self.import(url)`. Sem este hook
  // o bundler tentaria resolver o `import()` dinâmico da URL do CDN em build.
  scope.import = (url: string) =>
    import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url);
}

const post = (message: LocalTtsWorkerResponse, transfer?: Transferable[]) =>
  scope.postMessage(message, transfer);

const runtime = new LocalTtsRuntime({
  // Clássico: script UMD via importScripts. Module worker: variante ES module.
  useModuleWasm: moduleWorker,
  onProgress: (event) => post({ type: "progress", event }),
});

async function ensureRuntimeReady(id: number | null): Promise<boolean> {
  try {
    await runtime.ensureReady();
    return true;
  } catch (error) {
    post({ type: "error", id, stage: "init", error: serializeLocalTtsError(error) });
    return false;
  }
}

scope.addEventListener("message", (event) => {
  const request = event.data;
  switch (request.type) {
    case "warmup": {
      void (async () => {
        if (!(await ensureRuntimeReady(null))) return;
        try {
          await runtime.warmup(request.voiceId);
        } catch (error) {
          post({ type: "error", id: null, stage: "synthesize", error: serializeLocalTtsError(error) });
        }
      })();
      return;
    }
    case "synthesize": {
      void (async () => {
        if (!(await ensureRuntimeReady(request.id))) return;
        try {
          const { buffer, sampleRateHz } = await runtime.synthesizeToWav(
            request.text,
            request.voiceId,
          );
          // Transfere o ArrayBuffer em vez de copiar o áudio entre threads.
          post({ type: "result", id: request.id, buffer, sampleRateHz }, [buffer]);
        } catch (error) {
          post({
            type: "error",
            id: request.id,
            stage: "synthesize",
            error: serializeLocalTtsError(error),
          });
        }
      })();
      return;
    }
    case "cancel":
      runtime.cancel();
      return;
    case "dispose":
      runtime.dispose();
      return;
  }
});
