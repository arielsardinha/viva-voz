/**
 * Estratégia de OCR em Nuvem utilizando Gemini Vision (Google AI Studio / BYOK).
 * Padrão: GoF Behavioral Pattern — Strategy.
 */
import { readFileAsArrayBuffer } from "@/lib/parsers/file-reader.util";
import type { IOcrEngineStrategy, OcrEngineType, OcrProgressCallback } from "./ocr-strategy.interface";

export interface GeminiVisionStrategyOptions {
  apiKey?: string;
  fetchFn?: typeof fetch;
}

export class GeminiVisionOcrStrategy implements IOcrEngineStrategy {
  public readonly engineType: OcrEngineType = "gemini-vision";
  private readonly apiKey?: string;
  private readonly fetchFn: typeof fetch;

  public constructor(options: GeminiVisionStrategyOptions = {}) {
    this.apiKey = options.apiKey;
    this.fetchFn = options.fetchFn || (typeof window !== "undefined" ? window.fetch.bind(window) : fetch);
  }

  public async isAvailable(): Promise<boolean> {
    return true;
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    const arrayBuffer = await readFileAsArrayBuffer(blob);
    if (typeof Buffer !== "undefined") {
      return Buffer.from(arrayBuffer).toString("base64");
    }

    let binary = "";
    const bytes = new Uint8Array(arrayBuffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  public async recognize(imageBlob: Blob, onProgress?: OcrProgressCallback): Promise<string> {
    onProgress?.(15, "Preparando imagem para análise por visão computacional...");

    const base64Data = await this.blobToBase64(imageBlob);

    onProgress?.(40, "Enviando para Gemini Vision...");

    const response = await this.fetchFn("/api/ocr/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageBase64: base64Data,
        mimeType: imageBlob.type || "image/png",
        userApiKey: this.apiKey,
      }),
    });

    if (!response.ok) {
      let errorMessage = "Falha ao processar OCR com Gemini Vision.";
      try {
        const errorData = await response.json();
        if (errorData?.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // Ignora erro de parse
      }
      throw new Error(errorMessage);
    }

    onProgress?.(80, "Formatando texto e preservando parágrafos...");
    const data = await response.json();
    onProgress?.(100, "Reconhecimento Gemini Vision concluído com sucesso!");

    return data.text || "";
  }
}
