/**
 * Adapter para extração e processamento de documentos Microsoft Word (.docx).
 * Padrão: GoF Adapter Pattern.
 */
import mammoth from "mammoth";
import { ParsedDocumentBuilder } from "@/lib/domain/document-builder";
import type { DocumentFormat, OnParseProgress, ParsedDocument } from "@/lib/domain/document.types";
import type { IDocumentParserAdapter } from "./adapter.interface";
import { readFileAsArrayBuffer } from "./file-reader.util";

export class DocxDocumentAdapter implements IDocumentParserAdapter {
  public readonly supportedFormats: DocumentFormat[] = ["docx"];

  public canHandle(file: File): boolean {
    const isDocxMime =
      file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const hasDocxExt = file.name.toLowerCase().endsWith(".docx");
    return isDocxMime || hasDocxExt;
  }

  public async parse(file: File, onProgress?: OnParseProgress): Promise<ParsedDocument> {
    onProgress?.({ current: 0, total: 100, message: "Lendo documento Word (.docx)..." });

    const arrayBuffer = await readFileAsArrayBuffer(file);

    onProgress?.({ current: 40, total: 100, message: "Extraindo texto dos parágrafos..." });

    const result = await mammoth.extractRawText({ arrayBuffer });
    const rawText = result.value || "";

    onProgress?.({ current: 80, total: 100, message: "Segmentando sentenças..." });

    const builder = new ParsedDocumentBuilder()
      .setOriginalFileName(file.name)
      .setTitle(file.name.replace(/\.docx$/i, ""))
      .setFormat("docx")
      .setSizeBytes(file.size)
      .setRawBlob(file)
      .addRawText(rawText);

    onProgress?.({ current: 100, total: 100, message: "Concluído" });
    return builder.build();
  }
}
