/**
 * Entidades e tipos de domínio fundamentais para o suporte a múltiplos formatos de documentos.
 * Padrão: Clean Architecture & Domain Entities (Imutáveis e desacopladas de UI/I/O).
 */
import type { Sentence } from "@/lib/pdf-text";

export type DocumentFormat =
  | "pdf"
  | "epub"
  | "docx"
  | "txt"
  | "md"
  | "paste"
  | "web"
  | "pptx"
  | "odt"
  | "ocr";

export interface DocumentChapter {
  id: string;
  title: string;
  startIndex: number;
  endIndex: number;
  pageNumber?: number;
}

export interface DocumentMetadata {
  id: string;
  title: string;
  author?: string;
  format: DocumentFormat;
  originalFileName?: string;
  sizeBytes: number;
  wordCount: number;
  estimatedReadingMinutes: number;
  pageCount?: number;
  chapterCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface ParsedDocument {
  id: string;
  metadata: DocumentMetadata;
  chapters: DocumentChapter[];
  sentences: Sentence[];
  rawContentBlob?: Blob;
  lastSentenceIndex: number;
}

export interface DocumentParseProgress {
  current: number;
  total: number;
  message?: string;
}

export type OnParseProgress = (progress: DocumentParseProgress) => void;
