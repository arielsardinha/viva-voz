/**
 * Route Handler: POST /api/extract-url
 * Realiza o fetch server-side de um artigo web (CORS bypass),
 * aplica Mozilla Readability para extrair conteúdo limpo
 * e retorna um ParsedDocument estruturado.
 *
 * Padrão: Next.js Server-First Route Handler (RSC/BFF).
 */
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { NextRequest, NextResponse } from "next/server";
import { ParsedDocumentBuilder } from "@/lib/domain/document-builder";

const FETCH_TIMEOUT_MS = 8_000;

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
};

export interface ExtractUrlApiResponse {
  title: string;
  byline?: string;
  siteUrl: string;
  wordCount: number;
  estimatedMinutes: number;
  document: ReturnType<ParsedDocumentBuilder["build"]>;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let url: string;

  try {
    const body = await request.json();
    url = body?.url;
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  if (!url || typeof url !== "string" || !/^https?:\/\//i.test(url)) {
    return NextResponse.json(
      { error: "URL inválida. Forneça uma URL completa começando com http:// ou https://." },
      { status: 400 }
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let html: string;
  let finalUrl: string;

  try {
    const response = await fetch(url, {
      headers: BROWSER_HEADERS,
      signal: controller.signal,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `O servidor remoto retornou status ${response.status}.` },
        { status: 502 }
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return NextResponse.json(
        { error: "O endereço fornecido não retorna uma página HTML." },
        { status: 415 }
      );
    }

    html = await response.text();
    finalUrl = response.url;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json(
        { error: "A requisição excedeu o tempo limite de 8 segundos." },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: "Não foi possível acessar a URL fornecida." },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeoutId);
  }

  // Aplica Mozilla Readability para extrair conteúdo limpo
  const dom = new JSDOM(html, { url: finalUrl });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article || !article.textContent?.trim()) {
    return NextResponse.json(
      {
        error:
          "Não foi possível extrair o conteúdo principal da página. O site pode ser uma SPA, estar atrás de paywall ou bloquear bots.",
      },
      { status: 422 }
    );
  }

  const siteOrigin = (() => {
    try {
      return new URL(finalUrl).hostname;
    } catch {
      return finalUrl;
    }
  })();

  const title = article.title?.trim() || siteOrigin;
  const author = article.byline?.trim() || undefined;
  const rawText = article.textContent.trim();

  const builder = new ParsedDocumentBuilder()
    .setTitle(title)
    .setAuthor(author)
    .setFormat("web")
    .setSizeBytes(new TextEncoder().encode(rawText).length)
    .setOriginalFileName(finalUrl)
    .addRawText(rawText);

  const parsedDocument = builder.build();
  const wordCount = rawText.split(/\s+/).filter(Boolean).length;
  const estimatedMinutes = Math.ceil(wordCount / 200);

  const responseBody: ExtractUrlApiResponse = {
    title,
    byline: author,
    siteUrl: siteOrigin,
    wordCount,
    estimatedMinutes,
    document: parsedDocument,
  };

  return NextResponse.json(responseBody);
}
