import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/** Lovable AI Gateway (Gemini gratuito incluso no workspace). */
export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
}

/** API compatível com OpenAI do Google AI Studio, usando a chave do próprio usuário. */
export function createUserGeminiProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "google-ai-studio",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}
