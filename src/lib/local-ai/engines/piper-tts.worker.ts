/**
 * Web Worker das vozes Piper: fonemização (espeak-ng WASM) e inferência
 * (ONNX Runtime Web) rodam fora da thread principal, sem travar a UI.
 * Usa o mesmo protocolo de mensagens do worker do Kokoro.
 */
import { PiperTtsRuntime } from "./piper-tts.runtime";
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
}

const scope = self as unknown as WorkerScope;

const post = (message: LocalTtsWorkerResponse, transfer?: Transferable[]) =>
  scope.postMessage(message, transfer);

const runtime = new PiperTtsRuntime({
  onProgress: (event) => post({ type: "progress", event }),
});

async function ensureRuntimeReady(id: number | null, voiceId?: string): Promise<boolean> {
  try {
    await runtime.ensureReady(voiceId);
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
        if (!(await ensureRuntimeReady(null, request.voiceId))) return;
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
        if (!(await ensureRuntimeReady(request.id, request.voiceId))) return;
        try {
          const { buffer, sampleRateHz } = await runtime.synthesizeToWav(
            request.text,
            request.voiceId,
          );
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
