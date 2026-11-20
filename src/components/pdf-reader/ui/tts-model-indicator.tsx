"use client";

import { Sparkles } from "lucide-react";
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

/**
 * Indicador discreto do modelo de voz IA em uso no leitor.
 */
export function TtsModelIndicator({
  engine,
  activeModel,
  compact = false,
  className,
}: TtsModelIndicatorProps) {
  if (engine !== "google" || !activeModel) {
    return null;
  }

  const labelText = activeModel.isFallback
    ? compact
      ? activeModel.shortLabel
      : `Alternativo · ${activeModel.shortLabel}`
    : activeModel.shortLabel;

  const accessibleLabel = activeModel.isFallback
    ? `Modelo alternativo ativo: ${activeModel.label} para manter sua narração contínua`
    : `Narração IA ativa: ${activeModel.label}`;

  return (
    <Badge
      variant="outline"
      data-cy="tts-model-indicator"
      data-testid="tts-model-indicator"
      data-tts-model={activeModel.id}
      data-tts-fallback={activeModel.isFallback ? "true" : "false"}
      role={activeModel.isFallback ? "status" : undefined}
      aria-live={activeModel.isFallback ? "polite" : undefined}
      aria-label={accessibleLabel}
      title={accessibleLabel}
      className={cn(
        "text-[10px] font-medium gap-1 py-0.5 px-2 shrink-0 whitespace-nowrap max-w-full truncate select-none",
        activeModel.isFallback
          ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
          : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25",
        className,
      )}
    >
      <Sparkles className="size-3 shrink-0" aria-hidden="true" />
      {activeModel.isFallback && (
        <span className="inline-flex size-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
      )}
      <span className="truncate">{labelText}</span>
    </Badge>
  );
}
