/**
 * Adapter para extração e processamento de documentos OpenDocument Text (.odt).
 * Padrão: GoF Structural Pattern — Adapter (SOLID).
 */
import JSZip from "jszip";
import { ParsedDocumentBuilder } from "@/lib/domain/document-builder";
import type { DocumentFormat, OnParseProgress, ParsedDocument } from "@/lib/domain/document.types";
import { SentenceSplitterService } from "@/lib/domain/sentence-splitter.service";
import type { IDocumentParserAdapter } from "./adapter.interface";
import { readFileAsArrayBuffer } from "./file-reader.util";

interface SectionBlock {
  type: "heading" | "paragraph";
  title?: string;
  text: string;
}

export class OdtDocumentAdapter implements IDocumentParserAdapter {
  public readonly supportedFormats: DocumentFormat[] = ["odt"];

  public canHandle(file: File): boolean {
    const isOdtMime =
      file.type === "application/vnd.oasis.opendocument.text" ||
      file.type === "application/x-vnd.oasis.opendocument.text";
    const hasOdtExt = file.name.toLowerCase().endsWith(".odt");
    return isOdtMime || hasOdtExt;
  }

  public async parse(file: File, onProgress?: OnParseProgress): Promise<ParsedDocument> {
    onProgress?.({ current: 0, total: 100, message: "Descompactando arquivo OpenDocument (.odt)..." });

    const arrayBuffer = await readFileAsArrayBuffer(file);
    const zip = await JSZip.loadAsync(arrayBuffer);

    onProgress?.({ current: 20, total: 100, message: "Lendo metadados e conteúdo do documento..." });

    // 1. Extrai metadados de meta.xml (se existir)
    let title = file.name.replace(/\.odt$/i, "");
    let author: string | undefined = undefined;

    const metaFile = zip.file("meta.xml");
    if (metaFile) {
      const metaXml = await metaFile.async("text");
      const titleMatch = metaXml.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i);
      if (titleMatch && titleMatch[1].trim()) {
        title = this.cleanXmlText(titleMatch[1]).trim();
      }

      const authorMatch = metaXml.match(/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i);
      if (authorMatch && authorMatch[1].trim()) {
        author = this.cleanXmlText(authorMatch[1]).trim();
      }
    }

    // 2. Extrai o texto de content.xml
    const contentFile = zip.file("content.xml");
    if (!contentFile) {
      throw new Error("Arquivo ODT inválido: content.xml não encontrado no pacote.");
    }

    onProgress?.({ current: 40, total: 100, message: "Processando estrutura de texto e capítulos..." });

    const contentXml = await contentFile.async("text");
    const blocks = this.extractBlocksFromContentXml(contentXml);

    const builder = new ParsedDocumentBuilder()
      .setOriginalFileName(file.name)
      .setTitle(title)
      .setAuthor(author)
      .setFormat("odt")
      .setSizeBytes(file.size)
      .setRawBlob(file);

    let currentStartIndex = 0;
    let currentChapterTitle = "Início";
    let chapterSentencesAcc: string[] = [];
    let chapterNumber = 1;
    let hasHeadings = blocks.some((b) => b.type === "heading" && b.text.trim().length > 0);

    onProgress?.({ current: 60, total: 100, message: "Segmentando sentenças do documento..." });

    if (hasHeadings) {
      for (const block of blocks) {
        if (block.type === "heading") {
          // Se já tínhamos sentenças acumuladas no capítulo anterior, salva
          if (chapterSentencesAcc.length > 0) {
            const joinedText = chapterSentencesAcc.join("\n\n");
            const sentences = SentenceSplitterService.split(joinedText);
            if (sentences.length > 0) {
              const start = currentStartIndex;
              const end = currentStartIndex + sentences.length - 1;
              builder.addSentences(sentences, chapterNumber);
              builder.addChapter(currentChapterTitle, start, end, chapterNumber);
              currentStartIndex = end + 1;
              chapterNumber++;
            }
            chapterSentencesAcc = [];
          }
          currentChapterTitle = block.text.trim() || `Capítulo ${chapterNumber}`;
        } else {
          if (block.text.trim()) {
            chapterSentencesAcc.push(block.text);
          }
        }
      }

      // Adiciona o último capítulo se restaram sentenças
      if (chapterSentencesAcc.length > 0) {
        const joinedText = chapterSentencesAcc.join("\n\n");
        const sentences = SentenceSplitterService.split(joinedText);
        if (sentences.length > 0) {
          const start = currentStartIndex;
          const end = currentStartIndex + sentences.length - 1;
          builder.addSentences(sentences, chapterNumber);
          builder.addChapter(currentChapterTitle, start, end, chapterNumber);
        }
      }
    } else {
      // Sem cabeçalhos: processa todos os parágrafos em fluxo contínuo
      const allText = blocks.map((b) => b.text).filter((t) => t.trim().length > 0).join("\n\n");
      builder.addRawText(allText);
    }

    onProgress?.({ current: 100, total: 100, message: "Concluído" });
    return builder.build();
  }

  /**
   * Extrai blocos de cabeçalho e parágrafo de content.xml
   */
  private extractBlocksFromContentXml(xml: string): SectionBlock[] {
    const blocks: SectionBlock[] = [];

    // Remove tags de anotações internas/comentários de revisão
    const sanitizedXml = xml
      .replace(/<office:annotation[\s\S]*?<\/office:annotation>/gi, "")
      .replace(/<office:scripts[\s\S]*?<\/office:scripts>/gi, "")
      .replace(/<office:font-face-decls[\s\S]*?<\/office:font-face-decls>/gi, "")
      .replace(/<office:automatic-styles[\s\S]*?<\/office:automatic-styles>/gi, "");

    // Regex para capturar <text:h ...>...</text:h> ou <text:p ...>...</text:p>
    const elementRegex = /<text:(h|p)[^>]*>([\s\S]*?)<\/text:\1>/gi;
    let match: RegExpExecArray | null;

    while ((match = elementRegex.exec(sanitizedXml)) !== null) {
      const tagType = match[1].toLowerCase();
      const rawContent = match[2];
      const parsedText = this.cleanXmlText(rawContent);

      if (parsedText.trim()) {
        blocks.push({
          type: tagType === "h" ? "heading" : "paragraph",
          text: parsedText,
        });
      }
    }

    return blocks;
  }

  /**
   * Limpa tags internas XML do ODT, converte espaços/tabs e decodifica entidades
   */
  private cleanXmlText(xmlFragment: string): string {
    return xmlFragment
      // Converte <text:s text:c="N"/> em N espaços
      .replace(/<text:s\s+text:c=["'](\d+)["']\s*\/?>/gi, (_, count) => " ".repeat(Number(count)))
      .replace(/<text:s\s*\/?>/gi, " ")
      // Converte <text:tab/> em espaço
      .replace(/<text:tab\s*\/?>/gi, "\t")
      // Converte <text:line-break/> em quebra de linha
      .replace(/<text:line-break\s*\/?>/gi, "\n")
      // Remove todas as outras tags XML
      .replace(/<\/?[^>]+(>|$)/g, "")
      // Decodifica entidades XML
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
      .replace(/[ \t]+/g, " ")
      .trim();
  }
}
