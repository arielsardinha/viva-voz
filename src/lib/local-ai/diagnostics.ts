import * as Sentry from "@sentry/nextjs";

/**
 * Diagnóstico dos modelos locais (download, armazenamento e inicialização).
 *
 * - `traceLocalAi` deixa um rastro (breadcrumb + log estruturado do Sentry) que
 *   aparece junto de qualquer erro capturado depois, sem gerar eventos próprios.
 * - `reportLocalAiFailure` envia o erro ao Sentry com o estágio, o erro original
 *   (nome, mensagem, causa) e o contexto do aparelho (armazenamento, WebGPU, RAM).
 *
 * O erro enviado é sempre um `LocalAiError` com mensagem própria: o `ignoreErrors`
 * do cliente descarta mensagens com "AbortError" ou "Network request failed", e
 * no celular são justamente esses erros que precisamos ver.
 */

export type LocalAiStage =
  | "download"
  | "download_chunk"
  | "download_manifest"
  | "storage_quota"
  | "engine_load_blob"
  | "engine_load_module"
  | "engine_create"
  | "chat_stream";

type Attributes = Record<string, string | number | boolean | null | undefined>;

class LocalAiError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "LocalAiError";
  }
}

export function describeError(err: unknown): {
  name: string;
  message: string;
  cause: string | null;
} {
  if (err instanceof Error || err instanceof DOMException) {
    const cause = (err as { cause?: unknown }).cause;
    return {
      name: err.name || "Error",
      message: String(err.message ?? "").slice(0, 500),
      cause:
        cause === undefined
          ? null
          : cause instanceof Error
            ? `${cause.name}: ${cause.message}`.slice(0, 500)
            : String(cause).slice(0, 500),
    };
  }
  return { name: typeof err, message: String(err).slice(0, 500), cause: null };
}

function clean(attrs: Attributes): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(attrs)) {
    if (v !== undefined && v !== null) out[k] = v;
  }
  return out;
}

export function traceLocalAi(message: string, attrs: Attributes = {}): void {
  try {
    const data = clean(attrs);
    Sentry.addBreadcrumb({ category: "local_ai", message, level: "info", data });
    Sentry.logger?.info?.(`[local-ai] ${message}`, data);
  } catch {
    // Diagnóstico nunca pode quebrar o fluxo principal.
  }
}

async function collectDeviceContext(): Promise<Record<string, unknown>> {
  const ctx: Record<string, unknown> = {};
  if (typeof navigator === "undefined") return ctx;
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    gpu?: { requestAdapter?: () => Promise<unknown> };
    connection?: { effectiveType?: string; saveData?: boolean };
  };
  ctx.userAgent = nav.userAgent;
  ctx.deviceMemoryGb = nav.deviceMemory ?? null;
  ctx.hardwareConcurrency = nav.hardwareConcurrency ?? null;
  ctx.connection = nav.connection
    ? { effectiveType: nav.connection.effectiveType, saveData: nav.connection.saveData }
    : null;
  ctx.visibility = typeof document !== "undefined" ? document.visibilityState : null;
  ctx.swControlled = Boolean(nav.serviceWorker?.controller);

  try {
    const estimate = await nav.storage?.estimate?.();
    if (estimate) {
      ctx.storageUsageMb = Math.round((estimate.usage ?? 0) / 1048576);
      ctx.storageQuotaMb = Math.round((estimate.quota ?? 0) / 1048576);
    }
    ctx.storagePersisted = (await nav.storage?.persisted?.()) ?? null;
  } catch (e) {
    ctx.storageError = describeError(e).message;
  }

  try {
    ctx.cacheNames = await globalThis.caches?.keys();
  } catch {
    // ignore
  }

  ctx.webGpu = typeof nav.gpu !== "undefined";
  if (nav.gpu?.requestAdapter) {
    try {
      const adapter = (await nav.gpu.requestAdapter()) as {
        info?: { vendor?: string; architecture?: string; description?: string };
        limits?: { maxBufferSize?: number; maxStorageBufferBindingSize?: number };
      } | null;
      ctx.gpuAdapter = adapter
        ? {
            vendor: adapter.info?.vendor,
            architecture: adapter.info?.architecture,
            description: adapter.info?.description,
            maxBufferSizeMb: adapter.limits?.maxBufferSize
              ? Math.round(adapter.limits.maxBufferSize / 1048576)
              : null,
            maxStorageBindingMb: adapter.limits?.maxStorageBufferBindingSize
              ? Math.round(adapter.limits.maxStorageBufferBindingSize / 1048576)
              : null,
          }
        : "no-adapter";
    } catch (e) {
      ctx.gpuAdapter = `error: ${describeError(e).message}`;
    }
  }
  return ctx;
}

export async function reportLocalAiFailure(
  stage: LocalAiStage,
  err: unknown,
  details: Attributes & { modelId?: string } = {},
): Promise<void> {
  try {
    const original = describeError(err);
    const device = await collectDeviceContext();
    const wrapped = new LocalAiError(
      `Falha em ${stage}${details.modelId ? ` (${details.modelId})` : ""}: ${original.name}`,
      { cause: err },
    );
    Sentry.captureException(wrapped, {
      level: "error",
      tags: {
        module: "local_ai",
        local_ai_stage: stage,
        local_ai_model: details.modelId ?? "unknown",
        local_ai_error: original.name,
      },
      contexts: {
        local_ai_error: original,
        local_ai_details: clean(details),
        local_ai_device: device,
      },
      fingerprint: ["local-ai", stage, original.name],
    });
    Sentry.logger?.error?.(`[local-ai] falha em ${stage}`, {
      ...clean(details),
      errorName: original.name,
      errorMessage: original.message,
    });
  } catch {
    // ignore
  }
}
