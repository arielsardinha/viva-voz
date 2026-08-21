import type { HighlightColor, TextHighlight } from "./document-highlight.types";

export interface TextSegment {
  text: string;
  isHighlighted: boolean;
  color?: HighlightColor;
  highlightId?: string;
}

/**
 * Fatia o texto de uma sentença em segmentos normais e destacados com suporte a
 * múltiplos intervalos e resolução de sobreposições (o mais recente prevalece).
 */
export function segmentSentenceText(
  text: string,
  highlights: TextHighlight[] = []
): TextSegment[] {
  if (!text) return [];
  if (!highlights || highlights.length === 0) {
    return [{ text, isHighlighted: false }];
  }

  // Clona e filtra highlights válidos para o tamanho do texto
  const validHighlights = highlights
    .filter((h) => h.startOffset < text.length && h.endOffset > 0 && h.startOffset < h.endOffset)
    .map((h) => ({
      ...h,
      startOffset: Math.max(0, h.startOffset),
      endOffset: Math.min(text.length, h.endOffset),
    }))
    .sort((a, b) => a.startOffset - b.startOffset || b.createdAt - a.createdAt);

  if (validHighlights.length === 0) {
    return [{ text, isHighlighted: false }];
  }

  // Gera pontos de corte ordenados (boundaries)
  const cutPoints = new Set<number>([0, text.length]);
  for (const h of validHighlights) {
    cutPoints.add(h.startOffset);
    cutPoints.add(h.endOffset);
  }

  const sortedPoints = Array.from(cutPoints).sort((a, b) => a - b);
  const rawSegments: TextSegment[] = [];

  for (let i = 0; i < sortedPoints.length - 1; i++) {
    const start = sortedPoints[i];
    const end = sortedPoints[i + 1];
    if (start >= end) continue;

    const subText = text.slice(start, end);
    if (!subText) continue;

    // Encontra o highlight ativo mais recente para este intervalo
    const matchingHighlight = validHighlights
      .filter((h) => h.startOffset <= start && h.endOffset >= end)
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    if (matchingHighlight) {
      rawSegments.push({
        text: subText,
        isHighlighted: true,
        color: matchingHighlight.color,
        highlightId: matchingHighlight.id,
      });
    } else {
      rawSegments.push({
        text: subText,
        isHighlighted: false,
      });
    }
  }

  // Mescla segmentos adjacentes com o mesmo estado e cor
  const mergedSegments: TextSegment[] = [];
  for (const seg of rawSegments) {
    const last = mergedSegments[mergedSegments.length - 1];
    if (
      last &&
      last.isHighlighted === seg.isHighlighted &&
      last.color === seg.color &&
      last.highlightId === seg.highlightId
    ) {
      last.text += seg.text;
    } else {
      mergedSegments.push({ ...seg });
    }
  }

  return mergedSegments;
}

/**
 * Utilitário para sanitizar e mesclar novos highlights em uma lista existente,
 * substituindo trechos sobrescritos pela nova cor.
 */
export function mergeHighlights(
  existingHighlights: TextHighlight[],
  newHighlight: TextHighlight
): TextHighlight[] {
  // Remove highlights que estejam completamente englobados pelo novo
  const filtered = existingHighlights.filter((h) => {
    if (h.sentenceIndex !== newHighlight.sentenceIndex) return true;
    const isFullyCovered =
      h.startOffset >= newHighlight.startOffset && h.endOffset <= newHighlight.endOffset;
    return !isFullyCovered;
  });

  return [...filtered, newHighlight];
}
