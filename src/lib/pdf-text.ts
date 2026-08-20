/**
 * Extração de texto de PDF e segmentação em frases.
 * Executa apenas no navegador (pdfjs-dist não funciona em SSR).
 */

export interface Sentence {
  index: number;
  page: number;
  text: string;
}

const MAX_SENTENCE_LENGTH = 320;

function splitLongChunk(chunk: string): string[] {
  if (chunk.length <= MAX_SENTENCE_LENGTH) return [chunk];
  const parts: string[] = [];
  let current = "";
  for (const piece of chunk.split(/(?<=[,;:])\s+/)) {
    if (current && (current + " " + piece).length > MAX_SENTENCE_LENGTH) {
      parts.push(current.trim());
      current = piece;
    } else {
      current = current ? `${current} ${piece}` : piece;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts.flatMap((part) =>
    part.length <= MAX_SENTENCE_LENGTH
      ? [part]
      : (part.match(new RegExp(`.{1,${MAX_SENTENCE_LENGTH}}(\\s|$)`, "g")) ?? [part]).map((p) =>
          p.trim(),
        ),
  );
}

export function splitIntoSentences(text: string): string[] {
  const normalized = text
    .replace(/-\s*\n\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return [];
  const rough = normalized.match(/[^.!?…]+[.!?…]+["')\]]*|\S[^.!?…]*$/g) ?? [normalized];
  return rough
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && /[\p{L}\p{N}]/u.test(s))
    .flatMap(splitLongChunk);
}

export interface ExtractionResult {
  sentences: Sentence[];
  pageCount: number;
}

export async function extractSentencesFromPdf(
  file: File,
  onProgress?: (page: number, total: number) => void,
): Promise<ExtractionResult> {
  const pdfjs = await import("pdfjs-dist");
  if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  }

  const data = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data }).promise;

  const sentences: Sentence[] = [];
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => {
        const anyItem = item as { str?: string; hasEOL?: boolean };
        if (typeof anyItem.str !== "string") return "";
        return anyItem.hasEOL ? `${anyItem.str} ` : anyItem.str;
      })
      .join("");

    for (const text of splitIntoSentences(pageText)) {
      sentences.push({ index: sentences.length, page: pageNumber, text });
    }
    onProgress?.(pageNumber, doc.numPages);
  }

  return { sentences, pageCount: doc.numPages };
}
