/**
 * Utilitários para detecção preventiva e reativa de cota de armazenamento no navegador (IndexedDB).
 * Permite orientar o usuário a utilizar a nuvem (Google Drive) quando a memória local estiver esgotada.
 */

export const STORAGE_SAFETY_MARGIN_BYTES = 5 * 1024 * 1024; // 5 MB de margem de segurança

export interface StorageQuotaDetails {
  requiredBytes?: number;
  availableBytes?: number;
  quotaBytes?: number;
  usageBytes?: number;
}

export class StorageQuotaExceededError extends Error {
  public readonly requiredBytes?: number;
  public readonly availableBytes?: number;
  public readonly quotaBytes?: number;
  public readonly usageBytes?: number;

  constructor(
    message: string = "Memória interna insuficiente no navegador para processar este documento.",
    details: StorageQuotaDetails = {}
  ) {
    super(message);
    this.name = "StorageQuotaExceededError";
    this.requiredBytes = details.requiredBytes;
    this.availableBytes = details.availableBytes;
    this.quotaBytes = details.quotaBytes;
    this.usageBytes = details.usageBytes;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageQuotaExceededError);
    }
  }
}

/**
 * Identifica se um determinado erro é decorrente de cota de armazenamento estourada.
 */
export function isQuotaExceededError(error: unknown): boolean {
  if (!error) return false;

  if (error instanceof StorageQuotaExceededError) {
    return true;
  }

  if (error instanceof DOMException) {
    return (
      error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      error.code === 22 // LEGACY DOMException.QUOTA_EXCEEDED_ERR
    );
  }

  if (typeof error === "object") {
    const errObj = error as Record<string, unknown>;
    const name = String(errObj.name || "");
    const message = String(errObj.message || "");

    if (
      name === "QuotaExceededError" ||
      name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      message.toLowerCase().includes("quota") ||
      message.toLowerCase().includes("memória interna insuficiente")
    ) {
      return true;
    }
  }

  return false;
}

export interface StorageCheckResult {
  hasSpace: boolean;
  isSupported: boolean;
  availableBytes?: number;
  quotaBytes?: number;
  usageBytes?: number;
}

/**
 * Verifica proativamente se o navegador possui cota disponível para salvar um arquivo.
 */
export async function checkStorageAvailable(
  requiredBytes: number = 0
): Promise<StorageCheckResult> {
  if (
    typeof navigator === "undefined" ||
    !navigator.storage ||
    typeof navigator.storage.estimate !== "function"
  ) {
    return { hasSpace: true, isSupported: false };
  }

  try {
    const estimate = await navigator.storage.estimate();
    const quota = estimate.quota ?? 0;
    const usage = estimate.usage ?? 0;

    if (quota === 0) {
      return { hasSpace: true, isSupported: true, quotaBytes: quota, usageBytes: usage };
    }

    const available = Math.max(0, quota - usage);
    const needed = requiredBytes + STORAGE_SAFETY_MARGIN_BYTES;
    const hasSpace = available >= needed;

    return {
      hasSpace,
      isSupported: true,
      availableBytes: available,
      quotaBytes: quota,
      usageBytes: usage,
    };
  } catch {
    // Em caso de falha no estimate, não bloqueia a operação
    return { hasSpace: true, isSupported: true };
  }
}
