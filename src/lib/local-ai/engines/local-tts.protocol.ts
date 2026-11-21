import { LocalModelNotDownloadedError, type LocalModelId } from "../domain/local-model.types";
import type { LocalTtsProgressEvent } from "../domain/local-tts-load-state";

/** Mensagens da thread principal para o worker de TTS local. */
export type LocalTtsWorkerRequest =
  | { type: "warmup"; voiceId?: string }
  | { type: "synthesize"; id: number; text: string; voiceId: string }
  | { type: "cancel" }
  | { type: "dispose" };

export interface SerializedLocalTtsError {
  name: string;
  message: string;
  modelId?: LocalModelId;
}

/** Mensagens do worker para a thread principal. */
export type LocalTtsWorkerResponse =
  | { type: "progress"; event: LocalTtsProgressEvent }
  | { type: "result"; id: number; buffer: ArrayBuffer; sampleRateHz: number }
  | {
      type: "error";
      id: number | null;
      /**
       * `init`: o runtime não conseguiu subir dentro do worker. A thread
       * principal pode tentar de novo fora do worker.
       */
      stage: "init" | "synthesize";
      error: SerializedLocalTtsError;
    };

export function serializeLocalTtsError(error: unknown): SerializedLocalTtsError {
  if (error instanceof LocalModelNotDownloadedError) {
    return { name: error.name, message: error.message, modelId: error.modelId };
  }
  if (error instanceof Error) {
    return { name: error.name || "Error", message: error.message };
  }
  return { name: "Error", message: String(error ?? "Erro desconhecido no TTS local.") };
}

/** Recria o erro do lado da UI, preservando `instanceof LocalModelNotDownloadedError`. */
export function deserializeLocalTtsError(serialized: SerializedLocalTtsError): Error {
  if (serialized.name === "LocalModelNotDownloadedError") {
    return new LocalModelNotDownloadedError(
      serialized.modelId ?? "kokoro-82m-tts",
      serialized.message,
    );
  }
  const error = new Error(serialized.message);
  error.name = serialized.name;
  return error;
}

export function isModelMissingError(serialized: SerializedLocalTtsError): boolean {
  return serialized.name === "LocalModelNotDownloadedError";
}
