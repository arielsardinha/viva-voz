import type { Sentence } from "@/lib/pdf-text";
import {
  DEFAULT_TTS_CHUNK_OPTIONS,
  findBlockForSentence,
  findSentenceAtRatio,
  getSentenceStartRatio,
  planTtsAudioBlocks,
} from "./tts-chunk-planner";

describe("TtsChunkPlanner", () => {
  it("deve retornar array vazio quando não houver sentenças", () => {
    expect(planTtsAudioBlocks([])).toEqual([]);
  });

  it("deve agrupar sentenças curtas consecutivas da mesma página respeitando firstBlockMaxChars e maxBlockChars", () => {
    const sentences: Sentence[] = [
      { index: 0, page: 1, text: "A".repeat(150) },
      { index: 1, page: 1, text: "B".repeat(150) }, // 150 + 1 + 150 = 301 <= 360 -> mesmo bloco 0
      { index: 2, page: 1, text: "C".repeat(100) }, // excede 360 -> abre bloco 1
      { index: 3, page: 1, text: "D".repeat(300) }, // 100 + 1 + 300 = 401 <= 900 -> mesmo bloco 1
      { index: 4, page: 1, text: "E".repeat(450) }, // 401 + 1 + 450 = 852 <= 900 -> mesmo bloco 1
      { index: 5, page: 1, text: "F".repeat(100) }, // excede 900 -> abre bloco 2
    ];

    const blocks = planTtsAudioBlocks(sentences);
    expect(DEFAULT_TTS_CHUNK_OPTIONS.firstBlockMaxChars).toBe(360);
    expect(DEFAULT_TTS_CHUNK_OPTIONS.maxBlockChars).toBe(900);
    expect(blocks).toHaveLength(3);

    expect(blocks[0]).toMatchObject({
      blockIndex: 0,
      startSentenceIndex: 0,
      endSentenceIndex: 1,
      sentenceIndices: [0, 1],
      page: 1,
    });
    expect(blocks[1]).toMatchObject({
      blockIndex: 1,
      startSentenceIndex: 2,
      endSentenceIndex: 4,
      sentenceIndices: [2, 3, 4],
      page: 1,
    });
    expect(blocks[2]).toMatchObject({
      blockIndex: 2,
      startSentenceIndex: 5,
      endSentenceIndex: 5,
      sentenceIndices: [5],
      page: 1,
    });
  });

  it("não deve cruzar fronteiras de página ao agrupar sentenças", () => {
    const sentences: Sentence[] = [
      { index: 0, page: 1, text: "Frase curta página um." },
      { index: 1, page: 1, text: "Outra frase página um." },
      { index: 2, page: 2, text: "Primeira frase página dois." },
    ];

    const blocks = planTtsAudioBlocks(sentences);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].sentenceIndices).toEqual([0, 1]);
    expect(blocks[0].page).toBe(1);
    expect(blocks[1].sentenceIndices).toEqual([2]);
    expect(blocks[1].page).toBe(2);
  });

  it("deve manter sentença única maior que o limite sem truncar texto", () => {
    const huge = "Palavra ".repeat(70).trim(); // > 360 chars
    const sentences: Sentence[] = [
      { index: 0, page: 1, text: huge },
      { index: 1, page: 1, text: "Frase seguinte." },
    ];

    const blocks = planTtsAudioBlocks(sentences);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].text).toBe(huge);
    expect(blocks[0].sentenceIndices).toEqual([0]);
    expect(blocks[1].sentenceIndices).toEqual([1]);
  });

  it("deve calcular charOffsets proporcionais contínuos de 0 a 1 e localizar sentença por ratio e seek", () => {
    const sentences: Sentence[] = [
      { index: 0, page: 1, text: "1234" }, // 4 chars -> 20%
      { index: 1, page: 1, text: "123456" }, // 6 chars -> 30% (0.2 -> 0.5)
      { index: 2, page: 1, text: "1234567890" }, // 10 chars -> 50% (0.5 -> 1.0)
    ];

    const blocks = planTtsAudioBlocks(sentences);
    expect(blocks).toHaveLength(1);
    const block = blocks[0];

    expect(block.charOffsets).toHaveLength(3);
    expect(block.charOffsets[0].startRatio).toBe(0);
    expect(block.charOffsets[0].endRatio).toBeCloseTo(0.2, 5);
    expect(block.charOffsets[1].startRatio).toBeCloseTo(0.2, 5);
    expect(block.charOffsets[1].endRatio).toBeCloseTo(0.5, 5);
    expect(block.charOffsets[2].startRatio).toBeCloseTo(0.5, 5);
    expect(block.charOffsets[2].endRatio).toBe(1);

    expect(findSentenceAtRatio(block, -0.5)).toBe(0);
    expect(findSentenceAtRatio(block, 0)).toBe(0);
    expect(findSentenceAtRatio(block, 0.25)).toBe(1);
    expect(findSentenceAtRatio(block, 0.75)).toBe(2);
    expect(findSentenceAtRatio(block, 1)).toBe(2);
    expect(findSentenceAtRatio(block, 1.5)).toBe(2);

    expect(getSentenceStartRatio(block, 0)).toBe(0);
    expect(getSentenceStartRatio(block, 1)).toBeCloseTo(0.2, 5);
    expect(getSentenceStartRatio(block, 2)).toBeCloseTo(0.5, 5);
    expect(getSentenceStartRatio(block, 99)).toBe(0);
  });

  it("deve localizar o bloco correspondente pelo sentenceIndex em findBlockForSentence", () => {
    const sentences: Sentence[] = [
      { index: 0, page: 1, text: "P1 S0" },
      { index: 1, page: 1, text: "P1 S1" },
      { index: 2, page: 2, text: "P2 S2" },
    ];
    const blocks = planTtsAudioBlocks(sentences);

    expect(findBlockForSentence([], 0)).toBeNull();
    expect(findBlockForSentence(blocks, 0)?.blockIndex).toBe(0);
    expect(findBlockForSentence(blocks, 1)?.blockIndex).toBe(0);
    expect(findBlockForSentence(blocks, 2)?.blockIndex).toBe(1);
    expect(findBlockForSentence(blocks, 99)?.blockIndex).toBe(1);
    expect(findBlockForSentence(blocks, -1)?.blockIndex).toBe(0);
  });
});
