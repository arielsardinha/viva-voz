/**
 * Estado observável do carregamento inicial do Kokoro local (TTS offline).
 *
 * As etapas seguem o que realmente acontece no primeiro uso:
 * 1. `runtime`: baixa/compila o runtime WASM do MediaPipe;
 * 2. `model`: lê o modelo da Cache API (única etapa com progresso em bytes);
 * 3. `initializing`: o MediaPipe monta o grafo na GPU/CPU (sem progresso exposto);
 * 4. `warming`: primeira síntese, que inclui compilação de shaders.
 */
export type LocalTtsLoadPhase =
  | "idle"
  | "runtime"
  | "model"
  | "initializing"
  | "warming"
  | "ready"
  | "error";

export type LocalTtsDelegate = "GPU" | "CPU";

/** Evento emitido pelo runtime (no worker ou na thread principal). */
export interface LocalTtsProgressEvent {
  phase: LocalTtsLoadPhase;
  delegate?: LocalTtsDelegate | null;
  loadedBytes?: number;
  totalBytes?: number;
  errorMessage?: string | null;
}

export interface LocalTtsLoadState {
  phase: LocalTtsLoadPhase;
  delegate: LocalTtsDelegate | null;
  loadedBytes: number;
  totalBytes: number;
  /** Momento (ms epoch) em que o carregamento atual começou. */
  startedAt: number | null;
  errorMessage: string | null;
}

export const INITIAL_LOCAL_TTS_LOAD_STATE: LocalTtsLoadState = Object.freeze({
  phase: "idle",
  delegate: null,
  loadedBytes: 0,
  totalBytes: 0,
  startedAt: null,
  errorMessage: null,
}) as LocalTtsLoadState;

const LOADING_PHASES: ReadonlySet<LocalTtsLoadPhase> = new Set([
  "runtime",
  "model",
  "initializing",
  "warming",
]);

export function isLocalTtsLoading(state: Pick<LocalTtsLoadState, "phase">): boolean {
  return LOADING_PHASES.has(state.phase);
}

/** Ordem das etapas visíveis (1-based) para exibir "Etapa N de 4". */
export const LOCAL_TTS_LOAD_STEPS: readonly LocalTtsLoadPhase[] = [
  "runtime",
  "model",
  "initializing",
  "warming",
];

export function getModelLoadPercent(state: LocalTtsLoadState): number | null {
  if (state.phase !== "model" || state.totalBytes <= 0) return null;
  return Math.min(100, Math.round((state.loadedBytes / state.totalBytes) * 100));
}

/** Reducer puro: aplica um evento de progresso ao estado atual. */
export function applyLocalTtsProgress(
  current: LocalTtsLoadState,
  event: LocalTtsProgressEvent,
  now: number = Date.now(),
): LocalTtsLoadState {
  if (event.phase === "idle") return INITIAL_LOCAL_TTS_LOAD_STATE;

  const wasLoading = isLocalTtsLoading(current);
  const startsLoading = LOADING_PHASES.has(event.phase);
  const startedAt = startsLoading
    ? wasLoading && current.startedAt !== null
      ? current.startedAt
      : now
    : current.startedAt;

  return {
    phase: event.phase,
    delegate: event.delegate !== undefined ? event.delegate : current.delegate,
    loadedBytes:
      event.loadedBytes ?? (event.phase === "model" ? 0 : current.loadedBytes),
    totalBytes: event.totalBytes ?? current.totalBytes,
    startedAt,
    errorMessage: event.phase === "error" ? (event.errorMessage ?? null) : null,
  };
}
