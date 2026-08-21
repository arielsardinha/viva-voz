/**
 * Serviço de domínio puro para cálculo de métricas de leitura e velocidade de fala.
 * Padrão: Domain Service (SOLID - Single Responsibility Principle).
 */
export class ReadingMetricsService {
  private static readonly DEFAULT_WORDS_PER_MINUTE = 150;

  /**
   * Conta o total de palavras em uma string, normalizando quebras e espaçamentos múltiplos.
   */
  public static countWords(text: string): number {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    const tokens = trimmed.split(/\s+/);
    return tokens.filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
  }

  /**
   * Calcula o tempo estimado de leitura em minutos com base na contagem de palavras e WPM.
   */
  public static calculateEstimatedMinutes(
    wordCount: number,
    wpm: number = ReadingMetricsService.DEFAULT_WORDS_PER_MINUTE
  ): number {
    if (wordCount <= 0) return 0;
    const effectiveWpm = wpm > 0 ? wpm : ReadingMetricsService.DEFAULT_WORDS_PER_MINUTE;
    const minutes = Math.ceil(wordCount / effectiveWpm);
    return Math.max(1, minutes);
  }

  /**
   * Calcula a porcentagem de progresso de leitura baseado no índice atual e total de sentenças.
   */
  public static calculateProgress(currentIndex: number, totalSentences: number): number {
    if (totalSentences <= 0) return 0;
    const completed = currentIndex + 1;
    const pct = Math.round((completed / totalSentences) * 100);
    return Math.min(100, Math.max(0, pct));
  }
}
