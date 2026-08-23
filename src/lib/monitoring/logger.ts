import * as Sentry from "@sentry/nextjs";
import { sanitizeData } from "./sanitizer";

export type LogModule =
  | "tts_synthesis"
  | "parser"
  | "google_drive_sync"
  | "indexeddb_storage"
  | "ai_chat"
  | "auth"
  | "ui"
  | "general";

export type DocumentFormat =
  | "pdf"
  | "docx"
  | "epub"
  | "txt"
  | "odt"
  | "pptx"
  | "web_article"
  | "quick_paste";

export type StorageTarget = "indexeddb" | "google_drive";
export type TtsEngine = "gemini" | "web_speech" | "server_tts";

export interface LogContext {
  module?: LogModule;
  tags?: Record<string, string | number | boolean>;
  extra?: Record<string, unknown>;
  level?: Sentry.SeverityLevel;
  fingerprint?: string[];
}

export interface SpanOptions {
  name: string;
  op: string;
  data?: Record<string, unknown>;
  tags?: Record<string, string>;
}

/**
 * Utilitário centralizado de monitoramento, observabilidade e logs para o VivaVoz.
 * Integração segura com o Sentry com sanitização de dados e tags padronizadas.
 */
class LoggerService {
  /**
   * Registra uma mensagem informativa.
   */
  info(message: string, context: LogContext = {}): void {
    const sanitizedExtra = context.extra ? sanitizeData(context.extra) : undefined;
    
    Sentry.addBreadcrumb({
      category: context.module || "general",
      message,
      level: "info",
      data: sanitizedExtra,
    });

    if (context.tags || sanitizedExtra) {
      Sentry.captureMessage(message, {
        level: "info",
        tags: { module: context.module || "general", ...context.tags },
        extra: sanitizedExtra,
        fingerprint: context.fingerprint,
      });
    }
  }

  /**
   * Registra um aviso (warning).
   */
  warn(message: string, context: LogContext = {}): void {
    const sanitizedExtra = context.extra ? sanitizeData(context.extra) : undefined;

    Sentry.captureMessage(message, {
      level: "warning",
      tags: { module: context.module || "general", ...context.tags },
      extra: sanitizedExtra,
      fingerprint: context.fingerprint,
    });
  }

  /**
   * Captura uma exceção ou mensagem de erro com contexto seguro.
   */
  error(errorOrMessage: unknown, context: LogContext = {}): void {
    const sanitizedExtra = context.extra ? sanitizeData(context.extra) : undefined;
    const tags = { module: context.module || "general", ...context.tags };

    if (typeof errorOrMessage === "string") {
      Sentry.captureMessage(errorOrMessage, {
        level: context.level || "error",
        tags,
        extra: sanitizedExtra,
        fingerprint: context.fingerprint,
      });
    } else {
      Sentry.captureException(errorOrMessage, {
        level: context.level || "error",
        tags,
        extra: sanitizedExtra,
        fingerprint: context.fingerprint,
      });
    }
  }

  /**
   * Executa uma função envolvida em um span de performance do Sentry.
   */
  async startSpan<T>(
    options: SpanOptions,
    callback: (span?: ReturnType<typeof Sentry.startSpan>) => Promise<T> | T
  ): Promise<T> {
    try {
      return await Sentry.startSpan(
        {
          name: options.name,
          op: options.op,
          attributes: options.data ? (sanitizeData(options.data) as Record<string, string | number | boolean>) : undefined,
        },
        async (span) => {
          if (options.tags) {
            for (const [key, value] of Object.entries(options.tags)) {
              Sentry.setTag(key, value);
            }
          }
          return await callback(span);
        }
      );
    } catch (err) {
      this.error(err, {
        module: "general",
        tags: { span_name: options.name, span_op: options.op, ...options.tags },
        extra: options.data,
      });
      throw err;
    }
  }

  /**
   * Define uma tag global no Sentry.
   */
  setTag(key: string, value: string | number | boolean): void {
    Sentry.setTag(key, String(value));
  }

  /**
   * Define múltiplas tags simultaneamente.
   */
  setTags(tags: Record<string, string | number | boolean>): void {
    for (const [key, value] of Object.entries(tags)) {
      Sentry.setTag(key, String(value));
    }
  }

  /**
   * Monitoramento específico para Síntese de Voz (TTS)
   */
  readonly tts = {
    chunkSynthesized: (data: {
      docId?: string;
      chunkIndex: number;
      charLength: number;
      voiceName?: string;
      durationMs?: number;
    }) => {
      this.info("TTS chunk synthesized", {
        module: "tts_synthesis",
        tags: { voice_name: data.voiceName || "default" },
        extra: data,
      });
    },

    failed: (
      error: unknown,
      context: {
        docId?: string;
        chunkIndex?: number;
        voiceName?: string;
        statusCode?: number;
      } = {}
    ) => {
      const isQuotaError = context.statusCode === 429;
      this.error(error, {
        module: "tts_synthesis",
        level: isQuotaError ? "warning" : "error",
        tags: {
          status_code: context.statusCode || "unknown",
          voice_name: context.voiceName || "unknown",
          is_quota_error: String(isQuotaError),
        },
        extra: context,
      });
    },
  };

  /**
   * Monitoramento específico para Parsers de Documentos
   */
  readonly parser = {
    started: (data: { format: DocumentFormat; fileSizeKb?: number; fileName?: string }) => {
      this.info(`Parser started for format: ${data.format}`, {
        module: "parser",
        tags: { format: data.format },
        extra: data,
      });
    },

    success: (data: {
      format: DocumentFormat;
      fileSizeKb?: number;
      extractedChars: number;
      durationMs: number;
    }) => {
      this.info(`Parser completed for format: ${data.format}`, {
        module: "parser",
        tags: { format: data.format },
        extra: data,
      });
    },

    failed: (
      error: unknown,
      context: { format?: DocumentFormat; fileName?: string; stage?: string } = {}
    ) => {
      this.error(error, {
        module: "parser",
        tags: {
          format: context.format || "unknown",
          stage: context.stage || "parsing",
        },
        extra: context,
      });
    },
  };

  /**
   * Monitoramento específico para Sincronização Google Drive (BFF)
   */
  readonly sync = {
    backupStarted: (data: { docCount: number; hasApiKey: boolean }) => {
      this.info("Google Drive backup started", {
        module: "google_drive_sync",
        tags: { has_api_key: String(data.hasApiKey) },
        extra: data,
      });
    },

    backupSuccess: (data: { docCount: number; durationMs?: number }) => {
      this.info("Google Drive backup completed successfully", {
        module: "google_drive_sync",
        extra: data,
      });
    },

    failed: (error: unknown, context: { action: string; statusCode?: number } = { action: "unknown" }) => {
      this.error(error, {
        module: "google_drive_sync",
        tags: {
          action: context.action,
          status_code: context.statusCode || "unknown",
        },
        extra: context,
      });
    },

    tokenExpired: () => {
      this.warn("Google Drive OAuth token expired or refresh failed", {
        module: "google_drive_sync",
        tags: { event_type: "token_expired" },
      });
    },
  };

  /**
   * Monitoramento específico para Armazenamento Local (IndexedDB)
   */
  readonly storage = {
    quotaExceeded: (data: { target: StorageTarget; attemptedSizeKb?: number }) => {
      this.warn("Storage quota exceeded", {
        module: "indexeddb_storage",
        tags: { storage_target: data.target },
        extra: data,
      });
    },

    evictionTriggered: (data: { evictedDocId: string; reason?: string }) => {
      this.info("IndexedDB LRU eviction triggered", {
        module: "indexeddb_storage",
        extra: data,
      });
    },

    failed: (error: unknown, context: { operation: string; target: StorageTarget }) => {
      this.error(error, {
        module: "indexeddb_storage",
        tags: { operation: context.operation, storage_target: context.target },
        extra: context,
      });
    },
  };
}

export const logger = new LoggerService();
