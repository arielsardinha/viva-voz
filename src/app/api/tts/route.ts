import { z } from "zod";

const BodySchema = z.object({
  text: z.string().min(1).max(2000),
  voice: z.string().min(1).max(40).default("Kore"),
  engine: z.enum(["google"]).default("google"),
  userApiKey: z.string().trim().min(10).max(200).optional(),
});

/** Empacota PCM 24kHz 16-bit mono em um arquivo WAV tocável pelo <audio>. */
function pcmToWav(pcm: Uint8Array, sampleRate = 24000): Uint8Array {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
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

function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function geminiBody(model: string, text: string, voice: string) {
  return {
    model,
    contents: [{ role: "user", parts: [{ text }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
    },
  };
}

function errorMessage(status: number) {
  if (status === 429)
    return "Cota de narração com IA esgotada ou limite de requisições atingido. Alterne para as vozes gratuitas do sistema ou aguarde alguns instantes.";
  if (status === 401 || status === 403)
    return "Chave do Google AI Studio inválida ou sem permissão para narração.";
  if (status === 402)
    return "Cota ou créditos esgotados na sua conta do Google AI Studio.";
  return `Não foi possível gerar o áudio (${status}).`;
}

export async function POST(request: Request) {
  let parsed;
  try {
    parsed = BodySchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const apiKey = parsed.userApiKey;

  if (!apiKey) {
    return Response.json(
      {
        error:
          "Chave do Google AI Studio não configurada. Conecte sua conta Gemini para narrar com a voz da IA.",
      },
      { status: 401 },
    );
  }

  const model = "gemini-2.5-flash-preview-tts";
  const upstream = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(geminiBody(model, parsed.text, parsed.voice)),
    },
  );

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    console.error(`TTS Google falhou [${upstream.status}]: ${detail}`);
    return Response.json(
      { error: errorMessage(upstream.status) },
      { status: upstream.status },
    );
  }

  const json = (await upstream.json()) as {
    candidates?: { content?: { parts?: { inlineData?: { data?: string } }[] } }[];
  };
  const base64 = json.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64) {
    return Response.json({ error: "A IA não retornou áudio para este trecho." }, { status: 502 });
  }

  const wav = pcmToWav(decodeBase64(base64));
  return new Response(wav as unknown as BodyInit, {
    headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" },
  });
}

