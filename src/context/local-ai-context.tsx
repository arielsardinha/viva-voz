"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  LOCAL_AI_MODELS,
  buildModelsPageHref,
  createInitialModelStates,
  getLocalModelById,
} from "@/lib/local-ai/domain/local-model-catalog";
import type {
  ChatEnginePreference,
  LocalModelId,
  LocalModelRuntimeSupport,
  LocalModelState,
} from "@/lib/local-ai/domain/local-model.types";
import {
  deleteCachedModel,
  detectLocalRuntimeSupport,
  downloadAndCacheModel,
  getCachedModelMeta,
  getStorageQuotaEstimate,
} from "@/lib/local-ai/storage/model-storage.service";
import { getLocalTtsEngine } from "@/lib/local-ai/engines/local-tts.engine";
import { getLocalChatEngine } from "@/lib/local-ai/engines/local-chat.engine";

const CHAT_ENGINE_STORAGE_KEY = "vivavoz-chat-engine-pref";

export interface LocalAiContextValue {
  models: Record<LocalModelId, LocalModelState>;
  runtimeSupport: LocalModelRuntimeSupport;
  storageEstimate: { usageBytes: number; quotaBytes: number } | null;
  preferredChatEngine: ChatEnginePreference;
  activeDownloadsCount: number;
  totalLocalModelsBytes: number;
  isInitialized: boolean;
  /** Navega (client-side, sem interromper downloads) para /modelos, destacando `modelId`. */
  openModelsPage: (modelId?: LocalModelId | null) => void;
  setPreferredChatEngine: (pref: ChatEnginePreference) => void;
  startDownload: (modelId: LocalModelId) => Promise<void>;
  cancelDownload: (modelId: LocalModelId) => void;
  deleteModel: (modelId: LocalModelId) => Promise<void>;
  refreshModels: () => Promise<void>;
  isModelReady: (modelId: LocalModelId) => boolean;
}

const DEFAULT_RUNTIME_SUPPORT: LocalModelRuntimeSupport = {
  webGpuSupported: false,
  cacheApiSupported: false,
  wasmSupported: false,
};

const FALLBACK_CONTEXT_VALUE: LocalAiContextValue = {
  models: createInitialModelStates(),
  runtimeSupport: DEFAULT_RUNTIME_SUPPORT,
  storageEstimate: null,
  preferredChatEngine: "auto",
  activeDownloadsCount: 0,
  totalLocalModelsBytes: 0,
  isInitialized: false,
  openModelsPage: () => {},
  setPreferredChatEngine: () => {},
  startDownload: async () => {},
  cancelDownload: () => {},
  deleteModel: async () => {},
  refreshModels: async () => {},
  isModelReady: () => false,
};

const LocalAiContext = createContext<LocalAiContextValue | null>(null);

function readChatEnginePreference(): ChatEnginePreference {
  if (typeof window === "undefined") return "auto";
  try {
    const raw = window.localStorage.getItem(CHAT_ENGINE_STORAGE_KEY);
    if (
      raw === "auto" ||
      raw === "cloud" ||
      raw === "gemini-nano" ||
      raw === "litert-lm"
    ) {
      return raw;
    }
  } catch {
    // Ignora indisponibilidade de storage
  }
  return "auto";
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (error instanceof Error && /abort/i.test(error.name)) return true;
  return false;
}

export function LocalAiProvider({ children }: { children: React.ReactNode }) {
  const [models, setModels] = useState<Record<LocalModelId, LocalModelState>>(
    () => createInitialModelStates(),
  );
  const [runtimeSupport, setRuntimeSupport] =
    useState<LocalModelRuntimeSupport>(DEFAULT_RUNTIME_SUPPORT);
  const [storageEstimate, setStorageEstimate] = useState<{
    usageBytes: number;
    quotaBytes: number;
  } | null>(null);
  const router = useRouter();
  const [preferredChatEngine, setPreferredChatEngineState] =
    useState<ChatEnginePreference>("auto");
  const [isInitialized, setIsInitialized] = useState(false);

  const abortControllersRef = useRef<Map<LocalModelId, AbortController>>(
    new Map(),
  );
  const isMountedRef = useRef(true);

  const refreshModels = useCallback(async () => {
    const support = detectLocalRuntimeSupport();
    const [quota, ...metas] = await Promise.all([
      getStorageQuotaEstimate(),
      ...LOCAL_AI_MODELS.map(async (descriptor) => ({
        descriptor,
        meta: await getCachedModelMeta(descriptor.id),
      })),
    ]);

    if (!isMountedRef.current) return;

    setRuntimeSupport(support);
    setStorageEstimate(quota);
    setModels((prev) => {
      const next = { ...prev };
      for (const { descriptor, meta } of metas) {
        const current = prev[descriptor.id];
        if (current?.status === "downloading") continue;
        if (meta.cached) {
          const effectiveSize =
            meta.sizeBytes > 0 ? meta.sizeBytes : descriptor.sizeBytes;
          next[descriptor.id] = {
            id: descriptor.id,
            status: "ready",
            downloadedBytes: effectiveSize,
            totalBytes: effectiveSize,
            progressPercent: 100,
            speedBytesPerSec: 0,
            errorMessage: null,
            cachedAt: meta.cachedAt,
            cachedSizeBytes: effectiveSize,
          };
        } else if (current?.status !== "error") {
          next[descriptor.id] = {
            id: descriptor.id,
            status: "not_downloaded",
            downloadedBytes: 0,
            totalBytes: descriptor.sizeBytes,
            progressPercent: 0,
            speedBytesPerSec: 0,
            errorMessage: null,
            cachedAt: null,
            cachedSizeBytes: 0,
          };
        }
      }
      return next;
    });
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    setPreferredChatEngineState(readChatEnginePreference());
    void refreshModels();
    const controllers = abortControllersRef.current;
    return () => {
      isMountedRef.current = false;
      for (const ctrl of controllers.values()) {
        ctrl.abort();
      }
      controllers.clear();
    };
  }, [refreshModels]);

  const setPreferredChatEngine = useCallback((pref: ChatEnginePreference) => {
    setPreferredChatEngineState(pref);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(CHAT_ENGINE_STORAGE_KEY, pref);
      } catch {
        // Ignora erro de quota
      }
    }
  }, []);

  const openModelsPage = useCallback(
    (modelId?: LocalModelId | null) => {
      router.push(buildModelsPageHref(modelId));
    },
    [router],
  );

  const startDownload = useCallback(
    async (modelId: LocalModelId) => {
      const descriptor = getLocalModelById(modelId);
      if (!descriptor) return;
      if (abortControllersRef.current.has(modelId)) return;

      const support = detectLocalRuntimeSupport();
      if (!support.cacheApiSupported) {
        const msg =
          "Seu navegador não suporta armazenamento offline para modelos locais.";
        setModels((prev) => ({
          ...prev,
          [modelId]: { ...prev[modelId], status: "error", errorMessage: msg },
        }));
        toast.error(msg);
        return;
      }

      const controller = new AbortController();
      abortControllersRef.current.set(modelId, controller);

      setModels((prev) => ({
        ...prev,
        [modelId]: {
          id: modelId,
          status: "downloading",
          downloadedBytes: 0,
          totalBytes: descriptor.sizeBytes,
          progressPercent: 0,
          speedBytesPerSec: 0,
          errorMessage: null,
          cachedAt: null,
          cachedSizeBytes: 0,
        },
      }));

      let lastUiUpdateAt = 0;

      try {
        const result = await downloadAndCacheModel(descriptor, {
          hasWebGpu: support.webGpuSupported,
          signal: controller.signal,
          onProgress: (progress) => {
            if (!isMountedRef.current) return;
            const now = Date.now();
            if (
              progress.progressPercent < 100 &&
              now - lastUiUpdateAt < 80
            ) {
              return;
            }
            lastUiUpdateAt = now;
            setModels((prev) => ({
              ...prev,
              [modelId]: {
                ...prev[modelId],
                status: "downloading",
                downloadedBytes: progress.downloadedBytes,
                totalBytes: progress.totalBytes,
                progressPercent: progress.progressPercent,
                speedBytesPerSec: progress.speedBytesPerSec,
                errorMessage: null,
              },
            }));
          },
        });

        if (!isMountedRef.current) return;
        setModels((prev) => ({
          ...prev,
          [modelId]: {
            id: modelId,
            status: "ready",
            downloadedBytes: result.sizeBytes,
            totalBytes: result.sizeBytes,
            progressPercent: 100,
            speedBytesPerSec: 0,
            errorMessage: null,
            cachedAt: result.cachedAt,
            cachedSizeBytes: result.sizeBytes,
          },
        }));
        const quota = await getStorageQuotaEstimate();
        if (isMountedRef.current) setStorageEstimate(quota);
        toast.success(`${descriptor.shortName} pronto para uso offline!`);
      } catch (err) {
        if (!isMountedRef.current) return;
        if (isAbortError(err) || controller.signal.aborted) {
          setModels((prev) => ({
            ...prev,
            [modelId]: {
              id: modelId,
              status: "not_downloaded",
              downloadedBytes: 0,
              totalBytes: descriptor.sizeBytes,
              progressPercent: 0,
              speedBytesPerSec: 0,
              errorMessage: null,
              cachedAt: null,
              cachedSizeBytes: 0,
            },
          }));
          toast.info(`Download de ${descriptor.shortName} cancelado.`);
        } else {
          const message =
            "Não foi possível concluir o download do modelo. Verifique sua conexão e o espaço disponível.";
          setModels((prev) => ({
            ...prev,
            [modelId]: {
              ...prev[modelId],
              status: "error",
              speedBytesPerSec: 0,
              errorMessage: message,
            },
          }));
          toast.error(message);
        }
      } finally {
        abortControllersRef.current.delete(modelId);
      }
    },
    [],
  );

  const cancelDownload = useCallback((modelId: LocalModelId) => {
    const controller = abortControllersRef.current.get(modelId);
    controller?.abort();
  }, []);

  const deleteModel = useCallback(async (modelId: LocalModelId) => {
    const descriptor = getLocalModelById(modelId);
    if (!descriptor) return;

    if (modelId === "kokoro-82m-tts") {
      getLocalTtsEngine().dispose();
    } else if (modelId === "gemma-4-e2b-chat") {
      await getLocalChatEngine().dispose();
    }

    await deleteCachedModel(modelId);
    const quota = await getStorageQuotaEstimate();
    if (!isMountedRef.current) return;

    setStorageEstimate(quota);
    setModels((prev) => ({
      ...prev,
      [modelId]: {
        id: modelId,
        status: "not_downloaded",
        downloadedBytes: 0,
        totalBytes: descriptor.sizeBytes,
        progressPercent: 0,
        speedBytesPerSec: 0,
        errorMessage: null,
        cachedAt: null,
        cachedSizeBytes: 0,
      },
    }));
    toast.success(`${descriptor.shortName} removido do dispositivo.`);
  }, []);

  const isModelReady = useCallback(
    (modelId: LocalModelId) => models[modelId]?.status === "ready",
    [models],
  );

  const activeDownloadsCount = useMemo(
    () =>
      Object.values(models).filter((m) => m.status === "downloading").length,
    [models],
  );

  const totalLocalModelsBytes = useMemo(
    () =>
      Object.values(models).reduce(
        (sum, m) => sum + (m.status === "ready" ? m.cachedSizeBytes : 0),
        0,
      ),
    [models],
  );

  const value = useMemo<LocalAiContextValue>(
    () => ({
      models,
      runtimeSupport,
      storageEstimate,
      preferredChatEngine,
      activeDownloadsCount,
      totalLocalModelsBytes,
      isInitialized,
      openModelsPage,
      setPreferredChatEngine,
      startDownload,
      cancelDownload,
      deleteModel,
      refreshModels,
      isModelReady,
    }),
    [
      models,
      runtimeSupport,
      storageEstimate,
      preferredChatEngine,
      activeDownloadsCount,
      totalLocalModelsBytes,
      isInitialized,
      openModelsPage,
      setPreferredChatEngine,
      startDownload,
      cancelDownload,
      deleteModel,
      refreshModels,
      isModelReady,
    ],
  );

  return (
    <LocalAiContext.Provider value={value}>{children}</LocalAiContext.Provider>
  );
}

export function useLocalAi(): LocalAiContextValue {
  const ctx = useContext(LocalAiContext);
  return ctx ?? FALLBACK_CONTEXT_VALUE;
}
