import { ImagePreprocessorService } from "./image-preprocessor.service";

describe("ImagePreprocessorService (Tier 3 — Canvas Preprocessing)", () => {
  let service: ImagePreprocessorService;

  beforeEach(() => {
    service = new ImagePreprocessorService();
  });

  describe("scaleDimensions", () => {
    it("não deve alterar dimensões menores que o limite máximo", () => {
      const { width, height } = service.scaleDimensions(800, 600, 2000);
      expect(width).toBe(800);
      expect(height).toBe(600);
    });

    it("deve redimensionar proporcionalmente quando a largura excede o limite máximo", () => {
      const { width, height } = service.scaleDimensions(4000, 2000, 2000);
      expect(width).toBe(2000);
      expect(height).toBe(1000);
    });

    it("deve redimensionar proporcionalmente quando a altura excede o limite máximo", () => {
      const { width, height } = service.scaleDimensions(1500, 3000, 1500);
      expect(width).toBe(750);
      expect(height).toBe(1500);
    });
  });

  describe("toGrayscale", () => {
    it("deve converter pixels coloridos RGBA em luminância monocromática", () => {
      const data = new Uint8ClampedArray([
        255, 0, 0, 255, // Pixel 1: Vermelho
        255, 255, 255, 255, // Pixel 2: Branco
      ]);
      const fakeImageData = {
        data,
        width: 2,
        height: 1,
        colorSpace: "srgb" as PredefinedColorSpace,
      };

      const result = service.toGrayscale(fakeImageData as ImageData);
      expect(result.data[0]).toBe(result.data[1]);
      expect(result.data[1]).toBe(result.data[2]);
      expect(result.data[3]).toBe(255);

      expect(result.data[4]).toBe(255);
      expect(result.data[5]).toBe(255);
      expect(result.data[6]).toBe(255);
      expect(result.data[7]).toBe(255);
    });
  });

  describe("calculateOtsuThreshold & applyThreshold", () => {
    it("deve calcular threshold adequado para imagem bimodal", () => {
      const data = new Uint8ClampedArray([
        30, 30, 30, 255,
        30, 30, 30, 255,
        220, 220, 220, 255,
        220, 220, 220, 255,
      ]);
      const fakeImageData = {
        data,
        width: 2,
        height: 2,
        colorSpace: "srgb" as PredefinedColorSpace,
      };

      const threshold = service.calculateOtsuThreshold(fakeImageData as ImageData);
      expect(threshold).toBeGreaterThanOrEqual(30);
      expect(threshold).toBeLessThanOrEqual(220);
    });

    it("deve binarizar pixels em 0 (preto) ou 255 (branco)", () => {
      const data = new Uint8ClampedArray([
        50, 50, 50, 255,
        200, 200, 200, 255,
      ]);
      const fakeImageData = {
        data,
        width: 2,
        height: 1,
        colorSpace: "srgb" as PredefinedColorSpace,
      };

      const result = service.applyThreshold(fakeImageData as ImageData, 128);
      expect(result.data[0]).toBe(0);
      expect(result.data[1]).toBe(0);
      expect(result.data[2]).toBe(0);
      expect(result.data[3]).toBe(255);

      expect(result.data[4]).toBe(255);
      expect(result.data[5]).toBe(255);
      expect(result.data[6]).toBe(255);
      expect(result.data[7]).toBe(255);
    });
  });

  describe("preprocessBlob", () => {
    it("deve retornar um blob ou imagem pré-processada", async () => {
      const mockBlob = new Blob(["fake image bytes"], { type: "image/png" });
      const result = await service.preprocessBlob(mockBlob);
      expect(result).toBeInstanceOf(Blob);
    });
  });
});
