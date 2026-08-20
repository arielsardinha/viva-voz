import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider, createUserGeminiProvider } from "@/lib/ai-gateway.server";

const MAX_CONTEXT_CHARS = 60000;

type AskBody = {
  messages?: unknown;
  context?: unknown;
  fileName?: unknown;
  userApiKey?: unknown;
};

/** Converte erros do gateway/Gemini em mensagens claras para o usuário final. */
export function describeAskError(error: unknown): string {
  const status = extractStatus(error);
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const hasKeyHint =
    /api key|api_key|unauthorized|invalid.*key/i.test(raw) || status === 401 || status === 403;

  if (status === 402 || /not enough credits|payment required/i.test(raw)) {
    return "Os créditos da IA inclusa no app acabaram. Conecte sua própria conta Gemini (chave do Google AI Studio) para continuar perguntando.";
  }
  if (status === 429) {
    return "Muitas perguntas em pouco tempo. Aguarde alguns segundos e tente novamente.";
  }
  if (hasKeyHint) {
    return "A chave do Gemini informada foi recusada. Verifique a chave no Google AI Studio e conecte novamente.";
  }
  if (status && status >= 500) {
    return "O serviço de IA está temporariamente indisponível. Tente novamente em instantes.";
  }
  return raw ? `Não foi possível consultar a IA: ${raw}` : "Não foi possível consultar a IA.";
}

function extractStatus(error: unknown): number | undefined {
  const candidate = error as { statusCode?: unknown; status?: unknown; cause?: unknown };
  const value = candidate?.statusCode ?? candidate?.status;
  if (typeof value === "number") return value;
  if (candidate?.cause) return extractStatus(candidate.cause);
  const message = error instanceof Error ? error.message : "";
  const match = /\b(4\d\d|5\d\d)\b/.exec(message);
  return match ? Number(match[1]) : undefined;
}

export async function handleAskRequest(request: Request): Promise<Response> {
  let body: AskBody;
  try {
    body = (await request.json()) as AskBody;
  } catch {
    return new Response("Corpo inválido", { status: 400 });
  }

  if (!Array.isArray(body.messages)) {
    return new Response("Mensagens obrigatórias", { status: 400 });
  }

  const context = typeof body.context === "string" ? body.context.slice(0, MAX_CONTEXT_CHARS) : "";
  const fileName = typeof body.fileName === "string" ? body.fileName : "documento.pdf";
  const userApiKey =
    typeof body.userApiKey === "string" && body.userApiKey.trim().length > 10
      ? body.userApiKey.trim()
      : null;

  let model;
  if (userApiKey) {
    model = createUserGeminiProvider(userApiKey)("gemini-2.5-pro");
  } else {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return new Response("Serviço de IA indisponível", { status: 500 });
    model = createLovableAiGatewayProvider(key)("google/gemini-3.6-flash");
  }

  const system = [
    "Você é um assistente que responde perguntas sobre um documento PDF, em português do Brasil.",
    `Nome do arquivo: ${fileName}.`,
    "Responda apenas com base no conteúdo abaixo. Se a resposta não estiver no documento, diga isso claramente.",
    "Cite o número da página quando possível. Seja direto e use markdown quando ajudar.",
    "",
    "=== CONTEÚDO DO PDF ===",
    context || "(sem conteúdo extraído)",
  ].join("\n");

  const result = streamText({
    model,
    system,
    messages: await convertToModelMessages(body.messages as UIMessage[]),
    onError: ({ error }) => console.error("Falha ao consultar a IA:", error),
  });

  return result.toUIMessageStreamResponse({
    originalMessages: body.messages as UIMessage[],
    onError: (error) => describeAskError(error),
  });
}
