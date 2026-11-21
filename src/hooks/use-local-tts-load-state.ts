import { useSyncExternalStore } from "react";
import {
  INITIAL_LOCAL_TTS_LOAD_STATE,
  isLocalTtsLoading,
  type LocalTtsLoadState,
} from "@/lib/local-ai/domain/local-tts-load-state";
import { getLocalTtsEngine } from "@/lib/local-ai/engines/local-tts.engine";
import { getPiperTtsEngine } from "@/lib/local-ai/engines/local-tts.router";

const getServerSnapshot = (): LocalTtsLoadState => INITIAL_LOCAL_TTS_LOAD_STATE;

/**
 * Estado do carregamento inicial da voz local, atualizado em tempo real.
 * Mostra o motor que está carregando (ou falhou); fora isso, o que já está pronto.
 */
export function useLocalTtsLoadState(): LocalTtsLoadState {
  const kokoro = getLocalTtsEngine();
  const piper = getPiperTtsEngine();
  const kokoroState = useSyncExternalStore(kokoro.subscribe, kokoro.getLoadState, getServerSnapshot);
  const piperState = useSyncExternalStore(piper.subscribe, piper.getLoadState, getServerSnapshot);
  const isActive = (state: LocalTtsLoadState) =>
    isLocalTtsLoading(state) || state.phase === "error";
  if (isActive(piperState)) return piperState;
  if (isActive(kokoroState)) return kokoroState;
  return piperState.phase === "ready" && kokoroState.phase !== "ready" ? piperState : kokoroState;
}
