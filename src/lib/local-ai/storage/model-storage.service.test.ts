import { getLocalModelById } from "../domain/local-model-catalog";
import { reportLocalAiFailure } from "../diagnostics";

jest.mock("../diagnostics", () => ({
  describeError: (err: unknown) => ({
    name: (err as Error)?.name ?? "Error",
    message: String((err as Error)?.message ?? err),
    cause: null,
  }),
  traceLocalAi: jest.fn(),
  reportLocalAiFailure: jest.fn(async () => undefined),
}));
import type { ModelDownloadProgress } from "../domain/local-model.types";
import {
  deleteCachedModel,
  detectLocalRuntimeSupport,
  downloadAndCacheModel,
  getCachedModelBlob,
  getCachedModelMeta,
  getCachedModelStreamReader,
  getStorageQuotaEstimate,
  ModelStorageQuotaError,
} from "./model-storage.service";

interface MockCacheEntry {
  buffer: ArrayBuffer;
  status: number;
  headers: Headers;
}

function installMockCacheStorage() {
  const stores = new Map<string, Map<string, MockCacheEntry>>();

  const getStore = (name: string): Map<string, MockCacheEntry> => {
    let store = stores.get(name);
    if (!store) {
      store = new Map<string, MockCacheEntry>();
      stores.set(name, store);
    }
    return store;
  };

  const mockCaches: CacheStorage = {
    open: jest.fn(async (cacheName: string) => {
      const store = getStore(cacheName);
      const cache: Cache = {
        match: jest.fn(async (req: RequestInfo | URL) => {
          const key = typeof req === "string" ? req : req.toString();
          const entry = store.get(key);
          if (!entry) return undefined;
          return new Response(entry.buffer.slice(0), {
            status: entry.status,
            headers: new Headers(entry.headers),
          });
        }),
        put: jest.fn(async (req: RequestInfo | URL, res: Response) => {
          const key = typeof req === "string" ? req : req.toString();
          const buffer = await res.arrayBuffer();
          store.set(key, {
            buffer,
            status: res.status,
            headers: new Headers(res.headers),
          });
        }),
        delete: jest.fn(async (req: RequestInfo | URL) => {
          const key = typeof req === "string" ? req : req.toString();
          return store.delete(key);
        }),
        add: jest.fn(),
        addAll: jest.fn(),
        keys: jest.fn(async () => []),
        matchAll: jest.fn(async () => []),
      };
      return cache;
    }),
    has: jest.fn(async (name: string) => stores.has(name)),
    delete: jest.fn(async (name: string) => stores.delete(name)),
    keys: jest.fn(async () => Array.from(stores.keys())),
    match: jest.fn(async () => undefined),
  };

  Object.defineProperty(globalThis, "caches", {
    value: mockCaches,
    writable: true,
    configurable: true,
  });

  return { stores, mockCaches };
}

describe("model-storage.service", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    installMockCacheStorage();
    jest.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("deve detectar suporte de runtime no navegador com segurança", () => {
    const support = detectLocalRuntimeSupport();
    expect(support.cacheApiSupported).toBe(true);
    expect(support.wasmSupported).toBe(typeof WebAssembly !== "undefined");
    expect(typeof support.webGpuSupported).toBe("boolean");
  });

  it("deve baixar modelo em streaming, emitir progresso e persistir na Cache API sem usar IndexedDB", async () => {
    const kokoro = getLocalModelById("kokoro-82m-tts")!;
    const chunkA = new Uint8Array([1, 2, 3, 4]);
    const chunkB = new Uint8Array([5, 6, 7, 8, 9, 10]);

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(chunkA);
        controller.enqueue(chunkB);
        controller.close();
      },
    });

    globalThis.fetch = jest.fn(async () => {
      return new Response(stream, {
        status: 200,
        headers: { "Content-Length": "10" },
      });
    }) as unknown as typeof fetch;

    const progressUpdates: ModelDownloadProgress[] = [];
    const result = await downloadAndCacheModel(kokoro, {
      hasWebGpu: true,
      onProgress: (p) => progressUpdates.push(p),
    });

    expect(result.sizeBytes).toBe(10);
    expect(result.cachedAt).toBeGreaterThan(0);
    expect(progressUpdates.length).toBeGreaterThan(0);
    expect(progressUpdates[progressUpdates.length - 1]?.progressPercent).toBe(100);

    const meta = await getCachedModelMeta("kokoro-82m-tts");
    expect(meta.cached).toBe(true);
    expect(meta.sizeBytes).toBe(10);

    const blob = await getCachedModelBlob("kokoro-82m-tts");
    expect(blob).not.toBeNull();
    expect(blob?.size).toBe(10);

    const reader = await getCachedModelStreamReader("kokoro-82m-tts");
    expect(reader).not.toBeNull();
    await reader?.cancel();

    const deleted = await deleteCachedModel("kokoro-82m-tts");
    expect(deleted).toBe(true);
    expect((await getCachedModelMeta("kokoro-82m-tts")).cached).toBe(false);
  });

  it("deve limpar qualquer entrada parcial e rejeitar se ocorrer erro HTTP >= 400", async () => {
    const kokoro = getLocalModelById("kokoro-82m-tts")!;
    globalThis.fetch = jest.fn(async () => {
      return new Response("Not Found", { status: 404 });
    }) as unknown as typeof fetch;

    await expect(
      downloadAndCacheModel(kokoro, { hasWebGpu: false }),
    ).rejects.toThrow(/não foi possível baixar/i);

    const meta = await getCachedModelMeta("kokoro-82m-tts");
    expect(meta.cached).toBe(false);
  });

  it("deve interromper o download limpo ao acionar AbortController", async () => {
    const kokoro = getLocalModelById("kokoro-82m-tts")!;
    const controller = new AbortController();

    globalThis.fetch = jest.fn((_url, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        if (init?.signal?.aborted) {
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    }) as unknown as typeof fetch;

    const promise = downloadAndCacheModel(kokoro, {
      hasWebGpu: true,
      signal: controller.signal,
    });
    await Promise.resolve();
    controller.abort();

    await expect(promise).rejects.toThrow();
    expect((await getCachedModelMeta("kokoro-82m-tts")).cached).toBe(false);
  });

  it("deve retornar estimativa de cota quando navigator.storage.estimate estiver disponível", async () => {
    Object.defineProperty(navigator, "storage", {
      value: {
        estimate: jest.fn().mockResolvedValue({ usage: 1000, quota: 50000 }),
      },
      configurable: true,
    });
    const quota = await getStorageQuotaEstimate();
    expect(quota).toEqual({ usageBytes: 1000, quotaBytes: 50000 });
  });

  describe("espaço de armazenamento", () => {
    beforeEach(() => {
      Object.defineProperty(navigator, "storage", { value: undefined, configurable: true });
    });

    it("deve apagar o cache antigo do app (vivavoz-app-v1) que guardava cópias do modelo", async () => {
      const { stores } = installMockCacheStorage();
      stores.set("vivavoz-app-v1", new Map());
      globalThis.fetch = jest.fn(async () =>
        new Response(new Uint8Array([1, 2]), {
          status: 200,
          headers: { "Content-Length": "2" },
        }),
      ) as unknown as typeof fetch;

      await downloadAndCacheModel(getLocalModelById("kokoro-82m-tts")!, { hasWebGpu: true });

      expect(stores.has("vivavoz-app-v1")).toBe(false);
    });

    it("deve falhar antes de baixar quando não houver espaço suficiente", async () => {
      Object.defineProperty(navigator, "storage", {
        value: {
          estimate: jest.fn().mockResolvedValue({ usage: 0, quota: 500 * 1024 * 1024 }),
        },
        configurable: true,
      });
      const fetchMock = jest.fn();
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      await expect(
        downloadAndCacheModel(getLocalModelById("gemma-4-e2b-chat")!, { hasWebGpu: true }),
      ).rejects.toBeInstanceOf(ModelStorageQuotaError);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("não deve repetir o bloco quando a Cache API estourar a cota", async () => {
      const { mockCaches } = installMockCacheStorage();
      const originalOpen = mockCaches.open;
      (mockCaches as { open: unknown }).open = jest.fn(async (name: string) => {
        const cache = await originalOpen(name);
        cache.put = jest.fn(async () => {
          throw new DOMException("Quota exceeded", "QuotaExceededError");
        });
        return cache;
      });
      const fetchMock = jest.fn(async () =>
        new Response(new Uint8Array([1, 2, 3, 4]), {
          status: 206,
          headers: { "Content-Range": "bytes 0-3/4", "Content-Length": "4" },
        }),
      );
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      await expect(
        downloadAndCacheModel(getLocalModelById("kokoro-82m-tts")!, { hasWebGpu: true }),
      ).rejects.toBeInstanceOf(ModelStorageQuotaError);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("diagnóstico", () => {
    beforeEach(() => {
      Object.defineProperty(navigator, "storage", { value: undefined, configurable: true });
      jest.useFakeTimers({ advanceTimers: true });
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it("deve repetir o bloco quando o navegador abortar a requisição sem o usuário cancelar", async () => {
      let calls = 0;
      globalThis.fetch = jest.fn(async () => {
        calls += 1;
        if (calls === 1) throw new DOMException("The user aborted a request.", "AbortError");
        return new Response(new Uint8Array([1, 2, 3, 4]), {
          status: 206,
          headers: { "Content-Range": "bytes 0-3/4", "Content-Length": "4" },
        });
      }) as unknown as typeof fetch;

      const result = await downloadAndCacheModel(getLocalModelById("kokoro-82m-tts")!, {
        hasWebGpu: true,
      });

      expect(result.sizeBytes).toBe(4);
      expect(calls).toBe(2);
    });

    it("deve reportar ao Sentry quando um bloco esgotar as tentativas", async () => {
      globalThis.fetch = jest.fn(async () => new Response("x", { status: 404 })) as unknown as typeof fetch;

      await expect(
        downloadAndCacheModel(getLocalModelById("kokoro-82m-tts")!, { hasWebGpu: true }),
      ).rejects.toThrow();

      expect(reportLocalAiFailure).toHaveBeenCalledWith(
        "download_chunk",
        expect.anything(),
        expect.objectContaining({ modelId: "kokoro-82m-tts", httpStatus: 404 }),
      );
    });
  });

  describe("redirect sem Range (iOS/WebKit)", () => {
    beforeEach(() => {
      Object.defineProperty(navigator, "storage", { value: undefined, configurable: true });
    });

    it("deve repetir o bloco direto na URL final do CDN quando o Range for perdido no redirect", async () => {
      const cdnUrl = "https://us.aws.cdn.hf.co/repos/x/model.bin?Expires=1&Signature=abc";
      const urls: string[] = [];
      globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        urls.push(url);
        if (url !== cdnUrl) {
          // WebKit seguiu o redirect sem o Range: arquivo inteiro com 200.
          const full = new Response(new Uint8Array(4096), {
            status: 200,
            headers: { "Content-Length": "2008432640" },
          });
          Object.defineProperty(full, "url", { value: cdnUrl });
          return full;
        }
        return new Response(new Uint8Array([1, 2, 3, 4]), {
          status: 206,
          headers: { "Content-Range": "bytes 0-3/4", "Content-Length": "4" },
        });
      }) as unknown as typeof fetch;

      const result = await downloadAndCacheModel(getLocalModelById("gemma-4-e2b-chat")!, {
        hasWebGpu: true,
      });

      expect(result.sizeBytes).toBe(4);
      expect(urls).toHaveLength(2);
      expect(urls[1]).toBe(cdnUrl);
      expect((await getCachedModelMeta("gemma-4-e2b-chat")).cached).toBe(true);
    });

    it("não deve tentar gravar GBs de uma vez quando o servidor ignorar o Range", async () => {
      const fetchMock = jest.fn(async () =>
        new Response(new Uint8Array(16), {
          status: 200,
          headers: { "Content-Length": "2008432640" },
        }),
      );
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      await expect(
        downloadAndCacheModel(getLocalModelById("gemma-4-e2b-chat")!, { hasWebGpu: true }),
      ).rejects.toThrow(/download em partes/);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect((await getCachedModelMeta("gemma-4-e2b-chat")).cached).toBe(false);
    });
  });

  describe("troca de versão do arquivo do modelo", () => {
    beforeEach(() => {
      Object.defineProperty(navigator, "storage", { value: undefined, configurable: true });
    });

    it("não retoma blocos de outro arquivo e substitui a versão completa anterior", async () => {
      const cache = await caches.open("vivavoz-local-ai-models-v1");
      const key = "https://local-models.vivavoz.internal/models/gemma-4-e2b-chat";
      // Versão antiga completa + um bloco órfão do arquivo antigo (sem origem).
      await cache.put(key, new Response("{}", { headers: { "X-VivaVoz-Chunk-Count": "1" } }));
      await cache.put(
        `${key}/part-0`,
        new Response(new Uint8Array([9, 9, 9, 9]), {
          headers: { "X-VivaVoz-Total-Bytes": "2008432640" },
        }),
      );

      const ranges: string[] = [];
      globalThis.fetch = jest.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
        ranges.push(new Headers(init?.headers).get("Range") ?? "");
        return new Response(new Uint8Array([1, 2, 3, 4]), {
          status: 206,
          headers: { "Content-Range": "bytes 0-3/4", "Content-Length": "4" },
        });
      }) as unknown as typeof fetch;

      const result = await downloadAndCacheModel(getLocalModelById("gemma-4-e2b-chat")!, {
        hasWebGpu: true,
      });

      // Recomeçou do bloco 0 em vez de "retomar" o arquivo antigo.
      expect(ranges[0]).toBe(`bytes=0-${32 * 1024 * 1024 - 1}`);
      expect(result.sizeBytes).toBe(4);
      const reader = await getCachedModelStreamReader("gemma-4-e2b-chat");
      const bytes: number[] = [];
      for (let r = await reader!.read(); !r.done; r = await reader!.read()) {
        bytes.push(...r.value);
      }
      expect(bytes).toEqual([1, 2, 3, 4]);
      const meta = await getCachedModelMeta("gemma-4-e2b-chat");
      expect(meta.sourceUrl).toContain("gemma-4-E2B-it-gpu.litertlm");
    });
  });
});
