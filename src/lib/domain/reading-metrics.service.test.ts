import { ReadingMetricsService } from "./reading-metrics.service";

describe("ReadingMetricsService", () => {
  it("deve contar palavras corretamente ignorando múltiplos espaços e quebras", () => {
    const text = "   O VivaVoz converte   textos em   áudio natural com IA!  \n\n  Segunda linha. ";
    const count = ReadingMetricsService.countWords(text);
    expect(count).toBe(11);
  });

  it("deve retornar 0 para textos vazios ou somente espaços", () => {
    expect(ReadingMetricsService.countWords("")).toBe(0);
    expect(ReadingMetricsService.countWords("   \n\t  ")).toBe(0);
  });

  it("deve calcular o tempo estimado de leitura em minutos com base no WPM padrão (150)", () => {
    // 300 palavras a 150 WPM = 2 minutos
    const minutes = ReadingMetricsService.calculateEstimatedMinutes(300);
    expect(minutes).toBe(2);
  });

  it("deve retornar no mínimo 1 minuto para textos com palavras", () => {
    const minutes = ReadingMetricsService.calculateEstimatedMinutes(10);
    expect(minutes).toBe(1);
  });

  it("deve retornar 0 minutos para 0 palavras", () => {
    expect(ReadingMetricsService.calculateEstimatedMinutes(0)).toBe(0);
  });

  it("deve calcular a porcentagem de progresso de leitura entre 0% e 100%", () => {
    expect(ReadingMetricsService.calculateProgress(0, 10)).toBe(10); // 1ª frase concluída de 10 = 10%
    expect(ReadingMetricsService.calculateProgress(4, 10)).toBe(50); // 5 de 10 = 50%
    expect(ReadingMetricsService.calculateProgress(9, 10)).toBe(100);
    expect(ReadingMetricsService.calculateProgress(0, 0)).toBe(0);
  });
});
