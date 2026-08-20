import { z } from "zod";

const BodySchema = z.object({
  text: z.string().min(1).max(2000),
  voice: z.string().min(1).max(40).default("Kore"),
  engine: z.enum(["google", "lovable"]).default("google"),
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

function errorMessage(status: number, engine: string) {
  if (status === 429) return "Muitas requisições de narração. Aguarde alguns segundos.";
  if (status === 402 || status === 403)
    return engine === "google"
      ? "Créditos/permissão indisponíveis para a narração Google."
      : "Os créditos de IA acabaram. Adicione créditos para continuar narrando.";
  return `Não foi possível gerar o áudio (${status}).`;
}

export async function POST(request: Request) {
  let parsed;
  try {
    parsed = BodySchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  // 1) Conta própria do usuário (Google AI Studio / plano pago)
  if (parsed.engine === "google" && parsed.userApiKey) {
    const model = "gemini-2.5-flash-preview-tts";
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": parsed.userApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(geminiBody(model, parsed.text, parsed.voice)),
      },
    );
    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      console.error(`TTS Google (conta do usuário) falhou [${upstream.status}]: ${detail}`);
      return Response.json(
        { error: errorMessage(upstream.status, "google") },
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

  // 2) Lovable AI Gateway (Google por padrão, OpenAI quando escolhido)
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    return Response.json({ error: "Serviço de narração indisponível." }, { status: 500 });
  }

  const payload =
    parsed.engine === "google"
      ? geminiBody("google/gemini-2.5-flash-tts", parsed.text, parsed.voice)
      : {
          model: "openai/gpt-4o-mini-tts",
          input: parsed.text,
          voice: parsed.voice,
          response_format: "mp3",
        };

  const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    console.error(`TTS ${parsed.engine} falhou [${upstream.status}]: ${detail}`);
    return Response.json(
      { error: errorMessage(upstream.status, parsed.engine) },
      { status: upstream.status },
    );
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": parsed.engine === "google" ? "audio/wav" : "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
