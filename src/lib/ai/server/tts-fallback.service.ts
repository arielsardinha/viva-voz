import { createHash } from "node:crypto";
import {
  GEMINI_TTS_MODELS,
  type GeminiTtsModelSpec,
} from "@/lib/tts-models";

const RATE_LIMIT_COOLDOWN_MS = 60_000;
const UNAVAILABLE_MODEL_COOLDOWN_MS = 15 * 60_000;
const TRANSIENT_ERROR_COOLDOWN_MS = 30_000;
const MIN_RETRY_AFTER_MS = 10_000;
const MAX_RETRY_AFTER_MS = 300_000;

interface CooldownEntry {
  expiresAt: number;
  status: number;
}

export interface FailedModelAttempt {
  modelId: string;
  status: number;
}

export type TtsSynthesisResult =
  | {
      ok: true;
      wav: Uint8Array;
      model: GeminiTtsModelSpec;
      didFallback: boolean;
      failedModels: FailedModelAttempt[];
    }
  | {
      ok: false;
      status: number;
      error: string;
      failedModels: FailedModelAttempt[];
    };

export interface SynthesizeSpeechOptions {
  text: string;
  voice: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
  models?: readonly GeminiTtsModelSpec[];
}

interface InteractionsContentItem {
  type?: string;
  data?: string;
}

interface InteractionsStep {
  type?: string;
  content?: InteractionsContentItem[];
}

interface InteractionsResponseBody {
  steps?: InteractionsStep[];
  outputs?: InteractionsContentItem[];
}

interface GenerateContentResponseBody {
  candidates?: {
    content?: {
      parts?: {
        inlineData?: { data?: string };
      }[];
    };
  }[];
}

const modelCooldowns = new Map<string, CooldownEntry>();

/** Limpa os cooldowns em memória entre suítes de testes. */
export function resetTtsModelCooldowns(): void {
  modelCooldowns.clear();
}

function buildKeyScope(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex").slice(0, 16);
}

function buildCooldownKey(keyScope: string, modelId: string): string {
  return `${keyScope}::${modelId}`;
}

/** Verifica se os bytes já contêm um cabeçalho RIFF/WAVE válido. */
export function hasRiffWavHeader(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  const wave = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
  return riff === "RIFF" && wave === "WAVE";
}

/** Empacota PCM 24kHz 16-bit mono em um arquivo WAV tocável pelo navegador. */
export function pcmToWav(pcm: Uint8Array, sampleRate = 24000): Uint8Array {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const write = (offset: number, label: string) => {
    for (let i = 0; i < label.length; i++) view.setUint8(offset + i, label.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + pcm.length, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, pcm.length, true);

  const out = new Uint8Array(44 + pcm.length);
  out.set(new Uint8Array(header), 0);
  out.set(pcm, 44);
  return out;
}

/** Garante saída WAV sem duplicar cabeçalho em modelos 3.8 que já retornam RIFF/WAVE. */
export function ensureWavAudio(rawBytes: Uint8Array): Uint8Array {
  return hasRiffWavHeader(rawBytes) ? rawBytes : pcmToWav(rawBytes, 24000);
}

function decodeBase64(base64: string): Uint8Array {
  const buf = Buffer.from(base64, "base64");
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

/** Retorna mensagens de erro sanitizadas em português para o usuário final. */
export function formatTtsErrorMessage(status: number): string {
  if (status === 429) {
    return "Cota de narração com IA esgotada ou limite de requisições atingido. Alterne para as vozes gratuitas do sistema ou aguarde alguns instantes.";
  }
  if (status === 401 || status === 403) {
    return "Chave do Google AI Studio inválida ou sem permissão para narração.";
  }
  if (status === 402) {
    return "Cota ou créditos esgotados na sua conta do Google AI Studio.";
  }
  if (status === 502) {
    return "A IA não retornou áudio para este trecho.";
  }
  return "Não foi possível gerar o áudio no momento. Por favor, tente novamente em instantes.";
}

function buildUpstreamRequest(
  spec: GeminiTtsModelSpec,
  text: string,
  voice: string,
  apiKey: string,
): { url: string; init: RequestInit } {
  const headers = {
    "x-goog-api-key": apiKey,
    "Content-Type": "application/json",
  };

  if (spec.protocol === "interactions") {
    return {
      url: "https://generativelanguage.googleapis.com/v1beta/interactions",
      init: {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: spec.id,
          input: [
            {
              type: "user_input",
              content: [{ type: "text", text }],
            },
          ],
          response_format: { type: "audio" },
          generation_config: {
            speech_config: [{ voice }],
          },
        }),
      },
    };
  }

  return {
    url: `https://generativelanguage.googleapis.com/v1beta/models/${spec.id}:generateContent`,
    init: {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: spec.id,
        contents: [{ role: "user", parts: [{ text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
          },
        },
      }),
    },
  };
}

function extractInteractionsAudioBase64(body: InteractionsResponseBody): string | null {
  const steps = body.steps ?? [];
  for (let i = steps.length - 1; i >= 0; i--) {
    const step = steps[i];
    if (step.type && step.type !== "model_output") continue;
    const items = step.content ?? [];
    for (let j = items.length - 1; j >= 0; j--) {
      const item = items[j];
      if (item.type === "audio" && typeof item.data === "string" && item.data.length > 0) {
        return item.data;
      }
    }
  }

  const outputs = body.outputs ?? [];
  for (let i = outputs.length - 1; i >= 0; i--) {
    const item = outputs[i];
    if (item.type === "audio" && typeof item.data === "string" && item.data.length > 0) {
      return item.data;
    }
  }
  return null;
}

function extractAudioBase64(spec: GeminiTtsModelSpec, payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  if (spec.protocol === "interactions") {
    return extractInteractionsAudioBase64(payload as InteractionsResponseBody);
  }
  const gc = payload as GenerateContentResponseBody;
  const parts = gc.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (typeof part.inlineData?.data === "string" && part.inlineData.data.length > 0) {
      return part.inlineData.data;
    }
  }
  return null;
}

function resolveCooldownDurationMs(status: number, headers?: Headers): number {
  if (status === 429 || status === 402) {
    const retryHeader = headers?.get("Retry-After");
    if (retryHeader) {
      const parsedSeconds = Number.parseInt(retryHeader, 10);
      if (Number.isFinite(parsedSeconds) && parsedSeconds > 0) {
        return Math.min(Math.max(parsedSeconds * 1000, MIN_RETRY_AFTER_MS), MAX_RETRY_AFTER_MS);
      }
    }
    return RATE_LIMIT_COOLDOWN_MS;
  }
  if (status === 403 || status === 404) {
    return UNAVAILABLE_MODEL_COOLDOWN_MS;
  }
  return TRANSIENT_ERROR_COOLDOWN_MS;
}

function selectRepresentativeErrorStatus(statuses: number[]): number {
  const priority = [429, 402, 502, 403, 404];
  for (const code of priority) {
    if (statuses.includes(code)) return code;
  }
  return statuses[statuses.length - 1] ?? 503;
}

type SingleAttemptOutcome =
  | { kind: "success"; wav: Uint8Array }
  | { kind: "abort_auth" }
  | { kind: "retry_next"; status: number; cooldownMs: number };

async function trySingleModelAttempt(
  spec: GeminiTtsModelSpec,
  text: string,
  voice: string,
  apiKey: string,
  fetchImpl: typeof fetch,
): Promise<SingleAttemptOutcome> {
  const req = buildUpstreamRequest(spec, text, voice, apiKey);
  let upstream: Response;

  try {
    upstream = await fetchImpl(req.url, req.init);
  } catch (err) {
    console.error(`[TTS Fallback] Falha de rede no modelo ${spec.id}:`, err);
    return { kind: "retry_next", status: 503, cooldownMs: TRANSIENT_ERROR_COOLDOWN_MS };
  }

  if (!upstream.ok) {
    const detail = (await upstream.text().catch(() => "")).slice(0, 300);
    console.error(
      `[TTS Fallback] Modelo ${spec.id} falhou [${upstream.status}] (${new Date().toISOString()}): ${detail}`,
    );

    if (upstream.status === 401 || (upstream.status === 400 && detail.includes("API_KEY_INVALID"))) {
      return { kind: "abort_auth" };
    }

    return {
      kind: "retry_next",
      status: upstream.status,
      cooldownMs: resolveCooldownDurationMs(upstream.status, upstream.headers),
    };
  }

  const payload = await upstream.json().catch(() => null);
  const base64 = extractAudioBase64(spec, payload);
  if (!base64) {
    console.error(`[TTS Fallback] Modelo ${spec.id} respondeu 200 sem conteúdo de áudio.`);
    return { kind: "retry_next", status: 502, cooldownMs: 0 };
  }

  return { kind: "success", wav: ensureWavAudio(decodeBase64(base64)) };
}

/**
 * Executa a síntese de fala percorrendo a cascata de modelos Gemini TTS com cooldown.
 */
export async function synthesizeSpeechWithFallback({
  text,
  voice,
  apiKey,
  fetchImpl = fetch,
  now = () => Date.now(),
  models = GEMINI_TTS_MODELS,
}: SynthesizeSpeechOptions): Promise<TtsSynthesisResult> {
  const keyScope = buildKeyScope(apiKey);
  const failedModels: FailedModelAttempt[] = [];
  const observedStatuses: number[] = [];

  for (const spec of models) {
    const cooldownKey = buildCooldownKey(keyScope, spec.id);
    const activeCooldown = modelCooldowns.get(cooldownKey);
    const currentNow = now();

    if (activeCooldown && activeCooldown.expiresAt > currentNow) {
      observedStatuses.push(activeCooldown.status);
      failedModels.push({ modelId: spec.id, status: activeCooldown.status });
      continue;
    }

    if (activeCooldown) {
      modelCooldowns.delete(cooldownKey);
    }

    const outcome = await trySingleModelAttempt(spec, text, voice, apiKey, fetchImpl);
    if (outcome.kind === "success") {
      return {
        ok: true,
        wav: outcome.wav,
        model: spec,
        didFallback: spec.id !== models[0]?.id,
        failedModels,
      };
    }

    if (outcome.kind === "abort_auth") {
      failedModels.push({ modelId: spec.id, status: 401 });
      return {
        ok: false,
        status: 401,
        error: formatTtsErrorMessage(401),
        failedModels,
      };
    }

    observedStatuses.push(outcome.status);
    failedModels.push({ modelId: spec.id, status: outcome.status });
    if (outcome.cooldownMs > 0) {
      modelCooldowns.set(cooldownKey, {
        expiresAt: currentNow + outcome.cooldownMs,
        status: outcome.status,
      });
    }
  }

  const finalStatus = selectRepresentativeErrorStatus(observedStatuses);
  return {
    ok: false,
    status: finalStatus,
    error: formatTtsErrorMessage(finalStatus),
    failedModels,
  };
}
