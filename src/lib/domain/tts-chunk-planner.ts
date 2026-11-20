import type { Sentence } from "@/lib/pdf-text";

export interface SentenceTimeOffset {
  readonly sentenceIndex: number;
  readonly startRatio: number;
  readonly endRatio: number;
}

export interface TtsAudioBlock {
  readonly blockIndex: number;
  readonly startSentenceIndex: number;
  readonly endSentenceIndex: number;
  readonly sentenceIndices: readonly number[];
  readonly page: number;
  readonly text: string;
  readonly charOffsets: readonly SentenceTimeOffset[];
}

export interface TtsChunkOptions {
  readonly firstBlockMaxChars?: number;
  readonly maxBlockChars?: number;
}

export const DEFAULT_TTS_CHUNK_OPTIONS = {
  firstBlockMaxChars: 360,
  maxBlockChars: 900,
} as const;

function buildCharOffsets(group: readonly Sentence[]): SentenceTimeOffset[] {
  const weights = group.map((sentence) => Math.max(1, sentence.text.trim().length));
  const total = weights.reduce((sum, weight) => sum + weight, 0);

  let accumulated = 0;
  return group.map((sentence, idx) => {
    const startRatio = idx === 0 ? 0 : accumulated / total;
    accumulated += weights[idx];
    const endRatio = idx === group.length - 1 ? 1 : accumulated / total;
    return {
      sentenceIndex: sentence.index,
      startRatio,
      endRatio,
    };
  });
}

function finalizeBlock(blockIndex: number, group: readonly Sentence[], text: string): TtsAudioBlock {
  return {
    blockIndex,
    startSentenceIndex: group[0].index,
    endSentenceIndex: group[group.length - 1].index,
    sentenceIndices: group.map((item) => item.index),
    page: group[0].page,
    text,
    charOffsets: buildCharOffsets(group),
  };
}

/**
 * Agrupa sentenças consecutivas da mesma página em blocos otimizados para o Gemini TTS.
 */
export function planTtsAudioBlocks(
  sentences: readonly Sentence[],
  options: TtsChunkOptions = {},
): TtsAudioBlock[] {
  if (sentences.length === 0) return [];

  const firstMax = options.firstBlockMaxChars ?? DEFAULT_TTS_CHUNK_OPTIONS.firstBlockMaxChars;
  const regularMax = options.maxBlockChars ?? DEFAULT_TTS_CHUNK_OPTIONS.maxBlockChars;
  const blocks: TtsAudioBlock[] = [];

  let group: Sentence[] = [];
  let currentText = "";

  for (const sentence of sentences) {
    const trimmed = sentence.text.trim();
    const limit = blocks.length === 0 ? firstMax : regularMax;
    const samePage = group.length > 0 && group[0].page === sentence.page;
    const candidateText = currentText ? `${currentText} ${trimmed}` : trimmed;

    if (group.length > 0 && (!samePage || candidateText.length > limit)) {
      blocks.push(finalizeBlock(blocks.length, group, currentText));
      group = [sentence];
      currentText = trimmed;
    } else {
      group.push(sentence);
      currentText = candidateText;
    }
  }

  if (group.length > 0) {
    blocks.push(finalizeBlock(blocks.length, group, currentText));
  }

  return blocks;
}

/**
 * Localiza o bloco de áudio correspondente a um índice de sentença.
 */
export function findBlockForSentence(
  blocks: readonly TtsAudioBlock[],
  sentenceIndex: number,
): TtsAudioBlock | null {
  if (blocks.length === 0) return null;

  for (const block of blocks) {
    if (sentenceIndex >= block.startSentenceIndex && sentenceIndex <= block.endSentenceIndex) {
      return block;
    }
  }

  if (sentenceIndex < blocks[0].startSentenceIndex) {
    return blocks[0];
  }
  return blocks[blocks.length - 1];
}

/**
 * Mapeia o progresso relativo (0..1) do áudio reproduzido para a sentença ativa no bloco.
 */
export function findSentenceAtRatio(block: TtsAudioBlock, ratio: number): number {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0));
  if (clamped >= 1) return block.endSentenceIndex;

  for (const offset of block.charOffsets) {
    if (clamped < offset.endRatio) {
      return offset.sentenceIndex;
    }
  }
  return block.endSentenceIndex;
}

/**
 * Retorna a fração inicial (0..1) correspondente a uma sentença específica dentro do bloco.
 */
export function getSentenceStartRatio(block: TtsAudioBlock, sentenceIndex: number): number {
  const found = block.charOffsets.find((offset) => offset.sentenceIndex === sentenceIndex);
  return found ? found.startRatio : 0;
}
