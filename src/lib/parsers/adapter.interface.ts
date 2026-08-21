/**
 * Contrato polimórfico universal para extratores de documentos no VivaVoz.
 * Padrão: GoF Structural Pattern — Adapter & Interface Segregation Principle (SOLID).
 */
import type { DocumentFormat, OnParseProgress, ParsedDocument } from "@/lib/domain/document.types";

export interface IDocumentParserAdapter {
  /**
   * Lista de formatos suportados por este adapter.
   */
  readonly supportedFormats: DocumentFormat[];

  /**
   * Verifica se o arquivo pode ser processado por este adapter (por extensão ou MIME type).
   */
  canHandle(file: File): boolean;

  /**
   * Realiza o parsing assíncrono do arquivo e constrói o ParsedDocument unificado.
   */
  parse(file: File, onProgress?: OnParseProgress): Promise<ParsedDocument>;
}
