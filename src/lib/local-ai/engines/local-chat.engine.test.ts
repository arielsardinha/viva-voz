import {
  LocalModelNotDownloadedError,
  type ChatAttachment,
} from "../domain/local-model.types";
import * as storageService from "../storage/model-storage.service";
import {
  LocalChatEngine,
  type LiteRtConversation,
  type LiteRtEngineInstance,
  type LiteRtMessage,
} from "./local-chat.engine";

jest.mock("../storage/model-storage.service", () => ({
  detectLocalRuntimeSupport: jest.fn(),
  getCachedModelBlob: jest.fn(),
}));

const mockedStorage = storageService as jest.Mocked<typeof storageService>;

describe("LocalChatEngine", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve falhar com mensagem clara se WebGPU não estiver disponível", async () => {
    mockedStorage.detectLocalRuntimeSupport.mockReturnValue({
      webGpuSupported: false,
      cacheApiSupported: true,
      wasmSupported: true,
    });

    const engine = new LocalChatEngine({ loadModule: jest.fn() });
    const iter = engine.streamMultimodalPrompt({ prompt: "Oi" })[Symbol.asyncIterator]();

    await expect(iter.next()).rejects.toThrow(/WebGPU/i);
  });

  it("deve lançar LocalModelNotDownloadedError quando Gemma 4 E2B não estiver baixado", async () => {
    mockedStorage.detectLocalRuntimeSupport.mockReturnValue({
      webGpuSupported: true,
      cacheApiSupported: true,
      wasmSupported: true,
    });
    mockedStorage.getCachedModelBlob.mockResolvedValue(null);

    const engine = new LocalChatEngine({ loadModule: jest.fn() });
    const iter = engine.streamMultimodalPrompt({ prompt: "Resuma" })[Symbol.asyncIterator]();

    await expect(iter.next()).rejects.toThrow(LocalModelNotDownloadedError);
  });

  it("deve enviar texto + imagem + áudio para LiteRT-LM e fazer streaming da resposta em PT-BR", async () => {
    mockedStorage.detectLocalRuntimeSupport.mockReturnValue({
      webGpuSupported: true,
      cacheApiSupported: true,
      wasmSupported: true,
    });
    mockedStorage.getCachedModelBlob.mockResolvedValue(
      new Blob([new Uint8Array([1, 2, 3])]),
    );

    const sentMessages: LiteRtMessage[] = [];
    const mockConversation: LiteRtConversation = {
      sendMessageStreaming: jest.fn((msg: LiteRtMessage) => {
        sentMessages.push(msg);
        return new ReadableStream<LiteRtMessage>({
          start(controller) {
            controller.enqueue({
              role: "model",
              content: [{ type: "text", text: "Resumo local: " }],
            });
            controller.enqueue({
              role: "model",
              content: [{ type: "text", text: "imagem e áudio analisados." }],
            });
            controller.close();
          },
        });
      }),
      cancel: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const mockEngineInstance: LiteRtEngineInstance = {
      createConversation: jest.fn().mockResolvedValue(mockConversation),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    const createMock = jest.fn().mockResolvedValue(mockEngineInstance);

    const engine = new LocalChatEngine({
      loadModule: async () => ({
        Backend: { CPU: 3, GPU: 4 },
        Engine: { create: createMock },
      }),
    });

    const attachments: ChatAttachment[] = [
      {
        id: "img-1",
        type: "image",
        file: new Blob(["png"], { type: "image/png" }),
        name: "grafico.png",
        mimeType: "image/png",
      },
      {
        id: "aud-1",
        type: "audio",
        file: new Blob(["wav"], { type: "audio/wav" }),
        name: "pergunta.wav",
        mimeType: "audio/wav",
      },
    ];

    const chunks: string[] = [];
    for await (const chunk of engine.streamMultimodalPrompt({
      prompt: "Explique o gráfico e o áudio",
      attachments,
      context: "[p.1] Dados de crescimento.",
      fileName: "relatorio.pdf",
    })) {
      chunks.push(chunk);
    }

    expect(chunks.join("")).toBe("Resumo local: imagem e áudio analisados.");
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        backend: 4,
        visionBackend: 4,
        audioBackend: 4,
      }),
    );
    expect(mockEngineInstance.createConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        preface: {
          messages: [
            expect.objectContaining({
              role: "system",
              content: expect.stringContaining("relatorio.pdf"),
            }),
          ],
        },
      }),
    );
    expect(Array.isArray(sentMessages[0]?.content)).toBe(true);
    const parts = sentMessages[0]?.content as Array<{ type: string }>;
    expect(parts.map((p) => p.type)).toEqual(["image", "audio", "text"]);

    await engine.dispose();
    expect(mockConversation.delete).toHaveBeenCalled();
    expect(mockEngineInstance.delete).toHaveBeenCalled();
  });

  it("deve cancelar geração quando AbortSignal for acionado", async () => {
    mockedStorage.detectLocalRuntimeSupport.mockReturnValue({
      webGpuSupported: true,
      cacheApiSupported: true,
      wasmSupported: true,
    });
    mockedStorage.getCachedModelBlob.mockResolvedValue(
      new Blob([new Uint8Array([1])]),
    );

    const controller = new AbortController();
    const cancelSpy = jest.fn();

    const mockConversation: LiteRtConversation = {
      sendMessageStreaming: jest.fn(
        () =>
          new ReadableStream<LiteRtMessage>({
            start(streamCtrl) {
              streamCtrl.enqueue({
                role: "model",
                content: [{ type: "text", text: "Início..." }],
              });
            },
          }),
      ),
      cancel: cancelSpy,
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const engine = new LocalChatEngine({
      loadModule: async () => ({
        Backend: { CPU: 3, GPU: 4 },
        Engine: {
          create: jest.fn().mockResolvedValue({
            createConversation: jest.fn().mockResolvedValue(mockConversation),
            delete: jest.fn().mockResolvedValue(undefined),
          }),
        },
      }),
    });

    const received: string[] = [];
    for await (const chunk of engine.streamMultimodalPrompt({
      prompt: "Teste abort",
      signal: controller.signal,
    })) {
      received.push(chunk);
      controller.abort();
    }

    expect(received).toEqual(["Início..."]);
    expect(cancelSpy).toHaveBeenCalled();
  });
  function setupReadyRuntime() {
    mockedStorage.detectLocalRuntimeSupport.mockReturnValue({
      webGpuSupported: true,
      cacheApiSupported: true,
      wasmSupported: true,
    });
    mockedStorage.getCachedModelBlob.mockResolvedValue(
      new Blob([new Uint8Array([1])]),
    );
  }

  function makeConversation(
    chunks: string[],
    failWith?: Error,
  ): LiteRtConversation {
    return {
      sendMessageStreaming: jest.fn(
        () =>
          {
            const queue = [...chunks];
            return new ReadableStream<LiteRtMessage>({
              pull(ctrl) {
                const text = queue.shift();
                if (text !== undefined) {
                  ctrl.enqueue({ role: "model", content: [{ type: "text", text }] });
                } else if (failWith) {
                  ctrl.error(failWith);
                } else {
                  ctrl.close();
                }
              },
            });
          },
      ),
      cancel: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
    };
  }

  async function collect(iterable: AsyncIterable<string>): Promise<string> {
    let out = "";
    for await (const chunk of iterable) out += chunk;
    return out;
  }

  it("deve usar uma conversa nova a cada pergunta para não estourar a janela de contexto", async () => {
    setupReadyRuntime();
    const first = makeConversation(["Resposta 1"]);
    const second = makeConversation(["Resposta 2"]);
    const createConversation = jest
      .fn()
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second);

    const engine = new LocalChatEngine({
      loadModule: async () => ({
        Backend: { CPU: 3, GPU: 4 },
        Engine: {
          create: jest.fn().mockResolvedValue({
            createConversation,
            delete: jest.fn().mockResolvedValue(undefined),
          }),
        },
      }),
    });

    const params = { context: "[p.1] Texto.", fileName: "doc.pdf" };
    expect(await collect(engine.streamMultimodalPrompt({ prompt: "A", ...params }))).toBe("Resposta 1");
    expect(await collect(engine.streamMultimodalPrompt({ prompt: "B", ...params }))).toBe("Resposta 2");

    expect(createConversation).toHaveBeenCalledTimes(2);
    expect(first.delete).toHaveBeenCalled();
    expect(second.delete).toHaveBeenCalled();
  });

  it("deve encerrar sem erro quando a janela enche após já ter respondido parcialmente", async () => {
    setupReadyRuntime();
    const conv = makeConversation(
      ["Parte da resposta"],
      new Error("Max number of tokens reached, the context window is full."),
    );
    const engine = new LocalChatEngine({
      loadModule: async () => ({
        Backend: { CPU: 3, GPU: 4 },
        Engine: {
          create: jest.fn().mockResolvedValue({
            createConversation: jest.fn().mockResolvedValue(conv),
            delete: jest.fn().mockResolvedValue(undefined),
          }),
        },
      }),
    });

    await expect(collect(engine.streamMultimodalPrompt({ prompt: "X" }))).resolves.toBe(
      "Parte da resposta",
    );
  });

  it("deve lançar erro amigável quando a janela enche antes de qualquer texto", async () => {
    setupReadyRuntime();
    const conv = makeConversation(
      [],
      new Error("Max number of tokens reached, the context window is full."),
    );
    const engine = new LocalChatEngine({
      loadModule: async () => ({
        Backend: { CPU: 3, GPU: 4 },
        Engine: {
          create: jest.fn().mockResolvedValue({
            createConversation: jest.fn().mockResolvedValue(conv),
            delete: jest.fn().mockResolvedValue(undefined),
          }),
        },
      }),
    });

    await expect(collect(engine.streamMultimodalPrompt({ prompt: "X" }))).rejects.toThrow(
      /grande demais para o modelo local/,
    );
  });
});
