import { PdfDocumentAdapter } from "./pdf.adapter";
import { ScannedPdfDetectorService } from "@/lib/ocr/scanned-pdf-detector.service";
import { IOcrEngineStrategy } from "@/lib/ocr/ocr-strategy.interface";
import * as pdfTextModule from "@/lib/pdf-text";

jest.mock("@/lib/pdf-text", () => {
  const actual = jest.requireActual("@/lib/pdf-text");
  return {
    ...actual,
    extractSentencesFromPdf: jest.fn(),
  };
});

describe("PdfDocumentAdapter with OCR Fallback (Tier 3)", () => {
  it("deve processar PDF digital normal sem acionar OCR", async () => {
    (pdfTextModule.extractSentencesFromPdf as jest.Mock).mockResolvedValue({
      pageCount: 1,
      sentences: [
        {
          index: 0,
          page: 1,
          text: "Este é um texto longo e digital extraído perfeitamente do arquivo PDF sem necessidade de OCR.",
        },
      ],
    });

    const mockOcrStrategy: IOcrEngineStrategy = {
      engineType: "gemini-vision",
      isAvailable: async () => true,
      recognize: jest.fn(),
    };

    const adapter = new PdfDocumentAdapter({ ocrStrategy: mockOcrStrategy });
    const file = new File(["fake pdf content"], "digital.pdf", { type: "application/pdf" });

    const parsed = await adapter.parse(file);
    expect(parsed.sentences.length).toBe(1);
    expect(parsed.sentences[0].text).toContain("Este é um texto longo");
    expect(mockOcrStrategy.recognize).not.toHaveBeenCalled();
  });

  it("deve detectar PDF escaneado e acionar OCR para cada página renderizada", async () => {
    // Retorna 0 sentenças para simular PDF escaneado
    (pdfTextModule.extractSentencesFromPdf as jest.Mock).mockResolvedValue({
      pageCount: 2,
      sentences: [],
    });

    const mockDetector = new ScannedPdfDetectorService();
    jest.spyOn(mockDetector, "renderPdfPagesToBlobs").mockResolvedValue([
      new Blob(["page 1 img"], { type: "image/png" }),
      new Blob(["page 2 img"], { type: "image/png" }),
    ]);

    const mockOcrStrategy: IOcrEngineStrategy = {
      engineType: "gemini-vision",
      isAvailable: async () => true,
      recognize: jest
        .fn()
        .mockResolvedValueOnce("Texto reconhecido da página 1 escaneada.")
        .mockResolvedValueOnce("Texto reconhecido da página 2 escaneada."),
    };

    const adapter = new PdfDocumentAdapter({
      scannedDetector: mockDetector,
      ocrStrategy: mockOcrStrategy,
    });

    const file = new File(["fake scanned pdf content"], "escaneado.pdf", {
      type: "application/pdf",
    });

    const progressMessages: string[] = [];
    const parsed = await adapter.parse(file, (p) => {
      if (p.message) progressMessages.push(p.message);
    });

    expect(parsed.metadata.format).toBe("pdf");
    expect(parsed.sentences.length).toBe(2);
    expect(parsed.sentences[0].text).toBe("Texto reconhecido da página 1 escaneada.");
    expect(parsed.sentences[0].page).toBe(1);
    expect(parsed.sentences[1].text).toBe("Texto reconhecido da página 2 escaneada.");
    expect(parsed.sentences[1].page).toBe(2);
    expect(mockOcrStrategy.recognize).toHaveBeenCalledTimes(2);
    expect(progressMessages.some((m) => m.includes("PDF escaneado detectado"))).toBe(true);
  });
});
