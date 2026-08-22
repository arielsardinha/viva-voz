/**
 * Serviço detector de PDFs digitalizados (escaneados) e renderizador de páginas PDF para OCR.
 * Padrão: Service / Single Responsibility.
 */
import type { ExtractionResult } from "@/lib/pdf-text";
import { readFileAsArrayBuffer } from "@/lib/parsers/file-reader.util";

export class ScannedPdfDetectorService {
  public static readonly DEFAULT_SCANNED_THRESHOLD_CHARS_PER_PAGE = 50;

  /**
   * Calcula a média de caracteres por página a partir do resultado de extração nativa.
   */
  public calculateTextDensity(result: ExtractionResult): number {
    const pageCount = Math.max(1, result.pageCount);
    const totalChars = result.sentences.reduce((acc, s) => acc + s.text.length, 0);
    return Math.round(totalChars / pageCount);
  }

  /**
   * Identifica se um PDF é escaneado/digitalizado (pouco ou nenhum texto selecionável).
   */
  public isScannedPdf(
    result: ExtractionResult,
    thresholdCharsPerPage: number = ScannedPdfDetectorService.DEFAULT_SCANNED_THRESHOLD_CHARS_PER_PAGE
  ): boolean {
    if (!result.sentences || result.sentences.length === 0) {
      return true;
    }
    const density = this.calculateTextDensity(result);
    return density < thresholdCharsPerPage;
  }

  /**
   * Renderiza páginas de um PDF em Blobs de imagem para que sejam processadas por motores de OCR.
   */
  public async renderPdfPagesToBlobs(
    file: File | Blob,
    onProgress?: (page: number, total: number) => void,
    scale: number = 2.0
  ): Promise<Blob[]> {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return [];
    }

    try {
      const pdfjs = await import("pdfjs-dist");
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
      }

      const data = await readFileAsArrayBuffer(file);
      const doc = await pdfjs.getDocument({ data }).promise;
      const blobs: Blob[] = [];

      for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
        const page = await doc.getPage(pageNumber);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          // @ts-expect-error - RenderParameters de pdfjs
          await page.render({ canvasContext: ctx, viewport }).promise;

          const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((b) => resolve(b || new Blob()), "image/png");
          });
          blobs.push(blob);
        }

        onProgress?.(pageNumber, doc.numPages);
      }

      return blobs;
    } catch {
      return [];
    }
  }
}
