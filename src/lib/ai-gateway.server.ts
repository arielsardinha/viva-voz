import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/** API compatível com OpenAI do Google AI Studio (Gemini). */
export function createUserGeminiProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "google-ai-studio",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}
