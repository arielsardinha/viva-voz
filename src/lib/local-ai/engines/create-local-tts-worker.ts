/**
 * Isolado em módulo próprio (e importado sob demanda) porque `import.meta.url`
 * só é necessário no navegador: o Jest nunca carrega este arquivo.
 */
export function createLocalTtsWorker(): Worker | null {
  if (typeof window === "undefined" || typeof Worker === "undefined") return null;
  return new Worker(new URL("./local-tts.worker.ts", import.meta.url), {
    type: "module",
    name: "vivavoz-local-tts",
  });
}
