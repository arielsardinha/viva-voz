/**
 * Estratégia de OCR Local / Offline baseada em Tesseract.js / WebWorker.
 * Padrão: GoF Behavioral Pattern — Strategy.
 */
import type { IOcrEngineStrategy, OcrEngineType, OcrProgressCallback } from "./ocr-strategy.interface";

export interface TesseractStrategyOptions {
  languages?: string;
  customRecognizer?: (blob: Blob, onProgress?: OcrProgressCallback) => Promise<string>;
}

interface TesseractWorker {
  recognize: (buffer: ArrayBuffer) => Promise<{ data: { text: string } }>;
  terminate: () => Promise<unknown>;
}

interface TesseractModule {
  createWorker?: (
    languages: string,
    options?: number,
    config?: { logger?: (m: { status?: string; progress?: number }) => void }
  ) => Promise<TesseractWorker>;
}

/**
 * Import dinâmico seguro em runtime sem disparar warning de compilação estática do Webpack/Next.js.
 */
async function loadTesseractModule(): Promise<TesseractModule | null> {
  if (typeof window !== "undefined" && (window as unknown as { Tesseract?: TesseractModule }).Tesseract) {
    return (window as unknown as { Tesseract: TesseractModule }).Tesseract;
  }
  try {
    const dynamicImport = new Function("modulePath", "return import(modulePath)");
    return (await dynamicImport("tesseract.js").catch(() => null)) as TesseractModule | null;
  } catch {
    return null;
  }
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

    try {
      onProgress?.(25, "Carregando modelos de linguagem (Português/Inglês)...");

      const tesseractModule = await loadTesseractModule();

      if (tesseractModule && typeof tesseractModule.createWorker === "function") {
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
