import { z } from "zod";
import { getGeminiKeyCookie } from "@/lib/ai/server/gemini-cookie.service";
import { synthesizeSpeechWithFallback } from "@/lib/ai/server/tts-fallback.service";
import {
  TTS_FALLBACK_HEADER,
  TTS_MODEL_HEADER,
  TTS_MODEL_LABEL_HEADER,
} from "@/lib/tts-models";

const BodySchema = z.object({
  text: z.string().min(1).max(2000),
  voice: z.string().min(1).max(40).default("Kore"),
  engine: z.enum(["google"]).default("google"),
  userApiKey: z.string().trim().min(10).max(200).optional(),
});

export async function POST(request: Request) {
  let parsed;
  try {
    parsed = BodySchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  // Prioriza a chave segura recuperada do cookie HttpOnly (BFF)
  const cookieKey = await getGeminiKeyCookie().catch(() => null);
  const apiKey = cookieKey || parsed.userApiKey;

  if (!apiKey) {
    return Response.json(
      {
        error:
          "Chave do Google AI Studio não configurada. Conecte sua conta Gemini para narrar com a voz da IA.",
      },
      { status: 401 },
    );
  }

  const result = await synthesizeSpeechWithFallback({
    text: parsed.text,
    voice: parsed.voice,
    apiKey,
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return new Response(result.wav as unknown as BodyInit, {
    headers: {
      "Content-Type": "audio/wav",
      "Cache-Control": "no-store",
      [TTS_MODEL_HEADER]: result.model.id,
      [TTS_MODEL_LABEL_HEADER]: result.model.label,
      [TTS_FALLBACK_HEADER]: result.didFallback ? "true" : "false",
      "Access-Control-Expose-Headers": `${TTS_MODEL_HEADER}, ${TTS_MODEL_LABEL_HEADER}, ${TTS_FALLBACK_HEADER}`,
    },
  });
}
