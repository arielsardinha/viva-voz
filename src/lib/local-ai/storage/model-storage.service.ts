import {
  LOCAL_AI_CACHE_NAME,
  resolveModelDownloadUrl,
} from "../domain/local-model-catalog";
import type {
  CachedModelMetadata,
  LocalModelDescriptor,
  LocalModelId,
  LocalModelRuntimeSupport,
  ModelDownloadProgress,
} from "../domain/local-model.types";

const CACHE_KEY_PREFIX = "https://local-models.vivavoz.internal/models/";

export const MODEL_CACHE_HEADERS = {
  modelId: "X-VivaVoz-Model-Id",
  cachedAt: "X-VivaVoz-Cached-At",
  sizeBytes: "X-VivaVoz-Size-Bytes",
  sourceUrl: "X-VivaVoz-Source-Url",
} as const;

export function buildModelCacheKey(modelId: LocalModelId): string {
  return `${CACHE_KEY_PREFIX}${modelId}`;
}

export function detectLocalRuntimeSupport(): LocalModelRuntimeSupport {
  const hasNavigator = typeof navigator !== "undefined";
  const webGpuSupported =
    hasNavigator &&
    typeof (navigator as Navigator & { gpu?: unknown }).gpu !== "undefined";
  const cacheApiSupported =
    typeof globalThis !== "undefined" && typeof globalThis.caches !== "undefined";
  const wasmSupported = typeof WebAssembly !== "undefined";

  return {
    webGpuSupported,
    cacheApiSupported,
    wasmSupported,
  };
}

async function openModelsCache(): Promise<Cache | null> {
  if (typeof globalThis === "undefined" || typeof globalThis.caches === "undefined") {
    return null;
  }
  return globalThis.caches.open(LOCAL_AI_CACHE_NAME);
}

export async function getCachedModelMeta(
  modelId: LocalModelId,
): Promise<CachedModelMetadata> {
  const cache = await openModelsCache();
  if (!cache) {
    return { cached: false, sizeBytes: 0, cachedAt: null, sourceUrl: null };
  }

  const response = await cache.match(buildModelCacheKey(modelId));
  if (!response) {
    return { cached: false, sizeBytes: 0, cachedAt: null, sourceUrl: null };
  }

  const sizeHeader =
    response.headers.get(MODEL_CACHE_HEADERS.sizeBytes) ??
    response.headers.get("Content-Length");
  const cachedAtHeader = response.headers.get(MODEL_CACHE_HEADERS.cachedAt);
  const sourceUrl = response.headers.get(MODEL_CACHE_HEADERS.sourceUrl);
  void response.body?.cancel?.().catch(() => undefined);

  const parsedSize = Number(sizeHeader);
  const parsedCachedAt = Number(cachedAtHeader);

  return {
    cached: true,
    sizeBytes: Number.isFinite(parsedSize) && parsedSize >= 0 ? parsedSize : 0,
    cachedAt:
      Number.isFinite(parsedCachedAt) && parsedCachedAt > 0
        ? parsedCachedAt
        : null,
    sourceUrl,
  };
}

export async function getCachedModelBlob(
  modelId: LocalModelId,
): Promise<Blob | null> {
  const cache = await openModelsCache();
  if (!cache) return null;
  const response = await cache.match(buildModelCacheKey(modelId));
  if (!response) return null;
  return response.blob();
}

export async function getCachedModelStreamReader(
  modelId: LocalModelId,
): Promise<ReadableStreamDefaultReader<Uint8Array> | null> {
  const cache = await openModelsCache();
  if (!cache) return null;
  const response = await cache.match(buildModelCacheKey(modelId));
  if (!response || !response.body) return null;
  return response.body.getReader();
}

function buildProgressSnapshot(
  downloadedBytes: number,
  totalBytes: number,
  startedAt: number,
): ModelDownloadProgress {
  const elapsedSec = Math.max(0.05, (Date.now() - startedAt) / 1000);
  const safeTotal = Math.max(totalBytes, downloadedBytes, 1);
  const progressPercent = Math.min(
    100,
    Math.round((downloadedBytes / safeTotal) * 100),
  );
  return {
    downloadedBytes,
    totalBytes: safeTotal,
    progressPercent,
    speedBytesPerSec: Math.round(downloadedBytes / elapsedSec),
  };
}

async function storeStreamWithProgress(
  cache: Cache,
  cacheKey: string,
  body: ReadableStream<Uint8Array>,
  headers: Headers,
  expectedTotalBytes: number,
  startedAt: number,
  onProgress?: (progress: ModelDownloadProgress) => void,
): Promise<number> {
  let downloadedBytes = 0;

  if (typeof TransformStream !== "undefined") {
    const progressStream = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        downloadedBytes += chunk.byteLength;
        onProgress?.(
          buildProgressSnapshot(downloadedBytes, expectedTotalBytes, startedAt),
        );
        controller.enqueue(chunk);
      },
    });
    const trackedStream = body.pipeThrough(progressStream);
    await cache.put(cacheKey, new Response(trackedStream, { status: 200, headers }));
    return downloadedBytes;
  }

  const reader = body.getReader();
  const chunks: ArrayBuffer[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      downloadedBytes += value.byteLength;
      chunks.push(
        value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer,
      );
      onProgress?.(
        buildProgressSnapshot(downloadedBytes, expectedTotalBytes, startedAt),
      );
    }
  }
  const blob = new Blob(chunks, { type: "application/octet-stream" });
  await cache.put(cacheKey, new Response(blob, { status: 200, headers }));
  return downloadedBytes;
}

export async function downloadAndCacheModel(
  descriptor: LocalModelDescriptor,
  options: {
    hasWebGpu: boolean;
    signal?: AbortSignal;
    onProgress?: (progress: ModelDownloadProgress) => void;
  },
): Promise<{ sizeBytes: number; cachedAt: number }> {
  if (options.signal?.aborted) {
    throw new DOMException("Download cancelado pelo usuário.", "AbortError");
  }

  const cache = await openModelsCache();
  if (!cache) {
    throw new Error(
      "Seu navegador não suporta Cache API para armazenar modelos offline.",
    );
  }

  if (options.signal?.aborted) {
    throw new DOMException("Download cancelado pelo usuário.", "AbortError");
  }

  const downloadUrl = resolveModelDownloadUrl(descriptor, options.hasWebGpu);
  const cacheKey = buildModelCacheKey(descriptor.id);
  const startedAt = Date.now();

  const response = await fetch(downloadUrl, { signal: options.signal });
  if (!response.ok || !response.body) {
    throw new Error(
      "Não foi possível baixar o modelo no momento. Verifique sua conexão e tente novamente.",
    );
  }

  const contentLengthHeader = Number(response.headers.get("Content-Length"));
  const expectedTotalBytes =
    Number.isFinite(contentLengthHeader) && contentLengthHeader > 0
      ? contentLengthHeader
      : descriptor.sizeBytes;

  const cachedAt = Date.now();
  const headers = new Headers({
    "Content-Type": "application/octet-stream",
    "Content-Length": String(expectedTotalBytes),
    [MODEL_CACHE_HEADERS.modelId]: descriptor.id,
    [MODEL_CACHE_HEADERS.cachedAt]: String(cachedAt),
    [MODEL_CACHE_HEADERS.sizeBytes]: String(expectedTotalBytes),
    [MODEL_CACHE_HEADERS.sourceUrl]: downloadUrl,
  });

  try {
    const actualSize = await storeStreamWithProgress(
      cache,
      cacheKey,
      response.body,
      headers,
      expectedTotalBytes,
      startedAt,
      options.onProgress,
    );

    const finalSize = actualSize > 0 ? actualSize : expectedTotalBytes;
    options.onProgress?.({
      downloadedBytes: finalSize,
      totalBytes: finalSize,
      progressPercent: 100,
      speedBytesPerSec: Math.round(
        finalSize / Math.max(0.05, (Date.now() - startedAt) / 1000),
      ),
    });

    if (typeof navigator !== "undefined" && navigator.storage?.persist) {
      void navigator.storage.persist().catch(() => false);
    }

    return { sizeBytes: finalSize, cachedAt };
  } catch (err) {
    await cache.delete(cacheKey).catch(() => false);
    throw err;
  }
}

export async function deleteCachedModel(
  modelId: LocalModelId,
): Promise<boolean> {
  const cache = await openModelsCache();
  if (!cache) return false;
  return cache.delete(buildModelCacheKey(modelId));
}

export async function getStorageQuotaEstimate(): Promise<{
  usageBytes: number;
  quotaBytes: number;
} | null> {
  if (
    typeof navigator === "undefined" ||
    !navigator.storage ||
    typeof navigator.storage.estimate !== "function"
  ) {
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    return {
      usageBytes: typeof estimate.usage === "number" ? estimate.usage : 0,
      quotaBytes: typeof estimate.quota === "number" ? estimate.quota : 0,
    };
  } catch {
    return null;
  }
}
