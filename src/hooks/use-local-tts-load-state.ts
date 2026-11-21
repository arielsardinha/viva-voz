import { useSyncExternalStore } from "react";
import {
  INITIAL_LOCAL_TTS_LOAD_STATE,
  type LocalTtsLoadState,
} from "@/lib/local-ai/domain/local-tts-load-state";
import { getLocalTtsEngine } from "@/lib/local-ai/engines/local-tts.engine";

const getServerSnapshot = (): LocalTtsLoadState => INITIAL_LOCAL_TTS_LOAD_STATE;

/** Estado do carregamento inicial do Kokoro local, atualizado em tempo real. */
export function useLocalTtsLoadState(): LocalTtsLoadState {
  const engine = getLocalTtsEngine();
  return useSyncExternalStore(engine.subscribe, engine.getLoadState, getServerSnapshot);
}
