import { OcrProgressCallback } from "./ocr-strategy.interface";
import { TesseractOcrStrategy } from "./tesseract-ocr.strategy";
import { GeminiVisionOcrStrategy } from "./gemini-vision-ocr.strategy";

describe("OCR Strategies (GoF Strategy Pattern - Tier 3)", () => {
  describe("TesseractOcrStrategy", () => {
    it("deve declarar engineType 'tesseract' e estar disponível", async () => {
      const strategy = new TesseractOcrStrategy();
      expect(strategy.engineType).toBe("tesseract");
      const available = await strategy.isAvailable();
      expect(typeof available).toBe("boolean");
    });

    it("deve emitir callbacks de progresso e retornar texto reconhecido", async () => {
      const strategy = new TesseractOcrStrategy({
        // Injeção de mock worker para testes determinísticos
        customRecognizer: async (_blob: Blob, onProgress?: OcrProgressCallback) => {
          onProgress?.(50, "Processando imagem no worker local...");
          onProgress?.(100, "Concluído");
          return "Texto extraído localmente pelo Tesseract.";
        },
      });

      const progressSpy = jest.fn();
      const mockBlob = new Blob(["image data"], { type: "image/png" });

      const text = await strategy.recognize(mockBlob, progressSpy);
      expect(text).toBe("Texto extraído localmente pelo Tesseract.");
      expect(progressSpy).toHaveBeenCalledWith(50, "Processando imagem no worker local...");
      expect(progressSpy).toHaveBeenCalledWith(100, "Concluído");
    });
  });

  describe("GeminiVisionOcrStrategy", () => {
    it("deve declarar engineType 'gemini-vision'", () => {
      const strategy = new GeminiVisionOcrStrategy();
      expect(strategy.engineType).toBe("gemini-vision");
    });

    it("deve chamar a rota /api/ocr/gemini e retornar o texto extraído", async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ text: "Texto reconhecido via Gemini 2.0 Flash." }),
      });

      const strategy = new GeminiVisionOcrStrategy({ fetchFn: mockFetch as unknown as typeof fetch });
      const progressSpy = jest.fn();
      const mockBlob = new Blob(["image-bytes"], { type: "image/jpeg" });

      const result = await strategy.recognize(mockBlob, progressSpy);
      expect(result).toBe("Texto reconhecido via Gemini 2.0 Flash.");
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(progressSpy).toHaveBeenCalled();
    });

    it("deve lançar erro descritivo caso a API retorne falha", async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: "Chave Gemini não configurada." }),
      });

      const strategy = new GeminiVisionOcrStrategy({ fetchFn: mockFetch as unknown as typeof fetch });
      const mockBlob = new Blob(["image-bytes"], { type: "image/jpeg" });

      await expect(strategy.recognize(mockBlob)).rejects.toThrow("Chave Gemini não configurada.");
    });
  });
});
