import {
  getLocalModelById,
  isPiperVoiceId,
  resolveLocalTtsModelId,
} from "../domain/local-model-catalog";
import type { LocalModelId } from "../domain/local-model.types";
import { LocalTtsEngine, getLocalTtsEngine } from "./local-tts.engine";

let piperEngine: LocalTtsEngine | null = null;

/** Motor de todas as vozes Piper (worker próprio, mesmo contrato do Kokoro). */
export function getPiperTtsEngine(): LocalTtsEngine {
  if (!piperEngine) {
    piperEngine = new LocalTtsEngine({
      defaultVoiceId: "piper:pt_BR-cadu-medium",
      createWorker: async () => {
        const { createPiperTtsWorker } = await import("./create-piper-tts-worker");
        return createPiperTtsWorker();
      },
      createMainThreadRuntime: async (onProgress) => {
        const { PiperTtsRuntime } = await import("./piper-tts.runtime");
        return new PiperTtsRuntime({ onProgress });
      },
    });
  }
  return piperEngine;
}

/** Escolhe o motor local (Kokoro ou Piper) responsável pela voz informada. */
export function getLocalTtsEngineForVoice(voiceId: string | null | undefined): LocalTtsEngine {
  return isPiperVoiceId(voiceId) ? getPiperTtsEngine() : getLocalTtsEngine();
}

/** Motor local responsável por um modelo baixado (usado ao remover o modelo). */
export function getLocalTtsEngineForModel(modelId: LocalModelId): LocalTtsEngine | null {
  if (modelId === "kokoro-82m-tts") return getLocalTtsEngine();
  if (getLocalModelById(modelId)?.piper) return getPiperTtsEngine();
  return null;
}

/** Interrompe a síntese em todos os motores locais. */
export function cancelAllLocalTts(): void {
  getLocalTtsEngine().cancel();
  piperEngine?.cancel();
}

export { resolveLocalTtsModelId };
