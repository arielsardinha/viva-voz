"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Cpu, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocalTtsLoadState } from "@/hooks/use-local-tts-load-state";
import {
  LOCAL_TTS_LOAD_STEPS,
  getModelLoadPercent,
  isLocalTtsLoading,
  type LocalTtsLoadPhase,
  type LocalTtsLoadState,
} from "@/lib/local-ai/domain/local-tts-load-state";
import { getLocalTtsEngine } from "@/lib/local-ai/engines/local-tts.engine";
import { getPiperTtsEngine } from "@/lib/local-ai/engines/local-tts.router";
import { cn } from "@/lib/utils";

/** Quanto tempo a confirmação "Voz local pronta" fica visível. */
export const LOCAL_TTS_READY_FLASH_MS = 1800;

const PHASE_LABELS: Partial<Record<LocalTtsLoadPhase, string>> = {
  runtime: "Iniciando o motor de voz",
  model: "Carregando o modelo de voz",
  initializing: "Preparando o modelo",
  warming: "Gerando a primeira fala",
};

function formatMegabytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}min ${seconds.toString().padStart(2, "0")}s`;
}

interface LocalTtsLoadingPopupViewProps {
  state: LocalTtsLoadState;
  /** Mostra a confirmação de sucesso em vez do progresso. */
  showReady?: boolean;
  /** Relógio atual (ms), para o tempo decorrido. */
  now: number;
  onDismissError?: () => void;
  className?: string;
}

/**
 * Popup flutuante que mostra o carregamento inicial da voz local (Kokoro ou Piper). Só a etapa
 * de leitura do modelo tem porcentagem real; as demais exibem uma barra
 * indeterminada e o tempo decorrido, para deixar claro que nada travou.
 */
export function LocalTtsLoadingPopupView({
  state,
  showReady = false,
  now,
  onDismissError,
  className,
}: LocalTtsLoadingPopupViewProps) {
  const loading = isLocalTtsLoading(state);
  const isError = state.phase === "error";
  if (!loading && !isError && !showReady) return null;

  const stepIndex = LOCAL_TTS_LOAD_STEPS.indexOf(state.phase);
  const percent = getModelLoadPercent(state);
  const elapsed = state.startedAt !== null ? now - state.startedAt : 0;
  const delegateLabel =
    state.delegate === "GPU" ? "GPU (WebGPU)" : state.delegate === "CPU" ? "CPU (WASM)" : null;

  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      data-testid="local-tts-loading-popup"
      data-phase={showReady && !loading ? "ready" : state.phase}
      className={cn(
        "glass-panel fixed right-3 top-20 z-50 w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-border/80 p-3.5 shadow-2xl",
        "animate-in fade-in slide-in-from-top-2 duration-300",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl",
            isError
              ? "bg-destructive/15 text-destructive"
              : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
          )}
          aria-hidden="true"
        >
          {isError ? (
            <AlertTriangle className="size-4.5" />
          ) : loading ? (
            <Loader2 className="size-4.5 animate-spin" />
          ) : (
            <CheckCircle2 className="size-4.5" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold leading-tight">
              {isError
                ? "Não foi possível carregar a voz local"
                : loading
                  ? "Preparando a voz local"
                  : "Voz local pronta"}
            </p>
            {loading && (
              <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                {formatElapsed(elapsed)}
              </span>
            )}
            {isError && onDismissError && (
              <Button
                variant="ghost"
                size="icon"
                className="size-6 shrink-0"
                onClick={onDismissError}
                aria-label="Fechar aviso"
              >
                <X className="size-3.5" />
              </Button>
            )}
          </div>

          {loading && (
            <>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground/90">
                  {PHASE_LABELS[state.phase]}
                </span>
                {stepIndex >= 0 && (
                  <span>
                    {" "}
                    · Etapa {stepIndex + 1} de {LOCAL_TTS_LOAD_STEPS.length}
                  </span>
                )}
              </p>

              <div
                className="relative mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary"
                role="progressbar"
                aria-label="Progresso do carregamento da voz local"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent ?? undefined}
              >
                {percent !== null ? (
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-[width] duration-200"
                    style={{ width: `${percent}%` }}
                  />
                ) : (
                  <div className="local-tts-indeterminate-bar absolute inset-y-0 left-0 w-2/5 rounded-full bg-emerald-500/80" />
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-0.5 text-[11px] text-muted-foreground">
                <span className="tabular-nums">
                  {percent !== null && state.totalBytes > 0
                    ? `${percent}% · ${formatMegabytes(state.loadedBytes)} de ${formatMegabytes(state.totalBytes)}`
                    : "Isso leva alguns segundos só na primeira vez."}
                </span>
                {delegateLabel && (
                  <span className="inline-flex shrink-0 items-center gap-1">
                    <Cpu className="size-3" aria-hidden="true" />
                    {delegateLabel}
                  </span>
                )}
              </div>
            </>
          )}

          {isError && (
            <p className="text-xs text-muted-foreground break-words">
              {state.errorMessage ?? "Tente novamente ou use outra voz."}
            </p>
          )}

          {showReady && !loading && !isError && (
            <p className="text-xs text-muted-foreground">
              A narração offline já está carregada.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Container: assina o estado do engine, roda o relógio e o aviso de pronto. */
export function LocalTtsLoadingPopup() {
  const state = useLocalTtsLoadState();
  const loading = isLocalTtsLoading(state);
  const [now, setNow] = useState(() => Date.now());
  const [showReady, setShowReady] = useState(false);
  const wasLoadingRef = useRef(false);

  useEffect(() => {
    if (!loading) return;
    // `now` pode estar defasado até o primeiro tick; o tempo decorrido é limitado a 0.
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    const wasLoading = wasLoadingRef.current;
    wasLoadingRef.current = loading;
    if (!wasLoading || loading || state.phase !== "ready") return;

    setShowReady(true);
    const timeout = window.setTimeout(() => setShowReady(false), LOCAL_TTS_READY_FLASH_MS);
    return () => window.clearTimeout(timeout);
  }, [loading, state.phase]);

  return (
    <LocalTtsLoadingPopupView
      state={state}
      showReady={showReady}
      now={now}
      onDismissError={() => {
        getLocalTtsEngine().dismissLoadError();
        getPiperTtsEngine().dismissLoadError();
      }}
    />
  );
}
