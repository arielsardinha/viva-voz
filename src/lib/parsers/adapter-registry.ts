/**
 * Registro dinâmico e resolução de adaptadores de extração de documentos.
 * Padrão: GoF Creational Pattern — Factory Method & Registry.
 */
import type { IDocumentParserAdapter } from "./adapter.interface";
import { DocxDocumentAdapter } from "./docx.adapter";
import { EpubDocumentAdapter } from "./epub.adapter";
import { MdDocumentAdapter } from "./md.adapter";
import { OdtDocumentAdapter } from "./odt.adapter";
import { PdfDocumentAdapter } from "./pdf.adapter";
import { TxtDocumentAdapter } from "./txt.adapter";

export class AdapterRegistry {
  private static instance: AdapterRegistry;
  private adapters: IDocumentParserAdapter[] = [];

  private constructor() {
    this.registerDefaultAdapters();
  }

  public static getInstance(): AdapterRegistry {
    if (!AdapterRegistry.instance) {
      AdapterRegistry.instance = new AdapterRegistry();
    }
    return AdapterRegistry.instance;
  }

  private registerDefaultAdapters(): void {
    this.register(new PdfDocumentAdapter());
    this.register(new EpubDocumentAdapter());
    this.register(new DocxDocumentAdapter());
    this.register(new OdtDocumentAdapter());
    this.register(new TxtDocumentAdapter());
    this.register(new MdDocumentAdapter());
  }

  /**
   * Registra um novo adaptador de parsing no sistema.
   */
  public register(adapter: IDocumentParserAdapter): void {
    this.adapters.push(adapter);
  }

  /**
   * Encontra o primeiro adaptador capaz de processar o arquivo fornecido.
   */
  public getAdapterFor(file: File): IDocumentParserAdapter | null {
    for (const adapter of this.adapters) {
      if (adapter.canHandle(file)) {
        return adapter;
      }
    }
    return null;
  }

  /**
   * Retorna todas as extensões suportadas pelo catálogo ativo.
   */
  public getSupportedExtensions(): string[] {
    return [".pdf", ".epub", ".docx", ".odt", ".txt", ".md", ".markdown"];
  }

  /**
   * Retorna a string do atributo `accept` para inputs de arquivo HTML.
   */
  public getAcceptAttribute(): string {
    return ".pdf,.epub,.docx,.odt,.txt,.md,.markdown,application/pdf,application/epub+zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.oasis.opendocument.text,text/plain,text/markdown";
  }
}
