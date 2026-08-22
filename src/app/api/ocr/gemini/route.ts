/**
 * Endpoint BFF para processamento de OCR via Gemini Vision (BYOK - Bring Your Own Key).
 * Padrão: Next.js Route Handler / Backend For Frontend.
 */
import { NextResponse, type NextRequest } from "next/server";
import { getGeminiKeyCookie } from "@/lib/ai/server/gemini-cookie.service";

export const runtime = "nodejs";

const OCR_SYSTEM_PROMPT =
  "Você é um motor de OCR de altíssima precisão. Transcreva com exatidão todo o texto legível nesta imagem. " +
  "Mantenha a ordem natural de leitura e estruture em parágrafos claros. " +
  "Remova hifenizações de final de linha unindo as palavras corretamente. " +
  "Retorne ESTRITAMENTE o texto extraído, sem cumprimentos, avisos, aspas adicionais ou formatações desnecessárias.";

export async function POST(request: Request | NextRequest) {
  try {
    let base64Data = "";
    let mimeType = "image/png";
    let directKey: string | null = null;

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await request.json();
      base64Data = body.imageBase64 || "";
      mimeType = body.mimeType || "image/png";
      directKey = body.userApiKey || body.apiKey || null;
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as Blob | null;
      directKey = (formData.get("apiKey") as string | null) || (formData.get("userApiKey") as string | null);

      if (file) {
        const buffer = Buffer.from(await file.arrayBuffer());
        base64Data = buffer.toString("base64");
        mimeType = file.type || "image/png";
      }
    } else {
      // Fallback genérico para JSON
      try {
        const body = await request.json();
        base64Data = body.imageBase64 || "";
        mimeType = body.mimeType || "image/png";
        directKey = body.userApiKey || body.apiKey || null;
      } catch {
        // Ignora erro de parse
      }
    }

    if (!directKey) {
      directKey = request.headers.get("x-gemini-key");
    }

    const cookieKey = await getGeminiKeyCookie();
    const apiKey = directKey?.trim() || cookieKey?.trim();

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Chave da API Gemini não encontrada. Configure sua chave no painel de configurações ou utilize o modo offline.",
        },
        { status: 401 }
      );
    }

    if (!base64Data) {
      return NextResponse.json(
        { error: "Nenhum arquivo de imagem foi fornecido para o OCR." },
        { status: 400 }
      );
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          parts: [
            { text: OCR_SYSTEM_PROMPT },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
      },
    };

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorDetail = "Falha de comunicação com o serviço Gemini Vision.";
      try {
        const errJson = await response.json();
        if (errJson?.error?.message) {
          errorDetail = errJson.error.message;
        }
      } catch {
        // Ignora erro de parse
      }
      return NextResponse.json({ error: errorDetail }, { status: response.status });
    }

    const data = await response.json();
    const rawText =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    return NextResponse.json({ text: rawText });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno no processamento de OCR.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
