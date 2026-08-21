/**
 * Adapter especializado na conversão de textos digitados ou colados (Quick Paste).
 * Padrão: GoF Adapter Pattern.
 */
import { ParsedDocumentBuilder } from "@/lib/domain/document-builder";
import type { ParsedDocument } from "@/lib/domain/document.types";

export class QuickPasteAdapter {
  /**
   * Converte texto bruto em ParsedDocument estruturado com contagem de palavras e sentenças.
   */
  public static parseRaw(title: string, text: string): ParsedDocument {
    const cleanTitle = title.trim() || `Nota colada - ${new Date().toLocaleDateString("pt-BR")}`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });

    return new ParsedDocumentBuilder()
      .setTitle(cleanTitle)
      .setFormat("paste")
      .setSizeBytes(blob.size)
      .setRawBlob(blob)
      .addRawText(text)
      .build();
  }
}
