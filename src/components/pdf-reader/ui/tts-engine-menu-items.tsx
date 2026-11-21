"use client";

import { DownloadCloud, Sparkles } from "lucide-react";
import {
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useLocalAi } from "@/context/local-ai-context";
import { LOCAL_TTS_MODEL_IDS } from "@/lib/local-ai/domain/local-model-catalog";
import { TTS_ENGINES, type TtsEngine } from "@/lib/tts-engines";
import type { ActiveTtsModelInfo } from "@/lib/tts-models";

interface TtsEngineMenuItemsProps {
  engine: TtsEngine;
  hasApiKey: boolean;
  disabledEngines: TtsEngine[];
  onSelectEngine: (engine: TtsEngine) => void;
  onOpenGeminiDialog: () => void;
}

export function getEngineVoicesHeading(
  engine: TtsEngine,
  activeTtsModel?: ActiveTtsModelInfo | null,
): string {
  if (engine === "google") return activeTtsModel?.label ?? "Google Gemini";
  if (engine === "litert") return activeTtsModel?.label ?? "IA Local · Kokoro";
  return "Sistema";
}

export function TtsEngineMenuItems({
  engine,
  hasApiKey,
  disabledEngines,
  onSelectEngine,
  onOpenGeminiDialog,
}: TtsEngineMenuItemsProps) {
  const { models, openModelsPage } = useLocalAi();
  const localTtsStates = LOCAL_TTS_MODEL_IDS.map((id) => models[id]).filter(Boolean);
  const downloadingState = localTtsStates.find((state) => state.status === "downloading");

  const renderLiteRtBadge = () => {
    if (localTtsStates.some((state) => state.status === "ready")) {
      return (
        <span className="ml-auto rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 dark:text-emerald-300">
          Pronto
        </span>
      );
    }
    if (downloadingState) {
      return (
        <span className="ml-auto rounded-full bg-sky-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-sky-700 dark:text-sky-300">
          {downloadingState.progressPercent}%
        </span>
      );
    }
    return (
      <span className="ml-auto rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 dark:text-amber-300">
        Baixar
      </span>
    );
  };

  return (
    <>
      <DropdownMenuRadioGroup
        value={engine}
        onValueChange={(val) => onSelectEngine(val as TtsEngine)}
      >
        {TTS_ENGINES.map((eng) => (
          <DropdownMenuRadioItem
            key={eng.id}
            value={eng.id}
            disabled={
              eng.id === "google"
                ? !hasApiKey
                : eng.id === "litert"
                  ? false
                  : disabledEngines.includes(eng.id)
            }
            className="cursor-pointer text-xs"
          >
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span>{eng.label}</span>
                {eng.id === "litert" && renderLiteRtBadge()}
              </div>
              <span className="text-[10px] text-muted-foreground">
                {eng.hint}
              </span>
            </div>
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>

      <DropdownMenuSeparator className="my-1.5" />
      <DropdownMenuItem
        data-cy="tts-menu-open-local-models"
        onClick={() => openModelsPage("kokoro-82m-tts")}
        className="cursor-pointer text-xs flex items-center gap-1.5 text-foreground font-medium"
      >
        <DownloadCloud className="size-3.5 text-accent" aria-hidden="true" />
        <span>Modelos IA Local (Offline)</span>
      </DropdownMenuItem>

      {!hasApiKey && (
        <DropdownMenuItem
          onClick={onOpenGeminiDialog}
          className="cursor-pointer text-xs flex items-center gap-1.5 text-accent font-medium hover:bg-accent/10"
        >
          <Sparkles className="size-3.5" aria-hidden="true" />
          <span>Conectar chave Gemini (IA)</span>
        </DropdownMenuItem>
      )}
    </>
  );
}
