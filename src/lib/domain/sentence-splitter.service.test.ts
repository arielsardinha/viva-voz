import { SentenceSplitterService } from "./sentence-splitter.service";

describe("SentenceSplitterService", () => {
  it("deve dividir texto simples em frases respeitando pontuação final", () => {
    const text = "Olá mundo! Este é o VivaVoz. Ele converte documentos em áudio?";
    const sentences = SentenceSplitterService.split(text);
    expect(sentences).toEqual([
      "Olá mundo!",
      "Este é o VivaVoz.",
      "Ele converte documentos em áudio?",
    ]);
  });

  it("não deve quebrar frases em abreviações comuns (Dr., Sr., etc., pág.)", () => {
    const text = "O Dr. Silva e a Sra. Maria foram ao evento com o Prof. Carlos etc. Foi ótimo.";
    const sentences = SentenceSplitterService.split(text);
    expect(sentences).toEqual([
      "O Dr. Silva e a Sra. Maria foram ao evento com o Prof. Carlos etc. Foi ótimo.",
    ]);
  });

  it("não deve quebrar frases em valores monetários e números com ponto", () => {
    const text = "O produto custa R$ 199.90 ou U$ 50.00 na versão 2.0. Vale a pena!";
    const sentences = SentenceSplitterService.split(text);
    expect(sentences).toEqual([
      "O produto custa R$ 199.90 ou U$ 50.00 na versão 2.0.",
      "Vale a pena!",
    ]);
  });

  it("deve respeitar aspas e parênteses no final da frase", () => {
    const text = 'Ele disse: "A tecnologia é fantástica!" e sorriu. (Veja mais).';
    const sentences = SentenceSplitterService.split(text);
    expect(sentences.length).toBeGreaterThanOrEqual(1);
    expect(sentences[0]).toContain("tecnologia é fantástica!");
  });

  it("deve dividir chunks longos (> 320 caracteres) em pontos lógicos de pausa", () => {
    const longChunk =
      "Esta é uma frase extremamente longa, criada intencionalmente para ultrapassar o limite padrão de trezentos e vinte caracteres estipulado para a síntese neural de voz, contendo diversas vírgulas, pausas naturais, observações complementares e explicações adicionais; dessa forma garantimos que o sintetizador de áudio não sofra com estouro de buffer, falhas de streaming ou cortes abruptos na fala.";
    expect(longChunk.length).toBeGreaterThan(320);

    const result = SentenceSplitterService.split(longChunk);
    expect(result.length).toBeGreaterThan(1);
    for (const chunk of result) {
      expect(chunk.length).toBeLessThanOrEqual(320);
    }
  });

  it("deve retornar array vazio para textos sem caracteres válidos", () => {
    expect(SentenceSplitterService.split("")).toEqual([]);
    expect(SentenceSplitterService.split("   \n\t  -  ")).toEqual([]);
  });
});
