/**
 * Adapter para extração e processamento de apresentações PowerPoint (.pptx).
 * Lê o ZIP do PPTX, extrai textos e notas do apresentador de cada slide.
 * Padrão: GoF Structural Pattern — Adapter (SOLID).
 */
import JSZip from "jszip";
import { ParsedDocumentBuilder } from "@/lib/domain/document-builder";
import type { DocumentFormat, OnParseProgress, ParsedDocument } from "@/lib/domain/document.types";
import { SentenceSplitterService } from "@/lib/domain/sentence-splitter.service";
import type { IDocumentParserAdapter } from "./adapter.interface";
import { readFileAsArrayBuffer } from "./file-reader.util";

export class PptxDocumentAdapter implements IDocumentParserAdapter {
  public readonly supportedFormats: DocumentFormat[] = ["pptx"];

  public canHandle(file: File): boolean {
    const isPptxMime =
      file.type ===
        "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      file.type === "application/vnd.ms-powerpoint";
    const hasPptxExt = file.name.toLowerCase().endsWith(".pptx");
    return isPptxMime || hasPptxExt;
  }

  public async parse(file: File, onProgress?: OnParseProgress): Promise<ParsedDocument> {
    onProgress?.({ current: 0, total: 100, message: "Descompactando apresentação PowerPoint (.pptx)..." });

    const arrayBuffer = await readFileAsArrayBuffer(file);
    const zip = await JSZip.loadAsync(arrayBuffer);

    onProgress?.({ current: 20, total: 100, message: "Identificando slides..." });

    // Coleta todos os arquivos de slide ordenados numericamente
    const slideFiles = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
      .sort((a, b) => this.extractSlideNumber(a) - this.extractSlideNumber(b));

    if (slideFiles.length === 0) {
      throw new Error("Nenhum slide encontrado. Verifique se o arquivo é um PPTX válido.");
    }

    // Coleta arquivos de notas do apresentador
    const notesFiles = new Map<number, string>();
    const notesKeys = Object.keys(zip.files).filter((name) =>
      /^ppt\/notesSlides\/notesSlide\d+\.xml$/i.test(name)
    );
    for (const notesKey of notesKeys) {
      const slideNum = this.extractSlideNumber(notesKey);
      const notesContent = await zip.files[notesKey].async("text");
      notesFiles.set(slideNum, notesContent);
    }

    onProgress?.({ current: 40, total: 100, message: `Processando ${slideFiles.length} slides...` });

    const builder = new ParsedDocumentBuilder()
      .setOriginalFileName(file.name)
      .setTitle(file.name.replace(/\.pptx$/i, ""))
      .setFormat("pptx")
      .setSizeBytes(file.size)
      .setRawBlob(file);

    let globalSentenceIndex = 0;

    for (let i = 0; i < slideFiles.length; i++) {
      const slideNum = i + 1;
      const slideXml = await zip.files[slideFiles[i]].async("text");

      onProgress?.({
        current: 40 + Math.floor((i / slideFiles.length) * 50),
        total: 100,
        message: `Extraindo slide ${slideNum} de ${slideFiles.length}...`,
      });

      // Extrai textos dos nós <a:t> (DrawingML text elements)
      const slideTexts = this.extractDrawingMlTexts(slideXml);

      // Extrai notas do apresentador (se houver)
      const notesXml = notesFiles.get(slideNum);
      const notesTexts = notesXml ? this.extractDrawingMlTexts(notesXml) : [];

      // Monta texto completo do slide
      const slideTitle = this.extractSlideTitle(slideXml) || `Slide ${slideNum}`;
      const bodyText = slideTexts.join(" ").trim();
      const notesText = notesTexts.length > 0 ? `\n[Notas]: ${notesTexts.join(" ")}` : "";
      const fullSlideText = `${bodyText}${notesText}`.trim();

      if (!fullSlideText) continue;

      const sentences = SentenceSplitterService.split(fullSlideText);
      if (sentences.length === 0) continue;

      const startIndex = globalSentenceIndex;
      const endIndex = globalSentenceIndex + sentences.length - 1;

      builder.addSentences(sentences, slideNum);
      builder.addChapter(slideTitle, startIndex, endIndex, slideNum);
      globalSentenceIndex = endIndex + 1;
    }

    onProgress?.({ current: 100, total: 100, message: "Apresentação processada com sucesso!" });
    return builder.build();
  }

  /**
   * Extrai o número ordinal do nome do arquivo de slide (ex: "slide3.xml" → 3).
   */
  private extractSlideNumber(fileName: string): number {
    const match = fileName.match(/(\d+)\.xml$/i);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Extrai todos os textos dos elementos DrawingML <a:t> em ordem de leitura.
   */
  private extractDrawingMlTexts(xml: string): string[] {
    const texts: string[] = [];
    const atRegex = /<a:t[^>]*>([^<]*)<\/a:t>/gi;
    let match: RegExpExecArray | null;

    while ((match = atRegex.exec(xml)) !== null) {
      const text = this.decodeXmlEntities(match[1]).trim();
      if (text) texts.push(text);
    }

    return texts;
  }

  /**
   * Tenta extrair o título do slide a partir do placeholder de título (<p:sp> com idx="0" ou tipo "title").
   */
  private extractSlideTitle(xml: string): string | null {
    // Captura placeholder de título (type="title" ou type="ctrTitle")
    const titleShapeRegex =
      /<p:sp>[\s\S]*?<p:ph[^>]*(?:type="(?:title|ctrTitle)")[\s\S]*?<\/p:sp>/gi;
    const match = titleShapeRegex.exec(xml);
    if (!match) return null;

    const texts = this.extractDrawingMlTexts(match[0]);
    return texts.join(" ").trim() || null;
  }

  /**
   * Decodifica entidades XML básicas.
   */
  private decodeXmlEntities(text: string): string {
    return text
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, code) =>
        String.fromCharCode(parseInt(code, 16))
      );
  }
}
