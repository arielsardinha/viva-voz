/**
 * Adapter para extração estruturada de livros digitais (.epub) com suporte a capítulos e metadados.
 * Padrão: GoF Adapter Pattern.
 */
import JSZip from "jszip";
import { ParsedDocumentBuilder } from "@/lib/domain/document-builder";
import type { DocumentFormat, OnParseProgress, ParsedDocument } from "@/lib/domain/document.types";
import { SentenceSplitterService } from "@/lib/domain/sentence-splitter.service";
import type { IDocumentParserAdapter } from "./adapter.interface";
import { readFileAsArrayBuffer } from "./file-reader.util";

export class EpubDocumentAdapter implements IDocumentParserAdapter {
  public readonly supportedFormats: DocumentFormat[] = ["epub"];

  public canHandle(file: File): boolean {
    const isEpubMime = file.type === "application/epub+zip";
    const hasEpubExt = file.name.toLowerCase().endsWith(".epub");
    return isEpubMime || hasEpubExt;
  }

  public async parse(file: File, onProgress?: OnParseProgress): Promise<ParsedDocument> {
    onProgress?.({ current: 0, total: 100, message: "Descompactando arquivo EPUB..." });

    const arrayBuffer = await readFileAsArrayBuffer(file);
    const zip = await JSZip.loadAsync(arrayBuffer);

    onProgress?.({ current: 20, total: 100, message: "Lendo container e manifesto..." });

    // 1. Localiza o arquivo .opf a partir do container.xml
    const opfPath = await this.findOpfPath(zip);
    const opfContent = await zip.file(opfPath)?.async("text");

    let title = file.name.replace(/\.epub$/i, "");
    let author: string | undefined = undefined;
    let spineHrefs: string[] = [];

    const opfDir = opfPath.includes("/") ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1) : "";

    if (opfContent) {
      // Extrair título e autor dos metadados
      const titleMatch = opfContent.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
      if (titleMatch) title = this.decodeHtmlEntities(titleMatch[1].trim());

      const authorMatch = opfContent.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/i);
      if (authorMatch) author = this.decodeHtmlEntities(authorMatch[1].trim());

      // Extrair manifesto (id -> href)
      const manifestMap = new Map<string, string>();
      const itemRegex = /<item\s+[^>]*id=["']([^"']+)["'][^>]*href=["']([^"']+)["'][^>]*\/?>|<item\s+[^>]*href=["']([^"']+)["'][^>]*id=["']([^"']+)["'][^>]*\/?>/gi;
      let itemMatch: RegExpExecArray | null;
      while ((itemMatch = itemRegex.exec(opfContent)) !== null) {
        const id = itemMatch[1] || itemMatch[4];
        const href = itemMatch[2] || itemMatch[3];
        if (id && href) manifestMap.set(id, href);
      }

      // Extrair ordem de leitura da Spine (itemref idref="...")
      const spineRegex = /<itemref\s+[^>]*idref=["']([^"']+)["'][^>]*\/?>/gi;
      let spineMatch: RegExpExecArray | null;
      while ((spineMatch = spineRegex.exec(opfContent)) !== null) {
        const idref = spineMatch[1];
        const href = manifestMap.get(idref);
        if (href) {
          spineHrefs.push(opfDir + href);
        }
      }
    }

    // Fallback caso a spine não seja identificada: pega todos os arquivos html/xhtml no zip
    if (spineHrefs.length === 0) {
      spineHrefs = Object.keys(zip.files).filter((path) =>
        /\.(html|xhtml|htm)$/i.test(path)
      );
    }

    const builder = new ParsedDocumentBuilder()
      .setOriginalFileName(file.name)
      .setTitle(title)
      .setAuthor(author)
      .setFormat("epub")
      .setSizeBytes(file.size)
      .setRawBlob(file);

    let currentStartIndex = 0;
    const totalChapters = spineHrefs.length;

    for (let i = 0; i < totalChapters; i++) {
      const href = spineHrefs[i];
      const normalizedPath = href.replace(/^\/+/, "");
      const chapterFile = zip.file(normalizedPath) || zip.file(decodeURIComponent(normalizedPath));

      if (!chapterFile) continue;

      const rawHtml = await chapterFile.async("text");
      const { chapterTitle, text } = this.extractTextFromHtml(rawHtml, `Capítulo ${i + 1}`);

      if (text.trim()) {
        const sentences = SentenceSplitterService.split(text);
        if (sentences.length > 0) {
          const start = currentStartIndex;
          const end = currentStartIndex + sentences.length - 1;
          builder.addSentences(sentences, i + 1);
          builder.addChapter(chapterTitle, start, end, i + 1);
          currentStartIndex = end + 1;
        }
      }

      const pct = 30 + Math.round(((i + 1) / Math.max(1, totalChapters)) * 60);
      onProgress?.({
        current: pct,
        total: 100,
        message: `Processando capítulo ${i + 1} de ${totalChapters}...`,
      });
    }

    onProgress?.({ current: 100, total: 100, message: "Concluído" });
    return builder.build();
  }

  private async findOpfPath(zip: JSZip): Promise<string> {
    const container = zip.file("META-INF/container.xml");
    if (container) {
      const xml = await container.async("text");
      const match = xml.match(/full-path=["']([^"']+)["']/i);
      if (match && match[1]) return match[1];
    }
    // Fallback: procura o primeiro arquivo .opf no zip
    const opfFile = Object.keys(zip.files).find((name) => name.endsWith(".opf"));
    return opfFile || "content.opf";
  }

  private extractTextFromHtml(html: string, defaultTitle: string): { chapterTitle: string; text: string } {
    let chapterTitle = defaultTitle;

    // Tenta encontrar título em <title>, <h1> ou <h2>
    const h1Match = html.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/i);
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

    if (h1Match) {
      chapterTitle = this.cleanHtmlTags(h1Match[1]).trim() || defaultTitle;
    } else if (titleMatch) {
      chapterTitle = this.cleanHtmlTags(titleMatch[1]).trim() || defaultTitle;
    }

    // Remove tags invisíveis
    const cleaned = html
      .replace(/<head[\s\S]*?<\/head>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "");

    const text = this.cleanHtmlTags(cleaned);
    return { chapterTitle, text };
  }

  private cleanHtmlTags(html: string): string {
    const withoutTags = html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/?[^>]+(>|$)/g, " ");

    return this.decodeHtmlEntities(withoutTags).replace(/\s+/g, " ").trim();
  }

  private decodeHtmlEntities(str: string): string {
    return str
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
  }
}
