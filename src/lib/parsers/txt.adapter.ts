/**
 * Adapter para extração e processamento de arquivos de texto puro (.txt).
 * Padrão: GoF Adapter Pattern.
 */
import { ParsedDocumentBuilder } from "@/lib/domain/document-builder";
import type { DocumentFormat, OnParseProgress, ParsedDocument } from "@/lib/domain/document.types";
import type { IDocumentParserAdapter } from "./adapter.interface";
import { readFileAsText } from "./file-reader.util";

export class TxtDocumentAdapter implements IDocumentParserAdapter {
  public readonly supportedFormats: DocumentFormat[] = ["txt"];

  public canHandle(file: File): boolean {
    const isTxtMime = file.type === "text/plain";
    const hasTxtExt = file.name.toLowerCase().endsWith(".txt");
    return isTxtMime || hasTxtExt;
  }

  public async parse(file: File, onProgress?: OnParseProgress): Promise<ParsedDocument> {
    onProgress?.({ current: 0, total: 100, message: "Lendo arquivo de texto..." });

    const rawText = await readFileAsText(file);

    onProgress?.({ current: 50, total: 100, message: "Segmentando sentenças..." });

    const builder = new ParsedDocumentBuilder()
      .setOriginalFileName(file.name)
      .setTitle(file.name.replace(/\.txt$/i, ""))
      .setFormat("txt")
      .setSizeBytes(file.size)
      .setRawBlob(file)
      .addRawText(rawText);

    const doc = builder.build();
    onProgress?.({ current: 100, total: 100, message: "Concluído" });
    return doc;
  }
}
