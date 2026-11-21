import * as storageService from "../storage/model-storage.service";
import {
  LocalChatEngine,
  isAppleMobileWebKit,
  resolveLocalChatProfile,
  type LiteRtConversation,
  type LiteRtEngineInstance,
} from "./local-chat.engine";

jest.mock("../storage/model-storage.service", () => ({
  detectLocalRuntimeSupport: jest.fn(),
  getCachedModelBlob: jest.fn(),
}));

const mockedStorage = storageService as jest.Mocked<typeof storageService>;

const IPHONE_CHROME_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/138.0.0.0 Mobile/15E148 Safari/604.1";
const IPAD_DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15";
const WINDOWS_CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";

function fakeNavigator(ua: string, extra: Record<string, unknown> = {}): Navigator {
  return { userAgent: ua, maxTouchPoints: 0, ...extra } as unknown as Navigator;
}

describe("perfil do chat local", () => {
  it("usa o perfil leve (só texto, 2048 tokens) no iPhone, inclusive no Chrome do iOS", () => {
    const profile = resolveLocalChatProfile(fakeNavigator(IPHONE_CHROME_UA));
    expect(profile).toMatchObject({ name: "lite", maxNumTokens: 2048, multimodal: false });
  });

  it("reconhece o iPad que se apresenta como Mac pelo suporte a toque", () => {
    expect(isAppleMobileWebKit(fakeNavigator(IPAD_DESKTOP_UA, { maxTouchPoints: 5 }))).toBe(true);
    expect(isAppleMobileWebKit(fakeNavigator(IPAD_DESKTOP_UA))).toBe(false);
  });

  it("usa o perfil leve em aparelhos com 4 GB de RAM ou menos", () => {
    const profile = resolveLocalChatProfile(
      fakeNavigator(WINDOWS_CHROME_UA, { deviceMemory: 4 }),
    );
    expect(profile.name).toBe("lite");
  });

  it("mantém o perfil completo no desktop", () => {
    const profile = resolveLocalChatProfile(
      fakeNavigator(WINDOWS_CHROME_UA, { deviceMemory: 8 }),
    );
    expect(profile).toMatchObject({ name: "full", maxNumTokens: 4096, multimodal: true });
  });
});

describe("LocalChatEngine no iPhone", () => {
  const originalUa = navigator.userAgent;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window.navigator, "userAgent", {
      value: IPHONE_CHROME_UA,
      configurable: true,
    });
    window.localStorage.clear();
    mockedStorage.detectLocalRuntimeSupport.mockReturnValue({
      webGpuSupported: true,
      cacheApiSupported: true,
      wasmSupported: true,
    });
    mockedStorage.getCachedModelBlob.mockResolvedValue(new Blob([new Uint8Array([1])]));
  });

  afterEach(() => {
    Object.defineProperty(window.navigator, "userAgent", {
      value: originalUa,
      configurable: true,
    });
  });

  function buildEngine() {
    const conversation: LiteRtConversation = {
      sendMessageStreaming: jest.fn(
        () =>
          new ReadableStream({
            start(controller) {
              controller.enqueue({ role: "model", content: "ok" });
              controller.close();
            },
          }),
      ),
      cancel: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    const instance: LiteRtEngineInstance = {
      createConversation: jest.fn().mockResolvedValue(conversation),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    const create = jest.fn().mockResolvedValue(instance);
    const engine = new LocalChatEngine({
      loadModule: async () => ({ Backend: { CPU: 3, GPU: 4 }, Engine: { create } }),
    });
    return { engine, create };
  }

  it("cria o motor só com texto e janela de 2048 tokens, sem visão/áudio na GPU", async () => {
    const { engine, create } = buildEngine();

    const chunks: string[] = [];
    for await (const c of engine.streamMultimodalPrompt({ prompt: "Resuma" })) chunks.push(c);

    expect(chunks.join("")).toBe("ok");
    expect(create).toHaveBeenCalledTimes(1);
    const settings = create.mock.calls[0][0];
    expect(settings.mainExecutorSettings).toEqual({ maxNumTokens: 2048 });
    expect(settings).not.toHaveProperty("visionBackend");
    expect(settings).not.toHaveProperty("audioBackend");
    // A etapa terminou: o marcador de travamento foi limpo.
    expect(window.localStorage.getItem("vivavoz-local-ai-risky-stage")).toBeNull();
  });

  it("recusa anexos com mensagem clara em vez de carregar o modelo multimodal", async () => {
    const { engine, create } = buildEngine();
    const iter = engine
      .streamMultimodalPrompt({
        prompt: "O que tem na imagem?",
        attachments: [
          {
            id: "1",
            type: "image",
            file: new Blob(["x"]),
            name: "a.png",
            mimeType: "image/png",
          },
        ],
      })
      [Symbol.asyncIterator]();

    await expect(iter.next()).rejects.toThrow(/só com texto/);
    expect(create).not.toHaveBeenCalled();
  });
});
