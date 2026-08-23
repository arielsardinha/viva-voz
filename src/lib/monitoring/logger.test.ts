import * as Sentry from "@sentry/nextjs";
import { logger } from "./logger";
import { sanitizeData, sanitizeSentryEvent } from "./sanitizer";

jest.mock("@sentry/nextjs", () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  setTag: jest.fn(),
  startSpan: jest.fn((options, callback) => callback({ name: options.name })),
  replayIntegration: jest.fn(),
  captureRouterTransitionStart: jest.fn(),
  captureRequestError: jest.fn(),
}));

describe("Sanitizer Unit Tests", () => {
  it("deve redigir chaves sensíveis em objetos aninhados", () => {
    const rawData = {
      userApiKey: "secret-gemini-key-12345",
      apiKey: "secret-key",
      client_secret: "google-secret",
      accessToken: "oauth-token",
      refreshToken: "refresh-token",
      documentContent: "Texto ultra confidencial",
      rawText: "Outro texto confidencial",
      normalField: "valor-publico",
      nested: {
        token: "nested-token",
        safeValue: 42,
      },
    };

    const sanitized = sanitizeData(rawData);

    expect(sanitized.userApiKey).toBe("[REDACTED]");
    expect(sanitized.apiKey).toBe("[REDACTED]");
    expect(sanitized.client_secret).toBe("[REDACTED]");
    expect(sanitized.accessToken).toBe("[REDACTED]");
    expect(sanitized.refreshToken).toBe("[REDACTED]");
    expect(sanitized.documentContent).toBe("[REDACTED]");
    expect(sanitized.rawText).toBe("[REDACTED]");
    expect(sanitized.normalField).toBe("valor-publico");
    expect(sanitized.nested.token).toBe("[REDACTED]");
    expect(sanitized.nested.safeValue).toBe(42);
  });

  it("deve redigir query params sensíveis em URLs", () => {
    const url = "https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyD-12345&access_token=xyz";
    const sanitizedUrl = sanitizeData(url);
    expect(sanitizedUrl).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models?key=[REDACTED]&access_token=[REDACTED]"
    );
  });

  it("deve sanitizar eventos do Sentry removendo headers e dados sensíveis", () => {
    const mockEvent = {
      request: {
        url: "https://example.com/api?token=secret123",
        headers: {
          "x-goog-api-key": "secret-gemini",
          authorization: "Bearer secret-token",
          cookie: "session=xyz",
          "set-cookie": "token=abc",
          "x-api-key": "key-val",
          "content-type": "application/json",
        },
      },
      extra: {
        userApiKey: "sensitive-key",
        normalData: "ok",
      },
      breadcrumbs: [
        {
          message: "User logged in with key AIzaSyD-123",
          data: { token: "token123" },
        },
      ],
      tags: {
        apiKey: "should-be-redacted",
        environment: "production",
      },
    };

    const result = sanitizeSentryEvent(mockEvent as any);

    expect(result?.request?.headers?.["x-goog-api-key"]).toBeUndefined();
    expect(result?.request?.headers?.["authorization"]).toBeUndefined();
    expect(result?.request?.headers?.["cookie"]).toBeUndefined();
    expect(result?.request?.headers?.["set-cookie"]).toBeUndefined();
    expect(result?.request?.headers?.["x-api-key"]).toBeUndefined();
    expect(result?.request?.headers?.["content-type"]).toBe("application/json");

    expect(result?.extra?.userApiKey).toBe("[REDACTED]");
    expect(result?.extra?.normalData).toBe("ok");
    expect(result?.breadcrumbs?.[0].data?.token).toBe("[REDACTED]");
    expect(result?.tags?.apiKey).toBe("[REDACTED]");
    expect(result?.tags?.environment).toBe("production");
  });
});

describe("LoggerService Unit & Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve adicionar breadcrumbs e capturar mensagem em logger.info", () => {
    logger.info("Processamento iniciado", {
      module: "parser",
      tags: { format: "pdf" },
      extra: { fileName: "documento.pdf" },
    });

    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "parser",
        message: "Processamento iniciado",
        level: "info",
      })
    );

    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      "Processamento iniciado",
      expect.objectContaining({
        level: "info",
        tags: { module: "parser", format: "pdf" },
      })
    );
  });

  it("deve capturar avisos em logger.warn com tags e extras sanitizados", () => {
    logger.warn("Aviso de cota próxima do limite", {
      module: "tts_synthesis",
      extra: { apiKey: "secret123", remaining: 10 },
    });

    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      "Aviso de cota próxima do limite",
      expect.objectContaining({
        level: "warning",
        tags: { module: "tts_synthesis" },
        extra: { apiKey: "[REDACTED]", remaining: 10 },
      })
    );
  });

  it("deve capturar exceções em logger.error", () => {
    const error = new Error("Falha na síntese");
    logger.error(error, {
      module: "tts_synthesis",
      tags: { voice: "pt-BR-Wavenet-A" },
    });

    expect(Sentry.captureException).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        level: "error",
        tags: { module: "tts_synthesis", voice: "pt-BR-Wavenet-A" },
      })
    );
  });

  it("deve capturar mensagens de erro string em logger.error", () => {
    logger.error("Erro fatal não tratado", {
      module: "google_drive_sync",
    });

    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      "Erro fatal não tratado",
      expect.objectContaining({
        level: "error",
        tags: { module: "google_drive_sync" },
      })
    );
  });

  it("deve gerenciar spans de performance com sucesso", async () => {
    const callback = jest.fn().mockResolvedValue("resultado-sucesso");

    const result = await logger.startSpan(
      {
        name: "Parse PDF",
        op: "parse.pdf",
        tags: { format: "pdf" },
        data: { fileSizeKb: 500 },
      },
      callback
    );

    expect(result).toBe("resultado-sucesso");
    expect(Sentry.startSpan).toHaveBeenCalled();
    expect(Sentry.setTag).toHaveBeenCalledWith("format", "pdf");
  });

  it("deve capturar erro e propagar exceção em startSpan se o callback falhar", async () => {
    const testError = new Error("Erro no processamento do span");
    const failingCallback = jest.fn().mockRejectedValue(testError);

    await expect(
      logger.startSpan(
        {
          name: "Parse Failure",
          op: "parse.fail",
        },
        failingCallback
      )
    ).rejects.toThrow("Erro no processamento do span");

    expect(Sentry.captureException).toHaveBeenCalledWith(
      testError,
      expect.objectContaining({
        tags: expect.objectContaining({ span_name: "Parse Failure" }),
      })
    );
  });

  describe("Submódulos Especializados do Logger", () => {
    it("deve registrar eventos de TTS com sucesso e falha", () => {
      logger.tts.chunkSynthesized({
        chunkIndex: 0,
        charLength: 150,
        voiceName: "pt-BR-Neural2-A",
      });

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        "TTS chunk synthesized",
        expect.objectContaining({
          tags: { module: "tts_synthesis", voice_name: "pt-BR-Neural2-A" },
        })
      );

      logger.tts.failed(new Error("Rate limit"), { statusCode: 429 });
      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          level: "warning",
          tags: expect.objectContaining({ is_quota_error: "true" }),
        })
      );
    });

    it("deve registrar eventos de Parser com sucesso e falha", () => {
      logger.parser.started({ format: "epub", fileName: "livro.epub" });
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        "Parser started for format: epub",
        expect.objectContaining({ tags: { module: "parser", format: "epub" } })
      );

      logger.parser.success({
        format: "epub",
        extractedChars: 50000,
        durationMs: 320,
      });
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        "Parser completed for format: epub",
        expect.objectContaining({ tags: { module: "parser", format: "epub" } })
      );

      logger.parser.failed(new Error("Corrupt epub"), { format: "epub" });
      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ tags: { module: "parser", format: "epub", stage: "parsing" } })
      );
    });

    it("deve registrar eventos de Google Drive Sync", () => {
      logger.sync.backupStarted({ docCount: 5, hasApiKey: true });
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        "Google Drive backup started",
        expect.objectContaining({ tags: { module: "google_drive_sync", has_api_key: "true" } })
      );

      logger.sync.tokenExpired();
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        "Google Drive OAuth token expired or refresh failed",
        expect.objectContaining({ level: "warning" })
      );
    });

    it("deve registrar eventos de Storage e Eviction LRU", () => {
      logger.storage.quotaExceeded({ target: "indexeddb", attemptedSizeKb: 10240 });
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        "Storage quota exceeded",
        expect.objectContaining({
          level: "warning",
          tags: { module: "indexeddb_storage", storage_target: "indexeddb" },
        })
      );

      logger.storage.evictionTriggered({ evictedDocId: "doc_123", reason: "lru" });
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        "IndexedDB LRU eviction triggered",
        expect.objectContaining({ extra: { evictedDocId: "doc_123", reason: "lru" } })
      );
    });
  });
});
