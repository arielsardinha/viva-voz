import { ScannedPdfDetectorService } from "./scanned-pdf-detector.service";
import type { ExtractionResult } from "@/lib/pdf-text";

describe("ScannedPdfDetectorService (Tier 3 — Scanned PDF Detection & Page Renderer)", () => {
  let service: ScannedPdfDetectorService;

  beforeEach(() => {
    service = new ScannedPdfDetectorService();
  });

  describe("isScannedPdf", () => {
    it("deve classificar como PDF escaneado quando não há sentenças extraídas", () => {
      const result: ExtractionResult = {
        sentences: [],
        pageCount: 3,
      };

      expect(service.isScannedPdf(result)).toBe(true);
    });

    it("deve classificar como PDF escaneado quando a média de caracteres por página é inferior ao limiar (50 chars/página)", () => {
      const result: ExtractionResult = {
        sentences: [
          { index: 0, page: 1, text: "Page 1" }, // 6 chars
          { index: 1, page: 2, text: "Scan" },   // 4 chars
          { index: 2, page: 3, text: "Doc" },    // 3 chars
        ],
        pageCount: 3,
      };

      // Média: 13 chars / 3 páginas ≈ 4.33 < 50
      expect(service.isScannedPdf(result, 50)).toBe(true);
    });

    it("não deve classificar como PDF escaneado quando o PDF contém texto digital suficiente", () => {
      const result: ExtractionResult = {
        sentences: [
          {
            index: 0,
            page: 1,
            text: "Este é um documento digital completo com múltiplos parágrafos e frases ricas em conteúdo e metadados.",
          },
          {
            index: 1,
            page: 1,
            text: "Segunda frase explicativa com texto suficiente para análise semântica e leitura de alta fidelidade.",
          },
        ],
        pageCount: 1,
      };

      // > 200 chars em 1 página
      expect(service.isScannedPdf(result, 50)).toBe(false);
    });
  });

  describe("calculateTextDensity", () => {
    it("deve calcular a densidade média de caracteres por página", () => {
      const result: ExtractionResult = {
        sentences: [
          { index: 0, page: 1, text: "1234567890" }, // 10
          { index: 1, page: 2, text: "1234567890" }, // 10
        ],
        pageCount: 2,
      };

      expect(service.calculateTextDensity(result)).toBe(10);
    });
  });
});
