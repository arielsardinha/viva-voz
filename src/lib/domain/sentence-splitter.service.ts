/**
 * Serviço de domínio responsável pela segmentação e higienização inteligente de sentenças.
 * Padrão: Domain Service (SOLID - Single Responsibility Principle).
 */
export class SentenceSplitterService {
  private static readonly MAX_SENTENCE_LENGTH = 320;
  private static readonly DOT_PLACEHOLDER = "___DOT_TOKEN___";

  private static readonly ABBREVIATIONS = [
    "dr",
    "dra",
    "sr",
    "sra",
    "prof",
    "profa",
    "eng",
    "adv",
    "etc",
    "ex",
    "vs",
    "pág",
    "pag",
    "cap",
    "art",
    "fig",
    "obs",
    "tel",
    "av",
    "cia",
    "dept",
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
    "mr",
    "mrs",
    "ms",
    "i.e",
    "e.g",
  ];

  /**
   * Divide uma string de texto em sentenças otimizadas para motores de TTS.
   */
  public static split(text: string): string[] {
    if (!text || !text.trim()) return [];

    // 1. Normalização básica
    let sanitized = text
      .replace(/-\s*\n\s*/g, "") // Junção de palavras hifenizadas no final de linha
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\s+/g, " ")
      .trim();

    if (!sanitized) return [];

    // 2. Proteção de abreviações e números decimais com placeholder
    sanitized = SentenceSplitterService.protectSpecialDots(sanitized);

    // 3. Segmentação por pontuação terminal (. ! ? …) seguida de espaço, aspas ou fim de linha
    const rawMatches =
      sanitized.match(/[^.!?…]+(?:[.!?…]+["')\]]*(?:\s+|$)|$)/g) ?? [sanitized];

    // 4. Limpeza, restauração de placeholders e quebra de blocos muito longos
    return rawMatches
      .map((item) => SentenceSplitterService.unprotectSpecialDots(item).trim())
      .filter((item) => item.length > 0 && /[\p{L}\p{N}]/u.test(item))
      .flatMap((item) => SentenceSplitterService.splitLongChunk(item));
  }

  private static protectSpecialDots(text: string): string {
    let result = text;

    // Proteger números decimais (ex: 3.14, 1.500, R$ 10.50)
    result = result.replace(/(\d+)\.(\d+)/g, `$1${SentenceSplitterService.DOT_PLACEHOLDER}$2`);

    // Proteger abreviações conhecidas (case-insensitive)
    for (const abbr of SentenceSplitterService.ABBREVIATIONS) {
      const regex = new RegExp(`\\b(${abbr})\\.`, "gi");
      result = result.replace(regex, `$1${SentenceSplitterService.DOT_PLACEHOLDER}`);
    }

    return result;
  }

  private static unprotectSpecialDots(text: string): string {
    return text.replaceAll(SentenceSplitterService.DOT_PLACEHOLDER, ".");
  }

  /**
   * Garante que sentenças não ultrapassem o limite confortável para TTS neurais (320 chars).
   */
  private static splitLongChunk(chunk: string): string[] {
    if (chunk.length <= SentenceSplitterService.MAX_SENTENCE_LENGTH) {
      return [chunk];
    }

    const parts: string[] = [];
    let current = "";

    // Tenta dividir por pontuações secundárias (, ; : -)
    const pieces = chunk.split(/(?<=[,;:—–])\s+/);

    for (const piece of pieces) {
      if (current && (current + " " + piece).length > SentenceSplitterService.MAX_SENTENCE_LENGTH) {
        parts.push(current.trim());
        current = piece;
      } else {
        current = current ? `${current} ${piece}` : piece;
      }
    }

    if (current.trim()) {
      parts.push(current.trim());
    }

    // Fallback para divisão por limites de caracteres caso algum segmento ainda seja grande
    return parts.flatMap((part) => {
      if (part.length <= SentenceSplitterService.MAX_SENTENCE_LENGTH) {
        return [part];
      }
      const regex = new RegExp(`.{1,${SentenceSplitterService.MAX_SENTENCE_LENGTH}}(\\s|$)`, "g");
      const matched = part.match(regex);
      return (matched ?? [part]).map((p) => p.trim()).filter((p) => p.length > 0);
    });
  }
}
