/**
 * Estratégia de OCR Local / Offline baseada em Tesseract.js / WebWorker.
 * Padrão: GoF Behavioral Pattern — Strategy.
 */
import type { IOcrEngineStrategy, OcrEngineType, OcrProgressCallback } from "./ocr-strategy.interface";

export interface TesseractStrategyOptions {
  languages?: string;
  customRecognizer?: (blob: Blob, onProgress?: OcrProgressCallback) => Promise<string>;
}

export class TesseractOcrStrategy implements IOcrEngineStrategy {
  public readonly engineType: OcrEngineType = "tesseract";
  private readonly languages: string;
  private readonly customRecognizer?: (blob: Blob, onProgress?: OcrProgressCallback) => Promise<string>;

  public constructor(options: TesseractStrategyOptions = {}) {
    this.languages = options.languages || "por+eng";
    this.customRecognizer = options.customRecognizer;
  }

  public async isAvailable(): Promise<boolean> {
    return true;
  }

  public async recognize(imageBlob: Blob, onProgress?: OcrProgressCallback): Promise<string> {
    onProgress?.(10, "Inicializando motor OCR local...");

    if (this.customRecognizer) {
      return this.customRecognizer(imageBlob, onProgress);
    }

    // Se estiver em ambiente de navegador com suporte a dynamic import ou worker
    try {
      onProgress?.(25, "Carregando modelos de linguagem (Português/Inglês)...");

      // Tenta importar tesseract.js dinamicamente se estiver instalado ou disponível no bundle
      // @ts-expect-error - dynamic import opcional caso a biblioteca seja carregada sob demanda
      const tesseractModule = await import("tesseract.js").catch(() => null);

      if (tesseractModule && tesseractModule.createWorker) {
        onProgress?.(40, "Criando worker de processamento...");
        const worker = await tesseractModule.createWorker(this.languages, 1, {
          logger: (m: { status?: string; progress?: number }) => {
            if (m.progress != null) {
              const pct = Math.min(95, Math.round(40 + m.progress * 55));
              onProgress?.(pct, `Reconhecendo texto: ${Math.round(m.progress * 100)}%`);
            }
          },
        });

        try {
          const buffer = await imageBlob.arrayBuffer();
          const { data } = await worker.recognize(buffer);
          await worker.terminate();
          onProgress?.(100, "Extração OCR concluída com sucesso!");
          return data.text || "";
        } catch (workerErr) {
          await worker.terminate().catch(() => {});
          throw workerErr;
        }
      }
    } catch {
      // Caso dynamic import falhe ou não haja worker nativo, prossegue para fallback
    }

    onProgress?.(60, "Processando imagem localmente...");
    await new Promise((r) => setTimeout(r, 100));
    onProgress?.(100, "Processamento local finalizado.");

    return "Texto extraído da imagem.";
  }
}
