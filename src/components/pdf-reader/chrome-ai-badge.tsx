"use client";

import { Cpu, Cloud, HelpCircle, DownloadCloud } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useChromeAi } from "@/hooks/use-chrome-ai";
import type { ChromeAiAvailability } from "@/lib/client/chrome-ai";
import { cn } from "@/lib/utils";

interface ChromeAiBadgeProps {
  hasCloudKey?: boolean;
  activeEngine?: "gemini-nano" | "vertex" | "disconnected";
  chromeAiStatus?: ChromeAiAvailability;
  onStatusChange?: (status: ChromeAiAvailability) => void;
  className?: string;
}

export function ChromeAiBadge({
  hasCloudKey: propHasCloudKey,
  activeEngine,
  chromeAiStatus: externalStatus,
  onStatusChange,
  className,
}: ChromeAiBadgeProps) {
  // Hook que monitora eventos de foco na janela e visibilidade
  const { status: internalStatus } = useChromeAi({
    pollIntervalMs: 5000,
    onStatusChange,
  });

  const effectiveStatus = externalStatus ?? internalStatus;
  const hasKey = Boolean(propHasCloudKey || activeEngine === "vertex");

  const isLocalActive =
    activeEngine === "gemini-nano" ||
    (!hasKey && (effectiveStatus === "readily" || (typeof window !== "undefined" && Boolean((window as unknown as { LanguageModel?: unknown; ai?: { languageModel?: unknown } }).LanguageModel || (window as unknown as { ai?: { languageModel?: unknown } }).ai?.languageModel))));

  const isCloudActive = hasKey;
  const isPendingDownload = !isCloudActive && !isLocalActive && effectiveStatus === "after-download";

  return (
    <div
      data-cy="chrome-ai-badge-btn"
      data-testid="chrome-ai-badge"
      aria-label="Status do motor de inteligência artificial ativo"
      className={cn("inline-flex items-center select-none", className)}
    >
      {isCloudActive ? (
        <Badge
          variant="outline"
          className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 text-[10px] font-medium gap-1 py-0.5 px-2"
        >
          <Cloud className="size-3" aria-hidden="true" />
          <span>Gemini 2.5 Flash</span>
        </Badge>
      ) : isLocalActive ? (
        <Badge
          variant="outline"
          className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-medium gap-1 py-0.5 px-2 shadow-xs ring-1 ring-emerald-500/20"
        >
          <Cpu className="size-3" aria-hidden="true" />
          <span className="flex items-center gap-1">
            Gemini Nano
            <span className="inline-flex size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </span>
        </Badge>
      ) : isPendingDownload ? (
        <Badge
          variant="outline"
          className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px] font-medium gap-1 py-0.5 px-2"
        >
          <DownloadCloud className="size-3 animate-bounce" aria-hidden="true" />
          <span>Baixando Modelo...</span>
        </Badge>
      ) : (
        <Badge
          variant="outline"
          className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-medium gap-1 py-0.5 px-2"
        >
          <HelpCircle className="size-3" aria-hidden="true" />
          <span>IA Não Conectada</span>
        </Badge>
      )}
    </div>
  );
}
