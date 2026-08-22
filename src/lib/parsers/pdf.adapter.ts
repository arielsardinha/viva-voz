/**
 * Adapter para extração e processamento de documentos PDF (.pdf).
 * Inclui detecção e fallback automático para OCR em PDFs digitalizados (escaneados).
 * Padrão: GoF Adapter Pattern.
 */
import { ParsedDocumentBuilder } from "@/lib/domain/document-builder";
import type { DocumentFormat, OnParseProgress, ParsedDocument } from "@/lib/domain/document.types";
import { ScannedPdfDetectorService } from "@/lib/ocr/scanned-pdf-detector.service";
import type { IOcrEngineStrategy } from "@/lib/ocr/ocr-strategy.interface";
import { GeminiVisionOcrStrategy } from "@/lib/ocr/gemini-vision-ocr.strategy";
import { TesseractOcrStrategy } from "@/lib/ocr/tesseract-ocr.strategy";
import { extractSentencesFromPdf, splitIntoSentences } from "@/lib/pdf-text";
import type { IDocumentParserAdapter } from "./adapter.interface";

export interface PdfAdapterOptions {
  scannedDetector?: ScannedPdfDetectorService;
  ocrStrategy?: IOcrEngineStrategy;
}

export class PdfDocumentAdapter implements IDocumentParserAdapter {
  public readonly supportedFormats: DocumentFormat[] = ["pdf"];
  private readonly scannedDetector: ScannedPdfDetectorService;
  private readonly ocrStrategy?: IOcrEngineStrategy;

  public constructor(options: PdfAdapterOptions = {}) {
    this.scannedDetector = options.scannedDetector || new ScannedPdfDetectorService();
    this.ocrStrategy = options.ocrStrategy;
  }

  public canHandle(file: File): boolean {
    const isPdfMime = file.type === "application/pdf" || file.type.includes("pdf");
    const hasPdfExt = file.name.toLowerCase().endsWith(".pdf");
    return isPdfMime || hasPdfExt;
  }

  private resolveOcrStrategy(): IOcrEngineStrategy {
    if (this.ocrStrategy) return this.ocrStrategy;
    return new GeminiVisionOcrStrategy();
  }

  public async parse(file: File, onProgress?: OnParseProgress): Promise<ParsedDocument> {
    onProgress?.({ current: 0, total: 100, message: "Iniciando leitura do PDF..." });

    const result = await extractSentencesFromPdf(file, (page, total) => {
      const pct = Math.round((page / total) * 30);
      onProgress?.({
        current: pct,
        total: 100,
        message: `Extraindo página ${page} de ${total}...`,
      });
    });

    const isScanned = this.scannedDetector.isScannedPdf(result);

    const builder = new ParsedDocumentBuilder()
      .setOriginalFileName(file.name)
      .setTitle(file.name.replace(/\.pdf$/i, ""))
      .setFormat("pdf")
      .setSizeBytes(file.size)
      .setPageCount(result.pageCount)
      .setRawBlob(file);

    let ocrApplied = false;

    if (isScanned) {
      onProgress?.({
        current: 35,
        total: 100,
        message: "PDF escaneado detectado. Renderizando páginas para OCR...",
      });

      const pageBlobs = await this.scannedDetector.renderPdfPagesToBlobs(file, (page, total) => {
        const pct = 35 + Math.round((page / total) * 20);
        onProgress?.({
          current: pct,
          total: 100,
          message: `Renderizando página ${page} de ${total} para OCR...`,
        });
      });

      if (pageBlobs.length > 0) {
        const ocrEngine = this.resolveOcrStrategy();
        const totalBlobs = pageBlobs.length;

        for (let i = 0; i < totalBlobs; i++) {
          const blob = pageBlobs[i];
          const pageNumber = i + 1;
          const startPct = 55 + Math.round((i / totalBlobs) * 40);

          onProgress?.({
            current: startPct,
            total: 100,
            message: `Executando OCR na página ${pageNumber} de ${totalBlobs}...`,
          });

          let pageText = "";
          try {
            pageText = await ocrEngine.recognize(blob);
          } catch {
            const fallback = new TesseractOcrStrategy();
            pageText = await fallback.recognize(blob);
          }

          const sentences = splitIntoSentences(pageText);
          for (const s of sentences) {
            builder.addSentence(s, pageNumber);
          }
        }
        ocrApplied = true;
      }
    }

    if (!ocrApplied) {
      for (const s of result.sentences) {
        builder.addSentence(s.text, s.page);
      }
    }

    onProgress?.({ current: 100, total: 100, message: "PDF pronto para leitura!" });
    return builder.build();
  }
}
