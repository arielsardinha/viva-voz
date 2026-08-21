/**
 * Utilitário de cópia resiliente para a área de transferência.
 * Suporta Clipboard API moderna e fallback com document.execCommand para ambientes restritos, HTTP,
 * modais com focus-trap e navegadores embutidos/mobile.
 */
export async function copyToClipboard(
  text: string,
  container?: HTMLElement | null
): Promise<boolean> {
  if (!text) return false;

  // 1. Tenta API moderna do Clipboard se estiver disponível
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Falhou na API moderna (permissão, contexto não seguro ou iframe), tenta o fallback síncrono
    }
  }

  // 2. Fallback robusto via textarea
  if (typeof document !== "undefined") {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      // Estilos para evitar rolagem, zoom no iOS e não interferir no layout
      textarea.style.position = "fixed";
      textarea.style.top = "0";
      textarea.style.left = "0";
      textarea.style.width = "2em";
      textarea.style.height = "2em";
      textarea.style.padding = "0";
      textarea.style.border = "none";
      textarea.style.outline = "none";
      textarea.style.boxShadow = "none";
      textarea.style.background = "transparent";
      textarea.style.opacity = "0.01";
      textarea.style.pointerEvents = "none";
      textarea.style.zIndex = "-1";

      // Anexa dentro do container do modal ativo se fornecido, para não quebrar o focus-trap do Radix
      const targetParent =
        container ||
        (typeof document.querySelector === "function"
          ? document.querySelector("[role='dialog']")
          : null) ||
        document.body;

      targetParent.appendChild(textarea);

      textarea.focus({ preventScroll: true });
      textarea.select();
      textarea.setSelectionRange(0, text.length);

      let successful = false;
      try {
        successful = document.execCommand("copy");
      } catch {
        successful = false;
      }

      if (textarea.parentNode) {
        textarea.parentNode.removeChild(textarea);
      }
      return successful;
    } catch (err) {
      console.error("Falha no fallback de cópia:", err);
      return false;
    }
  }

  return false;
}
