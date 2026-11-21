"use client";

import {
  AudioLines,
  BotMessageSquare,
  CheckCircle2,
  Cpu,
  Download,
  Image as ImageIcon,
  Loader2,
  Play,
  RefreshCw,
  Trash2,
  Type,
  AlertTriangle,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  estimateEtaSeconds,
  formatBytes,
  formatSpeed,
} from "@/lib/local-ai/domain/local-model-catalog";
import type {
  LocalModelDescriptor,
  LocalModelId,
  LocalModelModality,
  LocalModelRuntimeSupport,
  LocalModelState,
} from "@/lib/local-ai/domain/local-model.types";
import { cn } from "@/lib/utils";

interface LocalModelCardProps {
  descriptor: LocalModelDescriptor;
  state: LocalModelState;
  runtimeSupport: LocalModelRuntimeSupport;
  isHighlighted?: boolean;
  onDownload: (id: LocalModelId) => void;
  onCancel: (id: LocalModelId) => void;
  onDelete: (id: LocalModelId) => void;
  onActivate?: (id: LocalModelId) => void;
}

const MODALITY_LABELS: Record<LocalModelModality, string> = {
  text: "Texto",
  image: "Imagem",
  audio: "Áudio",
};

function ModalityBadge({ modality }: { modality: LocalModelModality }) {
  const Icon =
    modality === "image"
      ? ImageIcon
      : modality === "audio"
        ? AudioLines
        : Type;

  return (
    <Badge
      variant="outline"
      className="text-[10px] font-medium gap-1 px-2 py-0.5 bg-secondary/70 border-border/70 text-foreground"
    >
      <Icon className="size-3 text-accent shrink-0" aria-hidden="true" />
      <span>{MODALITY_LABELS[modality]}</span>
    </Badge>
  );
}

function StatusBadge({ state }: { state: LocalModelState }) {
  if (state.status === "ready") {
    return (
      <Badge
        variant="outline"
        data-cy={`model-status-${state.id}`}
        className="text-[10px] font-semibold gap-1 px-2 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 shrink-0"
      >
        <CheckCircle2 className="size-3" aria-hidden="true" />
        <span>Pronto offline</span>
      </Badge>
    );
  }
  if (state.status === "downloading") {
    return (
      <Badge
        variant="outline"
        data-cy={`model-status-${state.id}`}
        className="text-[10px] font-semibold gap-1 px-2 py-0.5 bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30 shrink-0"
      >
        <Loader2 className="size-3 animate-spin" aria-hidden="true" />
        <span>Baixando {state.progressPercent}%</span>
      </Badge>
    );
  }
  if (state.status === "error") {
    return (
      <Badge
        variant="outline"
        data-cy={`model-status-${state.id}`}
        className="text-[10px] font-semibold gap-1 px-2 py-0.5 bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 shrink-0"
      >
        <AlertTriangle className="size-3" aria-hidden="true" />
        <span>Falha no download</span>
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      data-cy={`model-status-${state.id}`}
      className="text-[10px] font-medium px-2 py-0.5 bg-muted/60 text-muted-foreground border-border shrink-0"
    >
      Não baixado
    </Badge>
  );
}

export function LocalModelCard({
  descriptor,
  state,
  runtimeSupport,
  isHighlighted = false,
  onDownload,
  onCancel,
  onDelete,
  onActivate,
}: LocalModelCardProps) {
  const isTts = descriptor.category === "tts";
  const CategoryIcon = isTts ? AudioLines : BotMessageSquare;
  const remainingBytes = Math.max(0, state.totalBytes - state.downloadedBytes);
  const etaSeconds = estimateEtaSeconds(remainingBytes, state.speedBytesPerSec);
  const needsWebGpuWarning =
    descriptor.requiresWebGpu && !runtimeSupport.webGpuSupported;

  return (
    <article
      data-cy={`model-card-${descriptor.id}`}
      data-webmcp-tool="manageLocalAiModels"
      data-model-id={descriptor.id}
      className={cn(
        "glass-panel rounded-2xl border bg-card/85 shadow-xs transition-all flex flex-col justify-between gap-3",
        "p-4 sm:p-5",
        isHighlighted
          ? "border-accent ring-2 ring-accent/30"
          : "border-border/80",
      )}
    >
      <div className="space-y-2.5 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent border border-accent/20">
              <CategoryIcon className="size-4.5 sm:size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">
                {isTts ? "Voz Neural · TTS" : "Chat Multimodal · LLM"}
              </p>
              <h3 className="text-sm sm:text-base font-bold text-foreground leading-snug break-words">
                {descriptor.name}
              </h3>
            </div>
          </div>
          <StatusBadge state={state} />
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {descriptor.description}
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          {descriptor.inputModalities.map((mod) => (
            <ModalityBadge key={mod} modality={mod} />
          ))}
          <span className="text-[10px] text-muted-foreground px-1">→</span>
          <ModalityBadge modality={descriptor.outputModality} />
          <Badge
            variant="outline"
            className="text-[10px] font-medium px-2 py-0.5 border-border/70 text-muted-foreground ml-auto"
          >
            {formatBytes(
              state.status === "ready" && state.cachedSizeBytes > 0
                ? state.cachedSizeBytes
                : descriptor.sizeBytes,
            )}
          </Badge>
        </div>

        <ul className="space-y-1 pt-1 text-[11px] text-muted-foreground">
          {descriptor.highlights.map((item) => (
            <li key={item} className="flex items-start gap-1.5">
              <Cpu
                className="size-3 text-accent shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        {needsWebGpuWarning && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-2">
            <AlertTriangle
              className="size-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400"
              aria-hidden="true"
            />
            <span>
              Este modelo requer navegador com WebGPU ativo (ex.: Chrome ou Edge
              atualizados) para inferência local.
            </span>
          </div>
        )}

        {state.status === "downloading" && (
          <div className="space-y-1.5 rounded-xl bg-secondary/60 p-2.5 border border-border/60">
            <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-foreground">
              <span>
                {formatBytes(state.downloadedBytes)} de{" "}
                {formatBytes(state.totalBytes)}
              </span>
              <span className="tabular-nums text-accent font-semibold">
                {state.progressPercent}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-label={`Progresso do download de ${descriptor.shortName}`}
              aria-valuenow={state.progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-2 w-full overflow-hidden rounded-full bg-background/80"
            >
              <div
                className="h-full bg-accent rounded-full transition-all duration-150"
                style={{ width: `${state.progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{formatSpeed(state.speedBytesPerSec)}</span>
              {etaSeconds !== null && etaSeconds > 0 && (
                <span>~{etaSeconds}s restantes</span>
              )}
            </div>
          </div>
        )}

        {state.status === "ready" && state.outdated && (
          <p
            data-cy={`model-outdated-${descriptor.id}`}
            className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-[11px] text-sky-800 dark:text-sky-200"
          >
            Há uma versão mais nova deste modelo, otimizada para rodar no
            navegador com menos memória. A versão atual continua funcionando.
          </p>
        )}

        {state.status === "error" && state.errorMessage && (
          <p
            role="alert"
            className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-700 dark:text-rose-300"
          >
            {state.errorMessage}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
        {(state.status === "not_downloaded" || state.status === "error") && (
          <Button
            type="button"
            size="sm"
            data-cy={`download-model-${descriptor.id}`}
            data-webmcp-tool="manageLocalAiModels"
            data-webmcp-action="downloadModel"
            onClick={() => onDownload(descriptor.id)}
            className="flex-1 min-h-9 text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <Download className="size-3.5" aria-hidden="true" />
            <span>
              {state.status === "error" ? "Tentar novamente" : "Baixar Modelo"}
            </span>
          </Button>
        )}

        {state.status === "downloading" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-cy={`cancel-model-${descriptor.id}`}
            data-webmcp-tool="manageLocalAiModels"
            data-webmcp-action="cancelDownload"
            onClick={() => onCancel(descriptor.id)}
            className="flex-1 min-h-9 text-xs font-semibold gap-1.5 border-rose-500/30 text-rose-700 dark:text-rose-300 hover:bg-rose-500/10 cursor-pointer"
          >
            <X className="size-3.5" aria-hidden="true" />
            <span>Cancelar download</span>
          </Button>
        )}

        {state.status === "ready" && (
          <>
            {state.outdated && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                data-cy={`update-model-${descriptor.id}`}
                onClick={() => onDownload(descriptor.id)}
                className="min-h-9 text-xs font-semibold gap-1.5 cursor-pointer"
              >
                <RefreshCw className="size-3.5" aria-hidden="true" />
                <span>Atualizar ({formatBytes(descriptor.sizeBytes)})</span>
              </Button>
            )}
            {onActivate && (
              <Button
                type="button"
                size="sm"
                data-cy={`activate-model-${descriptor.id}`}
                onClick={() => onActivate(descriptor.id)}
                className="flex-1 min-h-9 text-xs font-semibold gap-1.5 cursor-pointer"
              >
                <Play className="size-3.5" aria-hidden="true" />
                <span>Usar agora</span>
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-cy={`delete-model-${descriptor.id}`}
              data-webmcp-tool="manageLocalAiModels"
              data-webmcp-action="deleteModel"
              aria-label={`Remover modelo ${descriptor.shortName} do dispositivo`}
              onClick={() => onDelete(descriptor.id)}
              className="min-h-9 text-xs font-semibold gap-1.5 border-rose-500/30 text-rose-700 dark:text-rose-300 hover:bg-rose-500/10 cursor-pointer"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              <span>Remover</span>
            </Button>
          </>
        )}
      </div>
    </article>
  );
}
