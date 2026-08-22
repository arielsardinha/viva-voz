/**
 * Adapter para extração e processamento de texto em imagens via OCR (.png, .jpg, .jpeg, .webp).
 * Padrão: GoF Adapter Pattern & Strategy Consumer.
 */
import { ParsedDocumentBuilder } from "@/lib/domain/document-builder";
import type { DocumentFormat, OnParseProgress, ParsedDocument } from "@/lib/domain/document.types";
import { ImagePreprocessorService } from "@/lib/ocr/image-preprocessor.service";
import type { IOcrEngineStrategy } from "@/lib/ocr/ocr-strategy.interface";
import { GeminiVisionOcrStrategy } from "@/lib/ocr/gemini-vision-ocr.strategy";
import { splitIntoSentences } from "@/lib/pdf-text";
import type { IDocumentParserAdapter } from "./adapter.interface";

export interface OcrAdapterOptions {
  preprocessor?: ImagePreprocessorService;
  defaultStrategy?: IOcrEngineStrategy;
}

export class OcrDocumentAdapter implements IDocumentParserAdapter {
  public readonly supportedFormats: DocumentFormat[] = ["ocr"];
  private readonly preprocessor: ImagePreprocessorService;
  private readonly defaultStrategy?: IOcrEngineStrategy;

  public constructor(options: OcrAdapterOptions = {}) {
    this.preprocessor = options.preprocessor || new ImagePreprocessorService();
    this.defaultStrategy = options.defaultStrategy;
  }

  public canHandle(file: File): boolean {
    const isImageMime = file.type.startsWith("image/");
    const hasImageExt = /\.(png|jpe?g|webp)$/i.test(file.name);
    return isImageMime || hasImageExt;
  }

  private resolveStrategy(): IOcrEngineStrategy {
    if (this.defaultStrategy) {
      return this.defaultStrategy;
    }
    return new GeminiVisionOcrStrategy();
  }

  public async parse(file: File, onProgress?: OnParseProgress): Promise<ParsedDocument> {
    onProgress?.({ current: 10, total: 100, message: "Pré-processando imagem no Canvas..." });

    const processedBlob = await this.preprocessor.preprocessBlob(file, {
      maxDimension: 2000,
      autoThreshold: true,
    });

    onProgress?.({ current: 30, total: 100, message: "Executando reconhecimento de caracteres (OCR com IA)..." });

    const strategy = this.resolveStrategy();
    let text = "";

    try {
      text = await strategy.recognize(processedBlob, (pct, status) => {
        onProgress?.({
          current: Math.round(30 + pct * 0.6),
          total: 100,
          message: status,
        });
      });
    } catch (err: unknown) {
      const originalMessage = err instanceof Error ? err.message : String(err);
      if (
        originalMessage.includes("Chave") ||
        originalMessage.includes("API") ||
        originalMessage.includes("401") ||
        originalMessage.includes("não encontrada")
      ) {
        throw new Error(
          "Para ler fotos e imagens com visão computacional (OCR), conecte sua chave da API Gemini (Google AI Studio) no topo da tela."
        );
      }
      throw new Error(`Falha no reconhecimento da imagem: ${originalMessage}`);
    }

    onProgress?.({ current: 95, total: 100, message: "Segmentando sentenças e estruturando documento..." });

    const sentences = splitIntoSentences(text);
    if (sentences.length === 0) {
      throw new Error(
        "Nenhum texto legível foi identificado na imagem. Verifique a nitidez da foto ou certifique-se de que sua chave Gemini está ativa."
      );
    }

    const cleanTitle = file.name.replace(/\.(png|jpe?g|webp)$/i, "");
    const builder = new ParsedDocumentBuilder()
      .setOriginalFileName(file.name)
      .setTitle(cleanTitle)
      .setFormat("ocr")
      .setSizeBytes(file.size)
      .setPageCount(1)
      .setRawBlob(file);

    for (const s of sentences) {
      builder.addSentence(s, 1);
    }

    onProgress?.({ current: 100, total: 100, message: "Documento OCR pronto para leitura!" });
    return builder.build();
  }
}
