/**
 * Adapter para extração, mapeamento de capítulos e sanitização de arquivos Markdown (.md).
 * Padrão: GoF Adapter Pattern.
 */
import { ParsedDocumentBuilder } from "@/lib/domain/document-builder";
import type { DocumentFormat, OnParseProgress, ParsedDocument } from "@/lib/domain/document.types";
import { SentenceSplitterService } from "@/lib/domain/sentence-splitter.service";
import type { IDocumentParserAdapter } from "./adapter.interface";
import { readFileAsText } from "./file-reader.util";

export class MdDocumentAdapter implements IDocumentParserAdapter {
  public readonly supportedFormats: DocumentFormat[] = ["md"];

  public canHandle(file: File): boolean {
    const isMdMime =
      file.type === "text/markdown" || file.type === "text/x-markdown";
    const hasMdExt = /\.(md|markdown|mdown)$/i.test(file.name);
    return isMdMime || hasMdExt;
  }

  public async parse(file: File, onProgress?: OnParseProgress): Promise<ParsedDocument> {
    onProgress?.({ current: 0, total: 100, message: "Lendo Markdown..." });

    const rawContent = await readFileAsText(file);

    onProgress?.({ current: 30, total: 100, message: "Mapeando seções e capítulos..." });

    const builder = new ParsedDocumentBuilder()
      .setOriginalFileName(file.name)
      .setTitle(file.name.replace(/\.(md|markdown|mdown)$/i, ""))
      .setFormat("md")
      .setSizeBytes(file.size)
      .setRawBlob(file);

    // Divisão de seções por cabeçalhos (# H1, ## H2, ### H3)
    const lines = rawContent.split(/\r?\n/);
    let currentChapterTitle = "Introdução";
    let currentChapterSentences: string[] = [];
    let currentStartIndex = 0;
    let hasChapters = false;

    for (const line of lines) {
      const headerMatch = line.match(/^#{1,3}\s+(.+)$/);
      if (headerMatch) {
        // Se já tínhamos conteúdo acumulado, adiciona como capítulo anterior
        if (currentChapterSentences.length > 0) {
          const start = currentStartIndex;
          const end = currentStartIndex + currentChapterSentences.length - 1;
          builder.addSentences(currentChapterSentences);
          builder.addChapter(currentChapterTitle, start, end);
          currentStartIndex = end + 1;
          currentChapterSentences = [];
          hasChapters = true;
        }
        currentChapterTitle = this.cleanMarkdownText(headerMatch[1]);
      } else {
        const cleanedLine = this.cleanMarkdownText(line);
        if (cleanedLine) {
          const sentences = SentenceSplitterService.split(cleanedLine);
          currentChapterSentences.push(...sentences);
        }
      }
    }

    // Adiciona o último bloco de conteúdo
    if (currentChapterSentences.length > 0) {
      const start = currentStartIndex;
      const end = currentStartIndex + currentChapterSentences.length - 1;
      builder.addSentences(currentChapterSentences);
      builder.addChapter(currentChapterTitle, start, end);
      hasChapters = true;
    }

    // Se nenhum capítulo foi identificado (ex: texto corrido sem cabeçalhos)
    if (!hasChapters) {
      const fullCleaned = this.cleanMarkdownText(rawContent);
      builder.addRawText(fullCleaned);
    }

    onProgress?.({ current: 100, total: 100, message: "Concluído" });
    return builder.build();
  }

  /**
   * Sanitiza a sintaxe Markdown para gerar um fluxo de fala agradável para TTS.
   */
  public cleanMarkdownText(md: string): string {
    return md
      .replace(/```[\s\S]*?```/g, " [Bloco de código] ") // Blocos de código
      .replace(/`([^`]+)`/g, "$1") // Código inline
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1") // Imagens -> texto alternativo
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Links -> texto visível
      .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, "$1") // Negrito, itálico, tachado
      .replace(/^>\s*/gm, "") // Citações blockquote
      .replace(/^[-*+]\s+/gm, "") // Listas não ordenadas
      .replace(/^\d+\.\s+/gm, "") // Listas ordenadas
      .replace(/\|/g, " ") // Tabelas
      .trim();
  }
}
