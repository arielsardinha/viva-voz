import { getGeminiKeyCookie } from "@/lib/ai/server/gemini-cookie.service";
import {
  generateCloudQuiz,
  isMaskedClientApiKey,
  QuizRequestSchema,
} from "@/lib/a2ui/server/quiz-generator.service";

export const runtime = "nodejs";

/** Endpoint BFF BYOK para geração inteligente de 1 a 10 questões sobre todo o documento. */
export async function POST(request: Request) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const parsed = QuizRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json(
      { error: "Dados insuficientes ou inválidos para gerar o quiz." },
      { status: 400 },
    );
  }

  const cookieKey = await getGeminiKeyCookie().catch(() => null);
  const directKey =
    parsed.data.userApiKey && !isMaskedClientApiKey(parsed.data.userApiKey)
      ? parsed.data.userApiKey.trim()
      : null;
  const apiKey = cookieKey?.trim() || directKey;

  if (!apiKey) {
    return Response.json(
      {
        error:
          "Chave do Google AI Studio não configurada. Conecte sua conta Gemini para gerar perguntas com IA.",
      },
      { status: 401 },
    );
  }

  try {
    const result = await generateCloudQuiz({
      sentences: parsed.data.sentences,
      title: parsed.data.title,
      difficulty: parsed.data.difficulty,
      apiKey,
      signal: request.signal,
    });

    if (!result.ok) {
      return Response.json(
        { error: result.error },
        { status: result.status, headers: { "Cache-Control": "no-store" } },
      );
    }

    return Response.json(
      {
        questions: result.questions,
        coverage: result.coverage,
        modelId: result.modelId,
        tokenUsage: result.tokenUsage,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Não foi possível gerar o quiz com a IA no momento. Tente novamente." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
