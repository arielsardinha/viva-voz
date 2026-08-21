/**
 * Adapter para extração e processamento de documentos PDF (.pdf).
 * Padrão: GoF Adapter Pattern.
 */
import { ParsedDocumentBuilder } from "@/lib/domain/document-builder";
import type { DocumentFormat, OnParseProgress, ParsedDocument } from "@/lib/domain/document.types";
import { extractSentencesFromPdf } from "@/lib/pdf-text";
import type { IDocumentParserAdapter } from "./adapter.interface";

export class PdfDocumentAdapter implements IDocumentParserAdapter {
  public readonly supportedFormats: DocumentFormat[] = ["pdf"];

  public canHandle(file: File): boolean {
    const isPdfMime = file.type === "application/pdf" || file.type.includes("pdf");
    const hasPdfExt = file.name.toLowerCase().endsWith(".pdf");
    return isPdfMime || hasPdfExt;
  }

  public async parse(file: File, onProgress?: OnParseProgress): Promise<ParsedDocument> {
    onProgress?.({ current: 0, total: 100, message: "Iniciando leitura do PDF..." });

    const result = await extractSentencesFromPdf(file, (page, total) => {
      const pct = Math.round((page / total) * 100);
      onProgress?.({
        current: pct,
        total: 100,
        message: `Extraindo página ${page} de ${total}...`,
      });
    });

    const builder = new ParsedDocumentBuilder()
      .setOriginalFileName(file.name)
      .setTitle(file.name.replace(/\.pdf$/i, ""))
      .setFormat("pdf")
      .setSizeBytes(file.size)
      .setPageCount(result.pageCount)
      .setRawBlob(file);

    for (const s of result.sentences) {
      builder.addSentence(s.text, s.page);
    }

    return builder.build();
  }
}
