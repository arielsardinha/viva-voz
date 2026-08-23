import type { ErrorEvent } from "@sentry/nextjs";

/**
 * Lista de chaves e campos sensíveis que devem ser redigidos (REDACTED).
 */
const SENSITIVE_KEYS = new Set([
  "userapikey",
  "apikey",
  "api_key",
  "key",
  "secret",
  "client_secret",
  "accesstoken",
  "access_token",
  "refreshtoken",
  "refresh_token",
  "token",
  "authorization",
  "cookie",
  "set-cookie",
  "x-goog-api-key",
  "documentcontent",
  "rawtext",
  "content",
  "password",
]);

/**
 * Redige recursivamente valores de objetos ou arrays contendo chaves sensíveis.
 */
export function sanitizeData<T>(data: T, depth = 0): T {
  if (depth > 6 || data === null || data === undefined) {
    return data;
  }

  if (typeof data === "string") {
    // Redige URLs contendo query params sensíveis como ?key=... ou &access_token=...
    return data.replace(/((?:key|apiKey|token|access_token|refresh_token)=)[^&]+/gi, "$1[REDACTED]") as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item, depth + 1)) as unknown as T;
  }

  if (typeof data === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const normalizedKey = key.toLowerCase().replace(/[-_]/g, "");
      if (SENSITIVE_KEYS.has(normalizedKey) || SENSITIVE_KEYS.has(key.toLowerCase())) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = sanitizeData(value, depth + 1);
      }
    }
    return sanitized as T;
  }

  return data;
}

/**
 * Sanitiza eventos do Sentry antes do envio para a nuvem.
 */
export function sanitizeSentryEvent(event: ErrorEvent): ErrorEvent | null {
  if (!event) return event;

  // 1. Sanitiza Headers da Requisição
  if (event.request?.headers) {
    const headers = event.request.headers;
    delete headers["x-goog-api-key"];
    delete headers["authorization"];
    delete headers["cookie"];
    delete headers["set-cookie"];
    delete headers["x-api-key"];
  }

  // 2. Sanitiza URL da requisição se contiver query params sensíveis
  if (event.request?.url) {
    event.request.url = sanitizeData(event.request.url);
  }

  // 3. Sanitiza dados extras e breadcrumbs
  if (event.extra) {
    event.extra = sanitizeData(event.extra);
  }

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((crumb) => ({
      ...crumb,
      data: crumb.data ? sanitizeData(crumb.data) : undefined,
      message: crumb.message ? sanitizeData(crumb.message) : undefined,
    }));
  }

  // 4. Sanitiza tags se houver
  if (event.tags) {
    event.tags = sanitizeData(event.tags);
  }

  return event;
}
