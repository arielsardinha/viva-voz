/**
 * Interface unificada para estratégias intercambiáveis de motor OCR (GoF Strategy Pattern).
 * Permite alternar dinamicamente entre Tesseract (Local/Worker) e Gemini Vision (Cloud IA).
 */

export type OcrEngineType = "tesseract" | "gemini-vision";

export type OcrProgressCallback = (progressPercent: number, statusMessage: string) => void;

export interface IOcrEngineStrategy {
  readonly engineType: OcrEngineType;

  /**
   * Verifica se a estratégia está pronta e disponível para uso.
   */
  isAvailable(): Promise<boolean>;

  /**
   * Executa o reconhecimento óptico de caracteres no Blob de imagem fornecido.
   */
  recognize(imageBlob: Blob, onProgress?: OcrProgressCallback): Promise<string>;
}
