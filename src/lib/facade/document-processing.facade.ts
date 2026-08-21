/**
 * Ponto unificado e simplificado de orquestração para ingestão, extração e persistência de documentos.
 * Padrão: GoF Structural Pattern — Facade (Clean Architecture).
 */
import type { OnParseProgress, ParsedDocument, DocumentMetadata } from "@/lib/domain/document.types";
import { AdapterRegistry } from "@/lib/parsers/adapter-registry";
import { QuickPasteAdapter } from "@/lib/parsers/quick-paste.adapter";
import {
  ILibraryRepository,
  IndexedDbLibraryRepository,
} from "@/lib/repository/library.repository";

export class DocumentProcessingFacade {
  private static instance: DocumentProcessingFacade;
  private readonly adapterRegistry: AdapterRegistry;
  private readonly repository: ILibraryRepository;

  public constructor(
    adapterRegistry: AdapterRegistry = AdapterRegistry.getInstance(),
    repository: ILibraryRepository = IndexedDbLibraryRepository.getInstance()
  ) {
    this.adapterRegistry = adapterRegistry;
    this.repository = repository;
  }

  public static getInstance(): DocumentProcessingFacade {
    if (!DocumentProcessingFacade.instance) {
      DocumentProcessingFacade.instance = new DocumentProcessingFacade();
    }
    return DocumentProcessingFacade.instance;
  }

  /**
   * Processa qualquer arquivo compatível (PDF, EPUB, DOCX, ODT, TXT, MD), extrai sentenças e salva no repositório.
   */
  public async processAndSaveFile(
    file: File,
    onProgress?: OnParseProgress
  ): Promise<ParsedDocument> {
    const adapter = this.adapterRegistry.getAdapterFor(file);
    if (!adapter) {
      throw new Error(
        `Formato não suportado para o arquivo "${file.name}". Envie arquivos nos formatos: ${this.adapterRegistry
          .getSupportedExtensions()
          .join(", ")}.`
      );
    }

    const parsedDoc = await adapter.parse(file, onProgress);

    if (parsedDoc.sentences.length === 0) {
      throw new Error(
        "Nenhum texto legível foi extraído do arquivo. Verifique se o arquivo não está vazio ou protegido."
      );
    }

    await this.repository.save(parsedDoc);
    return parsedDoc;
  }

  /**
   * Processa texto bruto colado ou digitado pelo usuário e salva no repositório.
   */
  public async processAndSaveRawText(title: string, text: string): Promise<ParsedDocument> {
    if (!text || !text.trim()) {
      throw new Error("O texto para leitura não pode estar vazio.");
    }

    const parsedDoc = QuickPasteAdapter.parseRaw(title, text);
    if (parsedDoc.sentences.length === 0) {
      throw new Error("Nenhuma sentença legível foi identificada no texto informado.");
    }

    await this.repository.save(parsedDoc);
    return parsedDoc;
  }

  /**
   * Atualiza o índice da sentença atual para manter o estado de leitura persistido.
   */
  public async saveReadingProgress(documentId: string, sentenceIndex: number): Promise<void> {
    const doc = await this.repository.getById(documentId);
    if (doc) {
      doc.lastSentenceIndex = sentenceIndex;
      await this.repository.save(doc);
    }
  }

  /**
   * Atualiza o título do documento.
   */
  public async renameDocument(documentId: string, newTitle: string): Promise<ParsedDocument | null> {
    const cleanTitle = newTitle.trim();
    if (!cleanTitle) return null;
    const doc = await this.repository.getById(documentId);
    if (!doc) return null;
    doc.metadata.title = cleanTitle;
    return this.repository.save(doc);
  }

  public getRepository(): ILibraryRepository {
    return this.repository;
  }

  public getSupportedExtensions(): string[] {
    return this.adapterRegistry.getSupportedExtensions();
  }

  public getAcceptAttribute(): string {
    return this.adapterRegistry.getAcceptAttribute();
  }
}
