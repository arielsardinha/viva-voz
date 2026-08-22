/**
 * Adapter para extração de artigos web via URL.
 * Delega para a API Route server-side /api/extract-url para contornar CORS.
 * Padrão: GoF Structural Pattern — Adapter (SOLID).
 */
import type { DocumentFormat, OnParseProgress, ParsedDocument } from "@/lib/domain/document.types";
import type { IDocumentParserAdapter } from "./adapter.interface";

/**
 * Adapter especial para URLs da web.
 * Nota: canHandle recebe uma URL string disfarçada como File via objeto sintético.
 * O fluxo real ocorre via useWebArticleExtractor + /api/extract-url.
 */
export class WebArticleAdapter implements IDocumentParserAdapter {
  public readonly supportedFormats: DocumentFormat[] = ["web"];

  /**
   * Detecta se o arquivo é na verdade uma URL HTTP/HTTPS.
   * (Não aplicável ao fluxo padrão de File — este adapter é invocado diretamente pelo ViewModel.)
   */
  public canHandle(file: File): boolean {
    // URLs não chegam como File — este método retorna false intencionalmente
    // para não capturar uploads regulares no AdapterRegistry.
    return false;
  }

  /**
   * Não utilizado diretamente — a extração é feita via fetchFromUrl().
   */
  public async parse(_file: File, _onProgress?: OnParseProgress): Promise<ParsedDocument> {
    throw new Error(
      "WebArticleAdapter.parse() não deve ser chamado diretamente. Use fetchFromUrl()."
    );
  }

  /**
   * Realiza a extração do artigo via API Route /api/extract-url.
   * Deve ser chamado pelo ViewModel (useWebArticleExtractor).
   */
  public async fetchFromUrl(
    url: string,
    onProgress?: OnParseProgress
  ): Promise<ParsedDocument> {
    onProgress?.({ current: 10, total: 100, message: "Conectando ao servidor remoto..." });

    const response = await fetch("/api/extract-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    onProgress?.({ current: 60, total: 100, message: "Processando conteúdo do artigo..." });

    if (!response.ok) {
      let errorMessage = `Erro ${response.status} ao extrair artigo.`;
      try {
        const errorBody = await response.json();
        if (errorBody?.error) errorMessage = errorBody.error;
      } catch {
        // mantém mensagem padrão
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();

    if (!data?.document) {
      throw new Error("Resposta inválida do servidor: documento não encontrado.");
    }

    onProgress?.({ current: 100, total: 100, message: "Artigo extraído com sucesso!" });

    return data.document as ParsedDocument;
  }
}
