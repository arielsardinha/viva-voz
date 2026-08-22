import { OcrDocumentAdapter } from "./ocr.adapter";
import { IOcrEngineStrategy } from "@/lib/ocr/ocr-strategy.interface";

describe("OcrDocumentAdapter (Tier 3 — GoF Adapter Pattern)", () => {
  it("deve reconhecer imagens nos formatos PNG, JPG, JPEG e WEBP", () => {
    const adapter = new OcrDocumentAdapter();

    const pngFile = new File(["fake png"], "foto.png", { type: "image/png" });
    const jpgFile = new File(["fake jpg"], "documento.jpg", { type: "image/jpeg" });
    const jpegFile = new File(["fake jpeg"], "pagina.jpeg", { type: "image/jpeg" });
    const webpFile = new File(["fake webp"], "print.webp", { type: "image/webp" });
    const pdfFile = new File(["fake pdf"], "livro.pdf", { type: "application/pdf" });

    expect(adapter.canHandle(pngFile)).toBe(true);
    expect(adapter.canHandle(jpgFile)).toBe(true);
    expect(adapter.canHandle(jpegFile)).toBe(true);
    expect(adapter.canHandle(webpFile)).toBe(true);
    expect(adapter.canHandle(pdfFile)).toBe(false);
  });

  it("deve processar a imagem, executar o OCR e retornar um ParsedDocument estruturado", async () => {
    const mockStrategy: IOcrEngineStrategy = {
      engineType: "gemini-vision",
      isAvailable: async () => true,
      recognize: jest.fn().mockResolvedValue(
        "Primeiro parágrafo reconhecido da foto. Segundo parágrafo com detalhes adicionais."
      ),
    };

    const adapter = new OcrDocumentAdapter({ defaultStrategy: mockStrategy });
    const file = new File(["fake-image-bytes"], "capitulo-foto.png", { type: "image/png" });

    const progressSpy = jest.fn();
    const parsed = await adapter.parse(file, progressSpy);

    expect(parsed.metadata.title).toBe("capitulo-foto");
    expect(parsed.metadata.format).toBe("ocr");
    expect(parsed.metadata.originalFileName).toBe("capitulo-foto.png");
    expect(parsed.sentences.length).toBe(2);
    expect(parsed.sentences[0].text).toBe("Primeiro parágrafo reconhecido da foto.");
    expect(parsed.sentences[1].text).toBe("Segundo parágrafo com detalhes adicionais.");
    expect(mockStrategy.recognize).toHaveBeenCalled();
  });

  it("deve lançar erro amigável caso a chave da API Gemini não esteja configurada", async () => {
    const failingStrategy: IOcrEngineStrategy = {
      engineType: "gemini-vision",
      isAvailable: async () => true,
      recognize: jest.fn().mockRejectedValue(new Error("Chave da API Gemini não encontrada.")),
    };

    const adapter = new OcrDocumentAdapter({ defaultStrategy: failingStrategy });
    const file = new File(["fake-image-bytes"], "livro.png", { type: "image/png" });

    await expect(adapter.parse(file)).rejects.toThrow(
      "Para ler fotos e imagens com visão computacional (OCR), conecte sua chave da API Gemini (Google AI Studio) no topo da tela."
    );
  });
});
