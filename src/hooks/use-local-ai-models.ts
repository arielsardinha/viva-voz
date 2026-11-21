"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { LOCAL_AI_MODELS } from "@/lib/local-ai/domain/local-model-catalog";
import type { LocalModelId } from "@/lib/local-ai/domain/local-model.types";
import { savePreferences } from "@/lib/library-db";
import { useReaderSettings } from "@/context/reader-settings-context";
import { useLocalAi } from "@/context/local-ai-context";

/**
 * ViewModel da central de modelos de IA local (tela /modelos).
 */
export function useLocalAiModels() {
  const router = useRouter();
  const localAi = useLocalAi();
  const { patchSettings } = useReaderSettings();

  const activateModelInReader = useCallback(
    async (modelId: LocalModelId) => {
      if (modelId === "kokoro-82m-tts") {
        await savePreferences({ engine: "litert" });
      } else if (modelId === "gemma-4-e2b-chat") {
        localAi.setPreferredChatEngine("litert-lm");
        patchSettings({ template: "ai-study" });
      }
      router.push("/leitor");
    },
    [localAi, patchSettings, router],
  );

  return {
    descriptors: LOCAL_AI_MODELS,
    ...localAi,
    activateModelInReader,
  };
}
