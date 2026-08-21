import { splitIntoSentences, extractSentencesFromPdf } from "./pdf-text";

// Mock do pdfjs-dist
jest.mock("pdfjs-dist", () => ({
  version: "4.0.0",
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: jest.fn().mockImplementation(() => ({
    promise: Promise.resolve({
      numPages: 2,
      getPage: jest.fn().mockImplementation((pageNumber: number) =>
        Promise.resolve({
          getTextContent: jest.fn().mockResolvedValue({
            items:
              pageNumber === 1
                ? [
                    { str: "Primeira frase da página 1. ", hasEOL: true },
                    { str: "Segunda frase da página 1!", hasEOL: false },
                  ]
                : [
                    { str: "Terceira frase na página 2? ", hasEOL: false },
                    { str: "Quarta frase aqui.", hasEOL: true },
                  ],
          }),
        })
      ),
    }),
  })),
}));

describe("splitIntoSentences", () => {
  it("deve retornar um array vazio para strings vazias ou apenas espaços", () => {
    expect(splitIntoSentences("")).toEqual([]);
    expect(splitIntoSentences("   \n\t  ")).toEqual([]);
  });

  it("deve dividir o texto em frases com base em pontos finais, exclamação e interrogação", () => {
    const text = "Olá mundo! Como você está? Esta é uma frase de teste. E aqui temos outra...";
    const result = splitIntoSentences(text);

    expect(result).toHaveLength(4);
    expect(result[0]).toBe("Olá mundo!");
    expect(result[1]).toBe("Como você está?");
    expect(result[2]).toBe("Esta é uma frase de teste.");
    expect(result[3]).toBe("E aqui temos outra...");
  });

  it("deve remover hifenizações de final de linha e normalizar espaços", () => {
    const text = "Este é um texto com pa-\n lavra quebrada e    muitos   espaços.";
    const result = splitIntoSentences(text);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe("Este é um texto com palavra quebrada e muitos espaços.");
  });

  it("deve ignorar trechos sem caracteres alfanuméricos válidos", () => {
    const text = "... --- ... Olá! *** ???";
    const result = splitIntoSentences(text);

    expect(result).toEqual(["Olá!"]);
  });

  it("deve quebrar frases muito longas (>320 caracteres) em trechos menores pelas pontuações intermediárias", () => {
    const longChunk =
      "Esta é uma frase deliberadamente longa desenvolvida para exceder o limite de trezentos e vinte caracteres, contendo múltiplos segmentos pontuados por vírgulas, que devem ser divididos de maneira inteligente pelo algoritmo de segmentação de texto, permitindo que a síntese de voz processe o conteúdo sem travamentos, com excelente fluidez e ritmo de leitura natural para o usuário final.";
    
    expect(longChunk.length).toBeGreaterThan(320);

    const result = splitIntoSentences(longChunk);
    expect(result.length).toBeGreaterThan(1);
    result.forEach((part) => {
      expect(part.length).toBeLessThanOrEqual(320);
    });
  });

  it("deve quebrar blocos longos contendo palavras e espaços respeitando o limite", () => {
    const longTextWithWords = "palavra ".repeat(60); // 480 caracteres
    const result = splitIntoSentences(longTextWithWords);

    expect(result.length).toBeGreaterThanOrEqual(2);
    result.forEach((part) => {
      expect(part.length).toBeLessThanOrEqual(320);
    });
  });
});

describe("extractSentencesFromPdf", () => {
  it("deve extrair frases de todas as páginas do PDF e calcular o total de páginas", async () => {
    const mockFile = new File(["fake pdf content"], "teste.pdf", {
      type: "application/pdf",
    });
    mockFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(16));

    const progressMock = jest.fn();
    const result = await extractSentencesFromPdf(mockFile, progressMock);

    expect(result.pageCount).toBe(2);
    expect(result.sentences).toHaveLength(4);
    expect(result.sentences[0]).toEqual({
      index: 0,
      page: 1,
      text: "Primeira frase da página 1.",
    });
    expect(result.sentences[1]).toEqual({
      index: 1,
      page: 1,
      text: "Segunda frase da página 1!",
    });
    expect(result.sentences[2]).toEqual({
      index: 2,
      page: 2,
      text: "Terceira frase na página 2?",
    });
    expect(result.sentences[3]).toEqual({
      index: 3,
      page: 2,
      text: "Quarta frase aqui.",
    });

    expect(progressMock).toHaveBeenCalledTimes(2);
    expect(progressMock).toHaveBeenNthCalledWith(1, 1, 2);
    expect(progressMock).toHaveBeenNthCalledWith(2, 2, 2);
  });
});
