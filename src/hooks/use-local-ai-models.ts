"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  findExclusiveConflict,
  getAvailableLocalModels,
  getDefaultVoiceForLocalModel,
  getLocalModelById,
} from "@/lib/local-ai/domain/local-model-catalog";
import { isMobileDevice } from "@/lib/local-ai/domain/device";
import type { LocalModelId } from "@/lib/local-ai/domain/local-model.types";
import { getPreferences, savePreferences } from "@/lib/library-db";
import { useReaderSettings } from "@/context/reader-settings-context";
import { useLocalAi } from "@/context/local-ai-context";

const noopSubscribe = () => () => {};

/** Celular/tablet? No servidor (SSR) assume computador; corrige na hidratação. */
function useIsMobileDevice(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => isMobileDevice(navigator),
    () => false,
  );
}

/**
 * ViewModel da central de modelos de IA local (tela /modelos).
 */
export function useLocalAiModels() {
  const router = useRouter();
  const localAi = useLocalAi();
  const { patchSettings } = useReaderSettings();

  const activateModelInReader = useCallback(
    async (modelId: LocalModelId) => {
      if (getLocalModelById(modelId)?.category === "tts") {
        const voice = getDefaultVoiceForLocalModel(modelId);
        const current = await getPreferences();
        await savePreferences({
          engine: "litert",
          ...(voice ? { voice: { ...current.voice, litert: voice } } : {}),
        });
      } else if (getLocalModelById(modelId)?.category === "chat") {
        localAi.setPreferredChatEngine("litert-lm");
        patchSettings({ template: "ai-study" });
      }
      router.push("/leitor");
    },
    [localAi, patchSettings, router],
  );

  const isMobile = useIsMobileDevice();
  const getBlockingModel = useCallback(
    (modelId: LocalModelId) => findExclusiveConflict(modelId, localAi.models),
    [localAi.models],
  );

  return {
    // Modelos `desktopOnly` (Gemma 4 E4B) nunca aparecem em celulares.
    descriptors: getAvailableLocalModels(isMobile),
    isMobile,
    ...localAi,
    getBlockingModel,
    activateModelInReader,
  };
}
