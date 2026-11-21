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

/**
 * Modelos grandes (ex.: Gemma 4 ≈ 2 GB) são baixados em blocos via HTTP Range e
 * salvos como várias entradas na Cache API. A entrada principal (`buildModelCacheKey`)
 * só é gravada ao final, como manifesto — sua presença significa "download completo".
 * Blocos já gravados sobrevivem a falhas de rede, permitindo retomar o download.
 */
export const MODEL_DOWNLOAD_CHUNK_BYTES = 32 * 1024 * 1024;
const MAX_CHUNK_ATTEMPTS = 6;
const CHUNK_COUNT_HEADER = "X-VivaVoz-Chunk-Count";
const TOTAL_BYTES_HEADER = "X-VivaVoz-Total-Bytes";

function buildChunkCacheKey(modelId: LocalModelId, index: number): string {
  return `${buildModelCacheKey(modelId)}/part-${index}`;
}

function getChunkCount(response: Response): number {
  const count = Number(response.headers.get(CHUNK_COUNT_HEADER));
  return Number.isInteger(count) && count > 0 ? count : 0;
}

async function collectChunkBlobs(
  cache: Cache,
  modelId: LocalModelId,
  chunkCount: number,
): Promise<Blob[] | null> {
  const parts: Blob[] = [];
  for (let i = 0; i < chunkCount; i += 1) {
    const part = await cache.match(buildChunkCacheKey(modelId, i));
    if (!part) return null;
    parts.push(await part.blob());
  }
  return parts;
}

export async function getCachedModelBlob(
  modelId: LocalModelId,
): Promise<Blob | null> {
  const cache = await openModelsCache();
  if (!cache) return null;
  const response = await cache.match(buildModelCacheKey(modelId));
  if (!response) return null;

  const chunkCount = getChunkCount(response);
  if (chunkCount === 0) return response.blob();

  void response.body?.cancel?.().catch(() => undefined);
  const parts = await collectChunkBlobs(cache, modelId, chunkCount);
  if (!parts) return null;
  // Blobs da Cache API são respaldados em disco: concatená-los não copia 2 GB para a RAM.
  return new Blob(parts, { type: "application/octet-stream" });
}

export async function getCachedModelStreamReader(
  modelId: LocalModelId,
): Promise<ReadableStreamDefaultReader<Uint8Array> | null> {
  const cache = await openModelsCache();
  if (!cache) return null;
  const response = await cache.match(buildModelCacheKey(modelId));
  if (!response || !response.body) return null;

  const chunkCount = getChunkCount(response);
  if (chunkCount === 0) return response.body.getReader();

  void response.body.cancel().catch(() => undefined);
  let index = 0;
  let current: ReadableStreamDefaultReader<Uint8Array> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      while (true) {
        if (!current) {
          if (index >= chunkCount) {
            controller.close();
            return;
          }
          const part = await cache.match(buildChunkCacheKey(modelId, index));
          index += 1;
          if (!part?.body) {
            controller.error(new Error("Bloco do modelo ausente no cache."));
            return;
          }
          current = part.body.getReader();
        }
        const { done, value } = await current.read();
        if (done) {
          current = null;
          continue;
        }
        if (value) {
          controller.enqueue(value);
          return;
        }
      }
    },
    async cancel(reason) {
      await current?.cancel(reason).catch(() => undefined);
    },
  });
  return stream.getReader();
}

/** Erro de falta de espaço: não adianta repetir, o usuário precisa liberar armazenamento. */
export class ModelStorageQuotaError extends Error {
  constructor(
    readonly requiredBytes: number,
    readonly availableBytes: number | null,
    options?: { cause?: unknown },
  ) {
    super(
      "Espaço de armazenamento insuficiente para salvar o modelo neste dispositivo. Libere espaço e tente novamente.",
      options,
    );
    this.name = "ModelStorageQuotaError";
  }
}

function isQuotaExceeded(err: unknown): boolean {
  if (err instanceof ModelStorageQuotaError) return true;
  const name = (err as { name?: unknown } | null)?.name;
  return name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED";
}

/** Margem de folga além do tamanho do modelo (metadados, outros dados do app). */
const QUOTA_SAFETY_MARGIN_BYTES = 64 * 1024 * 1024;

/**
 * O service worker antigo interceptava o download no Hugging Face e salvava uma
 * cópia inteira do modelo (GBs) no cache do app. No celular essa cópia órfã
 * esgota a cota e o download novo falha perto dos 100%. Remove essas entradas.
 */
export async function purgeStaleModelCopies(): Promise<void> {
  if (typeof globalThis.caches === "undefined") return;
  const ownOrigin =
    typeof location !== "undefined" ? location.origin : null;
  const names = await globalThis.caches.keys().catch(() => [] as string[]);
  for (const name of names) {
    if (name.startsWith("vivavoz-local-ai-models")) continue;
    if (name === "vivavoz-app-v1") {
      await globalThis.caches.delete(name).catch(() => false);
      continue;
    }
    const cache = await globalThis.caches.open(name).catch(() => null);
    if (!cache) continue;
    const requests = await cache.keys().catch(() => [] as readonly Request[]);
    for (const request of requests) {
      let origin: string;
      try {
        origin = new URL(request.url).origin;
      } catch {
        continue;
      }
      if (ownOrigin && origin === ownOrigin) continue;
      await cache.delete(request).catch(() => false);
    }
  }
}

async function ensureStorageAvailable(requiredBytes: number): Promise<void> {
  const estimate = await getStorageQuotaEstimate();
  if (!estimate || estimate.quotaBytes <= 0) return;
  const available = Math.max(0, estimate.quotaBytes - estimate.usageBytes);
  if (available < requiredBytes + QUOTA_SAFETY_MARGIN_BYTES) {
    throw new ModelStorageQuotaError(requiredBytes, available);
  }
}

class HttpStatusError extends Error {
  constructor(readonly status: number) {
    super(
      "Não foi possível baixar o modelo no momento. Verifique sua conexão e tente novamente.",
    );
    this.name = "HttpStatusError";
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException("Download cancelado pelo usuário.", "AbortError");
  }
}

function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Download cancelado pelo usuário.", "AbortError"));
      },
      { once: true },
    );
  });
}

function parseContentRangeTotal(header: string | null): number | null {
  const match = header?.match(/\/(\d+)\s*$/);
  if (!match) return null;
  const total = Number(match[1]);
  return Number.isFinite(total) && total > 0 ? total : null;
}

async function readBodyWithProgress(
  body: ReadableStream<Uint8Array>,
  onBytes: (byteLength: number) => void,
): Promise<Uint8Array> {
  const reader = body.getReader();
  const buffers: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      buffers.push(value);
      length += value.byteLength;
      onBytes(value.byteLength);
    }
  }
  const out = new Uint8Array(length);
  let offset = 0;
  for (const b of buffers) {
    out.set(b, offset);
    offset += b.byteLength;
  }
  return out;
}

async function requestWakeLock(): Promise<{ release: () => Promise<void> } | null> {
  try {
    const wakeLock = (
      navigator as Navigator & {
        wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> };
      }
    ).wakeLock;
    return wakeLock ? await wakeLock.request("screen") : null;
  } catch {
    return null;
  }
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

async function clearChunks(cache: Cache, modelId: LocalModelId): Promise<void> {
  for (let i = 0; ; i += 1) {
    const removed = await cache.delete(buildChunkCacheKey(modelId, i)).catch(() => false);
    if (!removed) break;
  }
}

export async function downloadAndCacheModel(
  descriptor: LocalModelDescriptor,
  options: {
    hasWebGpu: boolean;
    signal?: AbortSignal;
    onProgress?: (progress: ModelDownloadProgress) => void;
  },
): Promise<{ sizeBytes: number; cachedAt: number }> {
  const { signal, onProgress } = options;
  throwIfAborted(signal);

  const cache = await openModelsCache();
  if (!cache) {
    throw new Error(
      "Seu navegador não suporta Cache API para armazenar modelos offline.",
    );
  }
  throwIfAborted(signal);

  // Pede armazenamento persistente ANTES de gravar GBs, para o navegador não
  // despejar os dados por pressão de espaço no meio do download.
  if (typeof navigator !== "undefined" && navigator.storage?.persist) {
    await navigator.storage.persist().catch(() => false);
  }
  await purgeStaleModelCopies();

  const downloadUrl = resolveModelDownloadUrl(descriptor, options.hasWebGpu);
  const cacheKey = buildModelCacheKey(descriptor.id);
  const startedAt = Date.now();
  const wakeLock = await requestWakeLock();

  try {
    // Retoma a partir dos blocos já gravados numa tentativa anterior.
    let totalBytes: number | null = null;
    let nextIndex = 0;
    while (true) {
      const part = await cache.match(buildChunkCacheKey(descriptor.id, nextIndex));
      if (!part) break;
      const partTotal = Number(part.headers.get(TOTAL_BYTES_HEADER));
      void part.body?.cancel?.().catch(() => undefined);
      if (!Number.isFinite(partTotal) || partTotal <= 0) break;
      totalBytes = partTotal;
      nextIndex += 1;
    }

    const resumedBytes = Math.min(
      nextIndex * MODEL_DOWNLOAD_CHUNK_BYTES,
      totalBytes ?? Number.POSITIVE_INFINITY,
    );
    let downloadedBytes = resumedBytes;
    let sessionBytes = 0;
    const emit = () => {
      const total = totalBytes ?? descriptor.sizeBytes;
      const elapsedSec = Math.max(0.05, (Date.now() - startedAt) / 1000);
      const safeTotal = Math.max(total, downloadedBytes, 1);
      onProgress?.({
        downloadedBytes,
        totalBytes: safeTotal,
        progressPercent: Math.min(99, Math.floor((downloadedBytes / safeTotal) * 100)),
        speedBytesPerSec: Math.round(sessionBytes / elapsedSec),
      });
    };
    if (resumedBytes > 0) emit();

    // Falha cedo, com mensagem clara, em vez de baixar GBs e esbarrar na cota no fim.
    await ensureStorageAvailable(
      Math.max(0, (totalBytes ?? descriptor.sizeBytes) - resumedBytes),
    );

    while (totalBytes === null || nextIndex * MODEL_DOWNLOAD_CHUNK_BYTES < totalBytes) {
      const rangeStart = nextIndex * MODEL_DOWNLOAD_CHUNK_BYTES;
      const rangeEnd = rangeStart + MODEL_DOWNLOAD_CHUNK_BYTES - 1;

      let stored = false;
      for (let attempt = 1; !stored; attempt += 1) {
        throwIfAborted(signal);
        let chunkBytes = 0;
        try {
          const response = await fetch(downloadUrl, {
            signal,
            cache: "no-store",
            headers: { Range: `bytes=${rangeStart}-${rangeEnd}` },
          });
          if (!response.ok || !response.body) {
            throw new HttpStatusError(response.status);
          }

          if (response.status === 200) {
            // Servidor ignorou o Range: cai no download único (sem retomada).
            if (nextIndex > 0) {
              await clearChunks(cache, descriptor.id);
              throw new Error("Servidor não suporta retomada de download.");
            }
            const lengthHeader = Number(response.headers.get("Content-Length"));
            const expected =
              Number.isFinite(lengthHeader) && lengthHeader > 0
                ? lengthHeader
                : descriptor.sizeBytes;
            const cachedAt = Date.now();
            const headers = new Headers({
              "Content-Type": "application/octet-stream",
              "Content-Length": String(expected),
              [MODEL_CACHE_HEADERS.modelId]: descriptor.id,
              [MODEL_CACHE_HEADERS.cachedAt]: String(cachedAt),
              [MODEL_CACHE_HEADERS.sizeBytes]: String(expected),
              [MODEL_CACHE_HEADERS.sourceUrl]: downloadUrl,
            });
            try {
              const actual = await storeStreamWithProgress(
                cache,
                cacheKey,
                response.body,
                headers,
                expected,
                startedAt,
                onProgress,
              );
              const finalSize = actual > 0 ? actual : expected;
              onProgress?.({
                downloadedBytes: finalSize,
                totalBytes: finalSize,
                progressPercent: 100,
                speedBytesPerSec: Math.round(
                  finalSize / Math.max(0.05, (Date.now() - startedAt) / 1000),
                ),
              });
              return { sizeBytes: finalSize, cachedAt };
            } catch (err) {
              await cache.delete(cacheKey).catch(() => false);
              throw err;
            }
          }

          const rangeTotal = parseContentRangeTotal(response.headers.get("Content-Range"));
          if (rangeTotal === null) throw new Error("Resposta parcial sem Content-Range.");
          if (totalBytes !== null && rangeTotal !== totalBytes) {
            // O arquivo remoto mudou: descarta os blocos antigos e recomeça.
            await clearChunks(cache, descriptor.id);
            throw new Error("Arquivo do modelo mudou no servidor; reinicie o download.");
          }
          totalBytes = rangeTotal;
          const expectedChunk = Math.min(MODEL_DOWNLOAD_CHUNK_BYTES, rangeTotal - rangeStart);

          const bytes = await readBodyWithProgress(response.body, (n) => {
            chunkBytes += n;
            downloadedBytes += n;
            sessionBytes += n;
            emit();
          });
          if (bytes.byteLength !== expectedChunk) {
            throw new Error("Bloco do modelo incompleto.");
          }

          await cache.put(
            buildChunkCacheKey(descriptor.id, nextIndex),
            new Response(bytes.buffer as ArrayBuffer, {
              status: 200,
              headers: {
                "Content-Type": "application/octet-stream",
                "Content-Length": String(bytes.byteLength),
                [TOTAL_BYTES_HEADER]: String(rangeTotal),
              },
            }),
          );
          stored = true;
        } catch (err) {
          downloadedBytes -= chunkBytes;
          sessionBytes -= chunkBytes;
          if (isAbort(err) || signal?.aborted) throw err;
          if (isQuotaExceeded(err)) {
            throw err instanceof ModelStorageQuotaError
              ? err
              : new ModelStorageQuotaError(
                  Math.max(0, (totalBytes ?? descriptor.sizeBytes) - downloadedBytes),
                  null,
                  { cause: err },
                );
          }
          const fatalHttp =
            err instanceof HttpStatusError && err.status >= 400 && err.status < 500 &&
            err.status !== 408 && err.status !== 429;
          if (fatalHttp || attempt >= MAX_CHUNK_ATTEMPTS) throw err;
          // Rede móvel oscilou: espera e tenta o mesmo bloco de novo.
          await wait(Math.min(15_000, 1_000 * 2 ** (attempt - 1)), signal);
        }
      }
      nextIndex += 1;
    }

    const finalSize = totalBytes ?? 0;
    const cachedAt = Date.now();
    await cache.put(
      cacheKey,
      new Response(JSON.stringify({ chunks: nextIndex, sizeBytes: finalSize }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          [CHUNK_COUNT_HEADER]: String(nextIndex),
          [MODEL_CACHE_HEADERS.modelId]: descriptor.id,
          [MODEL_CACHE_HEADERS.cachedAt]: String(cachedAt),
          [MODEL_CACHE_HEADERS.sizeBytes]: String(finalSize),
          [MODEL_CACHE_HEADERS.sourceUrl]: downloadUrl,
        },
      }),
    );

    onProgress?.({
      downloadedBytes: finalSize,
      totalBytes: finalSize,
      progressPercent: 100,
      speedBytesPerSec: Math.round(
        sessionBytes / Math.max(0.05, (Date.now() - startedAt) / 1000),
      ),
    });
    return { sizeBytes: finalSize, cachedAt };
  } catch (err) {
    // Cancelamento explícito limpa tudo; falhas de rede mantêm os blocos para retomar.
    if (isAbort(err) || signal?.aborted) {
      await clearChunks(cache, descriptor.id);
      await cache.delete(cacheKey).catch(() => false);
    }
    throw err;
  } finally {
    await wakeLock?.release().catch(() => undefined);
  }
}

export async function deleteCachedModel(
  modelId: LocalModelId,
): Promise<boolean> {
  const cache = await openModelsCache();
  if (!cache) return false;
  await clearChunks(cache, modelId);
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
