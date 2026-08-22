import JSZip from "jszip";
import { AdapterRegistry } from "./adapter-registry";
import { DocxDocumentAdapter } from "./docx.adapter";
import { EpubDocumentAdapter } from "./epub.adapter";
import { MdDocumentAdapter } from "./md.adapter";
import { OdtDocumentAdapter } from "./odt.adapter";
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

  describe("OdtDocumentAdapter", () => {
    it("deve descompactar arquivo .odt e extrair metadados e parágrafos", async () => {
      const zip = new JSZip();

      zip.file(
        "meta.xml",
        `<?xml version="1.0" encoding="UTF-8"?>
         <office:document-meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
           <office:meta>
             <dc:title>Relatório Aberto ODT</dc:title>
             <dc:creator>Pesquisador Livre</dc:creator>
           </office:meta>
         </office:document-meta>`
      );

      zip.file(
        "content.xml",
        `<?xml version="1.0" encoding="UTF-8"?>
         <office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">
           <office:body>
             <office:text>
               <text:p>Primeiro parágrafo do documento ODT com texto simples.</text:p>
               <text:p>Segundo parágrafo com <text:span text:style-name="Bold">destaque em negrito</text:span> &amp; pontuação.</text:p>
             </office:text>
           </office:body>
         </office:document-content>`
      );

      const buffer = await zip.generateAsync({ type: "arraybuffer" });
      const file = new File([buffer], "documento.odt", {
        type: "application/vnd.oasis.opendocument.text",
      });

      const adapter = new OdtDocumentAdapter();
      expect(adapter.canHandle(file)).toBe(true);

      const parsed = await adapter.parse(file);
      expect(parsed.metadata.title).toBe("Relatório Aberto ODT");
      expect(parsed.metadata.author).toBe("Pesquisador Livre");
      expect(parsed.metadata.format).toBe("odt");
      expect(parsed.sentences.length).toBeGreaterThanOrEqual(2);
      expect(parsed.sentences[0].text).toContain("Primeiro parágrafo do documento ODT");
      expect(parsed.sentences.some((s) => s.text.includes("&"))).toBe(true);
    });

    it("deve extrair capítulos de tags <text:h> e estruturar no ParsedDocument", async () => {
      const zip = new JSZip();

      zip.file(
        "content.xml",
        `<?xml version="1.0" encoding="UTF-8"?>
         <office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">
           <office:body>
             <office:text>
               <text:h text:outline-level="1">Capítulo 1: Fundamentos</text:h>
               <text:p>Este é o conteúdo fundamental do primeiro capítulo.</text:p>
               <text:h text:outline-level="1">Capítulo 2: Aplicações Práticas</text:h>
               <text:p>Aqui explicamos as aplicações no dia a dia do usuário.</text:p>
             </office:text>
           </office:body>
         </office:document-content>`
      );

      const buffer = await zip.generateAsync({ type: "arraybuffer" });
      const file = new File([buffer], "tese.odt", {
        type: "application/vnd.oasis.opendocument.text",
      });

      const adapter = new OdtDocumentAdapter();
      const parsed = await adapter.parse(file);

      expect(parsed.metadata.format).toBe("odt");
      expect(parsed.chapters.length).toBe(2);
      expect(parsed.chapters[0].title).toBe("Capítulo 1: Fundamentos");
      expect(parsed.chapters[1].title).toBe("Capítulo 2: Aplicações Práticas");
      expect(parsed.sentences.some((s) => s.text.includes("conteúdo fundamental"))).toBe(true);
    });

    it("deve processar espaços múltiplos <text:s>, tabs e quebras de linha", async () => {
      const zip = new JSZip();

      zip.file(
        "content.xml",
        `<?xml version="1.0" encoding="UTF-8"?>
         <office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">
           <office:body>
             <office:text>
               <text:p>Texto com<text:s text:c="3"/>espaços e tabulação<text:tab/>seguido de quebra.<text:line-break/>Nova linha aqui.</text:p>
             </office:text>
           </office:body>
         </office:document-content>`
      );

      const buffer = await zip.generateAsync({ type: "arraybuffer" });
      const file = new File([buffer], "espacos.odt", {
        type: "application/vnd.oasis.opendocument.text",
      });

      const adapter = new OdtDocumentAdapter();
      const parsed = await adapter.parse(file);

      expect(parsed.sentences.length).toBeGreaterThan(0);
      expect(parsed.sentences.some((s) => s.text.includes("Texto com"))).toBe(true);
    });

    it("deve lançar erro se content.xml não estiver presente", async () => {
      const zip = new JSZip();
      zip.file("outro.xml", "<vazio />");
      const buffer = await zip.generateAsync({ type: "arraybuffer" });
      const file = new File([buffer], "invalido.odt", {
        type: "application/vnd.oasis.opendocument.text",
      });

      const adapter = new OdtDocumentAdapter();
      await expect(adapter.parse(file)).rejects.toThrow("content.xml não encontrado");
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
      const odt = new File([""], "teste.odt", {
        type: "application/vnd.oasis.opendocument.text",
      });
      const epub = new File([""], "teste.epub", { type: "application/epub+zip" });
      const pdf = new File([""], "teste.pdf", { type: "application/pdf" });
      const unknown = new File([""], "arquivo.xyz", { type: "application/unknown" });

      expect(registry.getAdapterFor(txt)).toBeInstanceOf(TxtDocumentAdapter);
      expect(registry.getAdapterFor(md)).toBeInstanceOf(MdDocumentAdapter);
      expect(registry.getAdapterFor(docx)).toBeInstanceOf(DocxDocumentAdapter);
      expect(registry.getAdapterFor(odt)).toBeInstanceOf(OdtDocumentAdapter);
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
      expect(extensions).toContain(".odt");
      expect(extensions).toContain(".pptx");
      expect(extensions).toContain(".txt");
      expect(extensions).toContain(".md");

      const accept = registry.getAcceptAttribute();
      expect(accept).toContain(".pdf");
      expect(accept).toContain(".epub");
      expect(accept).toContain(".docx");
      expect(accept).toContain(".odt");
      expect(accept).toContain(".pptx");
      expect(accept).toContain("application/vnd.oasis.opendocument.text");
      expect(accept).toContain("application/vnd.openxmlformats-officedocument.presentationml.presentation");
    });
  });
});

/* ──────────────────────────────────────────────────────────────
   Tier 2 — PptxDocumentAdapter & WebArticleAdapter
   ────────────────────────────────────────────────────────────── */

import { PptxDocumentAdapter } from "./pptx.adapter";
import { WebArticleAdapter } from "./web-article.adapter";

/**
 * Helper para gerar um PPTX mínimo válido com N slides via JSZip
 */
async function buildMinimalPptx(slides: Array<{ title: string; texts: string[]; notes?: string[] }>): Promise<Blob> {
  const zip = new JSZip();

  // Estrutura mínima exigida pelo PPTX
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`);

  slides.forEach((slide, i) => {
    const slideNum = i + 1;
    const textNodes = slide.texts.map((t) => `<a:t>${t}</a:t>`).join("");
    const slideXml = `<?xml version="1.0" encoding="UTF-8"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:nvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
        <p:txBody><a:p><a:r><a:t>${slide.title}</a:t></a:r></a:p></p:txBody>
      </p:sp>
      <p:sp>
        <p:txBody><a:p><a:r>${textNodes}</a:r></a:p></p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`;
    zip.file(`ppt/slides/slide${slideNum}.xml`, slideXml);

    if (slide.notes?.length) {
      const notesText = slide.notes.map((n) => `<a:t>${n}</a:t>`).join("");
      const notesXml = `<?xml version="1.0" encoding="UTF-8"?>
<p:notes xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/">
  <p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r>${notesText}</a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld>
</p:notes>`;
      zip.file(`ppt/notesSlides/notesSlide${slideNum}.xml`, notesXml);
    }
  });

  const buffer = await zip.generateAsync({ type: "arraybuffer" });
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  });
}

describe("Adapters — Tier 2 (GoF Adapter Pattern)", () => {
  describe("PptxDocumentAdapter", () => {
    let adapter: PptxDocumentAdapter;

    beforeEach(() => {
      adapter = new PptxDocumentAdapter();
    });

    it("deve reconhecer arquivos .pptx por extensão e MIME type", () => {
      const byExt = new File([""], "aula.pptx");
      const byMime = new File([""], "apresentacao.pptx", {
        type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      });
      const unknown = new File([""], "relatorio.pdf", { type: "application/pdf" });

      expect(adapter.canHandle(byExt)).toBe(true);
      expect(adapter.canHandle(byMime)).toBe(true);
      expect(adapter.canHandle(unknown)).toBe(false);
    });

    it("deve extrair textos e criar um capítulo por slide", async () => {
      const pptxBlob = await buildMinimalPptx([
        { title: "Introdução", texts: ["Bem-vindo ao curso de TypeScript."] },
        { title: "Módulo 1", texts: ["Aprenda sobre tipos genéricos e inferência."] },
      ]);
      const file = new File([pptxBlob], "curso.pptx", {
        type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      });

      const parsed = await adapter.parse(file);

      expect(parsed.metadata.format).toBe("pptx");
      expect(parsed.metadata.title).toBe("curso");
      expect(parsed.chapters.length).toBe(2);
      expect(parsed.chapters[0].title).toContain("Introdução");
      expect(parsed.chapters[1].title).toContain("Módulo 1");
      expect(parsed.sentences.length).toBeGreaterThanOrEqual(2);
    });

    it("deve incluir notas do apresentador quando presentes", async () => {
      const pptxBlob = await buildMinimalPptx([
        {
          title: "Slide com Notas",
          texts: ["Conteúdo principal do slide."],
          notes: ["Esta é a nota do apresentador para este slide."],
        },
      ]);
      const file = new File([pptxBlob], "palestra.pptx", {
        type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      });

      const parsed = await adapter.parse(file);

      expect(parsed.chapters.length).toBe(1);
      const allText = parsed.sentences.map((s) => s.text).join(" ");
      expect(allText).toContain("nota do apresentador");
    });

    it("deve lançar erro para arquivo que não contém slides", async () => {
      const zip = new JSZip();
      zip.file("dummy.xml", "<root/>");
      const buffer = await zip.generateAsync({ type: "arraybuffer" });
      const file = new File([buffer], "vazio.pptx", {
        type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      });

      await expect(adapter.parse(file)).rejects.toThrow(/nenhum slide/i);
    });

    it("deve relatar progresso durante o parsing", async () => {
      const pptxBlob = await buildMinimalPptx([
        { title: "Slide 1", texts: ["Texto de teste para verificar progresso."] },
      ]);
      const file = new File([pptxBlob], "progresso.pptx", {
        type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      });

      const progressValues: number[] = [];
      await adapter.parse(file, ({ current }) => progressValues.push(current));

      expect(progressValues.length).toBeGreaterThan(0);
      expect(progressValues[0]).toBe(0);
      expect(progressValues[progressValues.length - 1]).toBe(100);
    });
  });

  describe("WebArticleAdapter", () => {
    let adapter: WebArticleAdapter;

    beforeEach(() => {
      adapter = new WebArticleAdapter();
    });

    it("não deve capturar arquivos File no canHandle (CORS bypass é via Route Handler)", () => {
      const file = new File([""], "artigo.html", { type: "text/html" });
      expect(adapter.canHandle(file)).toBe(false);
    });

    it("deve lançar erro descritivo ao chamar parse() diretamente", async () => {
      const file = new File([""], "dummy.html");
      await expect(adapter.parse(file)).rejects.toThrow(/fetchFromUrl/i);
    });

    it("deve lançar erro com mensagem do servidor em caso de falha 422", async () => {
      const fetchMock = jest.spyOn(global, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Conteúdo não extraível." }), {
          status: 422,
          headers: { "Content-Type": "application/json" },
        })
      );

      await expect(
        adapter.fetchFromUrl("https://exemplo.com/artigo")
      ).rejects.toThrow("Conteúdo não extraível.");

      fetchMock.mockRestore();
    });

    it("deve retornar ParsedDocument em caso de sucesso", async () => {
      const mockDocument = {
        id: "doc_123",
        metadata: {
          id: "doc_123",
          title: "Artigo Teste",
          format: "web",
          sizeBytes: 1000,
          wordCount: 200,
          estimatedReadingMinutes: 1,
          chapterCount: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        chapters: [{ id: "chap_1", title: "Início", startIndex: 0, endIndex: 5 }],
        sentences: [],
        lastSentenceIndex: 0,
      };

      const fetchMock = jest.spyOn(global, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ document: mockDocument }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const result = await adapter.fetchFromUrl("https://exemplo.com/artigo");
      expect(result).toEqual(mockDocument);

      fetchMock.mockRestore();
    });
  });
});

