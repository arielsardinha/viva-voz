/**
 * Construtor fluente para criar instâncias imutáveis e consistentes de ParsedDocument.
 * Padrão: GoF Creational Pattern — Builder (Fluent Interface).
 */
import type { Sentence } from "@/lib/pdf-text";
import {
  DocumentChapter,
  DocumentFormat,
  DocumentMetadata,
  ParsedDocument,
} from "./document.types";
import { ReadingMetricsService } from "./reading-metrics.service";
import { SentenceSplitterService } from "./sentence-splitter.service";

export class ParsedDocumentBuilder {
  private id?: string;
  private title?: string;
  private author?: string;
  private format: DocumentFormat = "txt";
  private originalFileName?: string;
  private sizeBytes: number = 0;
  private pageCount?: number;
  private rawContentBlob?: Blob;
  private sentences: Sentence[] = [];
  private chapters: DocumentChapter[] = [];

  public setId(id: string): this {
    this.id = id;
    return this;
  }

  public setTitle(title: string): this {
    this.title = title;
    return this;
  }

  public setAuthor(author: string): this {
    this.author = author;
    return this;
  }

  public setFormat(format: DocumentFormat): this {
    this.format = format;
    return this;
  }

  public setOriginalFileName(fileName: string): this {
    this.originalFileName = fileName;
    return this;
  }

  public setSizeBytes(bytes: number): this {
    this.sizeBytes = Math.max(0, bytes);
    return this;
  }

  public setPageCount(pages: number): this {
    this.pageCount = Math.max(1, pages);
    return this;
  }

  public setRawBlob(blob: Blob): this {
    this.rawContentBlob = blob;
    if (this.sizeBytes === 0 && blob.size > 0) {
      this.sizeBytes = blob.size;
    }
    return this;
  }

  public addSentence(text: string, pageNumber: number = 1): this {
    const trimmed = text.trim();
    if (trimmed) {
      this.sentences.push({
        index: this.sentences.length,
        page: pageNumber,
        text: trimmed,
      });
    }
    return this;
  }

  public addSentences(texts: string[], pageNumber: number = 1): this {
    for (const text of texts) {
      this.addSentence(text, pageNumber);
    }
    return this;
  }

  public addRawText(text: string, pageNumber: number = 1): this {
    const splitSentences = SentenceSplitterService.split(text);
    return this.addSentences(splitSentences, pageNumber);
  }

  public addChapter(
    title: string,
    startIndex: number,
    endIndex: number,
    pageNumber?: number
  ): this {
    const chapterId = `chap_${this.chapters.length + 1}_${Math.random().toString(36).slice(2, 7)}`;
    this.chapters.push({
      id: chapterId,
      title: title.trim() || `Capítulo ${this.chapters.length + 1}`,
      startIndex,
      endIndex,
      pageNumber,
    });
    return this;
  }

  public build(): ParsedDocument {
    const generatedId =
      this.id ||
      (typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `doc_${Date.now()}_${Math.random().toString(36).slice(2)}`);

    const finalTitle =
      this.title?.trim() ||
      this.originalFileName?.replace(/\.[^/.]+$/, "") ||
      "Documento sem título";

    // Contagem de palavras agregada
    const totalWords = this.sentences.reduce(
      (acc, s) => acc + ReadingMetricsService.countWords(s.text),
      0
    );

    const estimatedMinutes = ReadingMetricsService.calculateEstimatedMinutes(totalWords);
    const now = Date.now();

    // Normalização e consistência dos capítulos
    const totalSentences = this.sentences.length;
    let finalChapters = this.chapters;

    if (finalChapters.length === 0) {
      finalChapters = [
        {
          id: "chap_default_1",
          title: "Início",
          startIndex: 0,
          endIndex: Math.max(0, totalSentences - 1),
          pageNumber: 1,
        },
      ];
    } else {
      // Ajuste de limites e garantia de integridade
      finalChapters = finalChapters.map((chap) => {
        const safeStart = Math.max(0, Math.min(chap.startIndex, totalSentences - 1));
        const safeEnd = Math.max(safeStart, Math.min(chap.endIndex, totalSentences - 1));
        return {
          ...chap,
          startIndex: safeStart,
          endIndex: safeEnd,
        };
      });
    }

    const metadata: DocumentMetadata = {
      id: generatedId,
      title: finalTitle,
      author: this.author,
      format: this.format,
      originalFileName: this.originalFileName,
      sizeBytes: this.sizeBytes,
      wordCount: totalWords,
      estimatedReadingMinutes: estimatedMinutes,
      pageCount: this.pageCount || (this.sentences.length > 0 ? Math.max(...this.sentences.map((s) => s.page)) : 1),
      chapterCount: finalChapters.length,
      createdAt: now,
      updatedAt: now,
    };

    return {
      id: generatedId,
      metadata,
      chapters: finalChapters,
      sentences: this.sentences,
      rawContentBlob: this.rawContentBlob,
      lastSentenceIndex: 0,
    };
  }
}
