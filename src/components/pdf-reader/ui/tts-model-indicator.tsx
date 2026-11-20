"use client";

import { Cpu, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { TtsEngine } from "@/lib/tts-engines";
import type { ActiveTtsModelInfo } from "@/lib/tts-models";
import { cn } from "@/lib/utils";

interface TtsModelIndicatorProps {
  engine: TtsEngine;
  activeModel: ActiveTtsModelInfo | null;
  compact?: boolean;
  className?: string;
}

const DEFAULT_LITERT_MODEL: ActiveTtsModelInfo = {
  id: "kokoro-82m",
  label: "Kokoro 82M (Offline)",
  shortLabel: "Kokoro Local",
  isFallback: false,
};

/**
 * Indicador discreto do modelo de voz IA em uso no leitor.
 */
export function TtsModelIndicator({
  engine,
  activeModel,
  compact = false,
  className,
}: TtsModelIndicatorProps) {
  if (engine === "system") {
    return null;
  }

  if (engine === "google" && !activeModel) {
    return null;
  }

  const resolvedModel =
    engine === "litert" ? (activeModel ?? DEFAULT_LITERT_MODEL) : activeModel!;
  const isLiteRt = engine === "litert";

  const labelText = resolvedModel.isFallback
    ? compact
      ? resolvedModel.shortLabel
      : `Alternativo · ${resolvedModel.shortLabel}`
    : resolvedModel.shortLabel;

  const accessibleLabel = isLiteRt
    ? `Narração IA local ativa: ${resolvedModel.label}`
    : resolvedModel.isFallback
      ? `Modelo alternativo ativo: ${resolvedModel.label} para manter sua narração contínua`
      : `Narração IA ativa: ${resolvedModel.label}`;

  return (
    <Badge
      variant="outline"
      data-cy="tts-model-indicator"
      data-testid="tts-model-indicator"
      data-tts-model={resolvedModel.id}
      data-tts-fallback={resolvedModel.isFallback ? "true" : "false"}
      role={resolvedModel.isFallback ? "status" : undefined}
      aria-live={resolvedModel.isFallback ? "polite" : undefined}
      aria-label={accessibleLabel}
      title={accessibleLabel}
      className={cn(
        "text-[10px] font-medium gap-1 py-0.5 px-2 shrink-0 whitespace-nowrap max-w-full truncate select-none",
        isLiteRt
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
          : resolvedModel.isFallback
            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
            : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25",
        className,
      )}
    >
      {isLiteRt ? (
        <Cpu className="size-3 shrink-0" aria-hidden="true" />
      ) : (
        <Sparkles className="size-3 shrink-0" aria-hidden="true" />
      )}
      {resolvedModel.isFallback && (
        <span
          className="inline-flex size-1.5 shrink-0 rounded-full bg-amber-500"
          aria-hidden="true"
        />
      )}
      <span className="truncate">{labelText}</span>
    </Badge>
  );
}
