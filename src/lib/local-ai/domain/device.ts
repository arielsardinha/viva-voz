/**
 * Detecção do tipo de aparelho para a central de modelos locais.
 * Funções puras sobre `Navigator` (testáveis sem DOM).
 */

/** iPhone, iPod e iPad (inclusive o iPadOS que se apresenta como Mac). */
export function isAppleMobileWebKit(nav?: Navigator): boolean {
  if (!nav) return false;
  const ua = nav.userAgent ?? "";
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  // O iPadOS se apresenta como Mac; o suporte a toque denuncia.
  return /Macintosh/i.test(ua) && (nav.maxTouchPoints ?? 0) > 1;
}

/**
 * Celulares e tablets. Modelos marcados como `desktopOnly` (ex.: Gemma 4 E4B)
 * nunca aparecem nem podem ser baixados nesses aparelhos.
 */
export function isMobileDevice(nav?: Navigator): boolean {
  if (!nav) return false;
  const uaData = (nav as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData;
  if (uaData?.mobile === true) return true;
  if (isAppleMobileWebKit(nav)) return true;
  return /Android|Mobi|Tablet|Silk|Kindle|Opera Mini/i.test(nav.userAgent ?? "");
}
