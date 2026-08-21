import JSZip from "jszip";
import { AdapterRegistry } from "./adapter-registry";
import { DocxDocumentAdapter } from "./docx.adapter";
import { EpubDocumentAdapter } from "./epub.adapter";
import { MdDocumentAdapter } from "./md.adapter";
import { PdfDocumentAdapter } from "./pdf.adapter";
import { QuickPasteAdapter } from "./quick-paste.adapter";
import { TxtDocumentAdapter } from "./txt.adapter";

// Mock de mammoth para o teste de docx
jest.mock("mammoth", () => ({
  extractRawText: jest.fn().mockResolvedValue({
    value: "Primeiro parágrafo do Word. Segundo parágrafo com detalhes adicionais.",
  }),
}));

// Mock de pdf-text para o teste de pdf
jest.mock("@/lib/pdf-text", () => ({
  extractSentencesFromPdf: jest.fn().mockResolvedValue({
    pageCount: 2,
    sentences: [
      { index: 0, page: 1, text: "Frase 1 da página um." },
      { index: 1, page: 2, text: "Frase 2 da página dois." },
    ],
  }),
}));

describe("Adapters & Registry (Tier 1 - GoF Adapter + Factory Method)", () => {
  describe("TxtDocumentAdapter", () => {
    it("deve reconhecer e processar arquivos .txt", async () => {
      const adapter = new TxtDocumentAdapter();
      const file = new File(["Olá mundo! Esta é a segunda frase."], "documento.txt", {
        type: "text/plain",
      });

      expect(adapter.canHandle(file)).toBe(true);

      const parsed = await adapter.parse(file);
      expect(parsed.metadata.title).toBe("documento");
      expect(parsed.metadata.format).toBe("txt");
      expect(parsed.sentences.length).toBe(2);
      expect(parsed.sentences[0].text).toBe("Olá mundo!");
    });
  });

  describe("MdDocumentAdapter", () => {
    it("deve reconhecer .md e extrair capítulos a partir de cabeçalhos # e ##", async () => {
      const adapter = new MdDocumentAdapter();
      const content = `
# Capítulo 1: O Começo
Esta é a introdução do documento com [link](https://exemplo.com) e **negrito**.

## Capítulo 2: Detalhes
Aqui temos a segunda parte da história. Tudo funcionando perfeitamente!
      `;
      const file = new File([content], "artigo.md", { type: "text/markdown" });

      expect(adapter.canHandle(file)).toBe(true);

      const parsed = await adapter.parse(file);
      expect(parsed.metadata.format).toBe("md");
      expect(parsed.chapters.length).toBe(2);
      expect(parsed.chapters[0].title).toBe("Capítulo 1: O Começo");
      expect(parsed.chapters[1].title).toBe("Capítulo 2: Detalhes");
      expect(parsed.sentences.some((s) => s.text.includes("introdução"))).toBe(true);
      // Garante sanitização de Markdown
      expect(parsed.sentences.some((s) => s.text.includes("**"))).toBe(false);
    });
  });

  describe("DocxDocumentAdapter", () => {
    it("deve reconhecer e extrair conteúdo de arquivos .docx", async () => {
      const adapter = new DocxDocumentAdapter();
      const file = new File(["fake docx binary"], "relatorio.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      expect(adapter.canHandle(file)).toBe(true);

      const parsed = await adapter.parse(file);
      expect(parsed.metadata.title).toBe("relatorio");
      expect(parsed.metadata.format).toBe("docx");
      expect(parsed.sentences.length).toBe(2);
    });
  });

  describe("EpubDocumentAdapter", () => {
    it("deve descompactar arquivo .epub e extrair metadados e capítulos", async () => {
      const zip = new JSZip();

      // Monta estrutura mínima válida de EPUB
      zip.file(
        "META-INF/container.xml",
        `<?xml version="1.0"?>
         <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
           <rootfiles>
             <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
           </rootfiles>
         </container>`
      );

      zip.file(
        "OEBPS/content.opf",
        `<?xml version="1.0"?>
         <package version="2.0" xmlns="http://www.idpf.org/2007/opf">
           <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
             <dc:title>Livro Digital Teste</dc:title>
             <dc:creator>Escritor Modelo</dc:creator>
           </metadata>
           <manifest>
             <item id="chap1" href="chap1.xhtml" media-type="application/xhtml+xml"/>
             <item id="chap2" href="chap2.xhtml" media-type="application/xhtml+xml"/>
           </manifest>
           <spine>
             <itemref idref="chap1"/>
             <itemref idref="chap2"/>
           </spine>
         </package>`
      );

      zip.file(
        "OEBPS/chap1.xhtml",
        `<!DOCTYPE html><html><head><title>Capítulo 1</title></head><body><h1>Capítulo 1: A Jornada</h1><p>Era uma vez um leitor de texto em voz alta.</p></body></html>`
      );

      zip.file(
        "OEBPS/chap2.xhtml",
        `<!DOCTYPE html><html><head><title>Capítulo 2</title></head><body><h2>Capítulo 2: O Sucesso</h2><p>Todos ouviram seus livros favoritos com alta fidelidade.</p></body></html>`
      );

      const buffer = await zip.generateAsync({ type: "arraybuffer" });
      const file = new File([buffer], "livro.epub", { type: "application/epub+zip" });

      const adapter = new EpubDocumentAdapter();
      expect(adapter.canHandle(file)).toBe(true);

      const parsed = await adapter.parse(file);
      expect(parsed.metadata.title).toBe("Livro Digital Teste");
      expect(parsed.metadata.author).toBe("Escritor Modelo");
      expect(parsed.metadata.format).toBe("epub");
      expect(parsed.chapters.length).toBe(2);
      expect(parsed.chapters[0].title).toBe("Capítulo 1: A Jornada");
      expect(parsed.chapters[1].title).toBe("Capítulo 2: O Sucesso");
      expect(parsed.sentences.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("PdfDocumentAdapter", () => {
    it("deve processar arquivos PDF e gerar ParsedDocument", async () => {
      const adapter = new PdfDocumentAdapter();
      const file = new File(["fake pdf"], "artigo.pdf", { type: "application/pdf" });

      expect(adapter.canHandle(file)).toBe(true);

      const parsed = await adapter.parse(file);
      expect(parsed.metadata.title).toBe("artigo");
      expect(parsed.metadata.format).toBe("pdf");
      expect(parsed.metadata.pageCount).toBe(2);
      expect(parsed.sentences.length).toBe(2);
    });
  });

  describe("QuickPasteAdapter", () => {
    it("deve gerar ParsedDocument a partir de texto colado", () => {
      const doc = QuickPasteAdapter.parseRaw(
        "Minha Nota de Aula",
        "Primeiro ponto importante. Segundo conceito relevante para a prova."
      );
      expect(doc.metadata.title).toBe("Minha Nota de Aula");
      expect(doc.metadata.format).toBe("paste");
      expect(doc.sentences.length).toBe(2);
      expect(doc.metadata.wordCount).toBeGreaterThan(0);
    });
  });

  describe("AdapterRegistry (GoF Factory Method & Registry)", () => {
    it("deve resolver o adapter correto para cada extensão suportada", () => {
      const registry = AdapterRegistry.getInstance();

      const txt = new File([""], "teste.txt", { type: "text/plain" });
      const md = new File([""], "teste.md", { type: "text/markdown" });
      const docx = new File([""], "teste.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const epub = new File([""], "teste.epub", { type: "application/epub+zip" });
      const pdf = new File([""], "teste.pdf", { type: "application/pdf" });
      const unknown = new File([""], "arquivo.xyz", { type: "application/unknown" });

      expect(registry.getAdapterFor(txt)).toBeInstanceOf(TxtDocumentAdapter);
      expect(registry.getAdapterFor(md)).toBeInstanceOf(MdDocumentAdapter);
      expect(registry.getAdapterFor(docx)).toBeInstanceOf(DocxDocumentAdapter);
      expect(registry.getAdapterFor(epub)).toBeInstanceOf(EpubDocumentAdapter);
      expect(registry.getAdapterFor(pdf)).toBeInstanceOf(PdfDocumentAdapter);
      expect(registry.getAdapterFor(unknown)).toBeNull();
    });

    it("deve fornecer a lista de extensões suportadas e atributo accept", () => {
      const registry = AdapterRegistry.getInstance();
      const extensions = registry.getSupportedExtensions();
      expect(extensions).toContain(".pdf");
      expect(extensions).toContain(".epub");
      expect(extensions).toContain(".docx");
      expect(extensions).toContain(".txt");
      expect(extensions).toContain(".md");

      const accept = registry.getAcceptAttribute();
      expect(accept).toContain(".pdf");
      expect(accept).toContain(".epub");
    });
  });
});
