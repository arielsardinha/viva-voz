import { renderHook, act, waitFor } from "@testing-library/react";
import { useFirebaseAI, sanitizeClientAIError } from "./useFirebaseAI";

let mockApiKey: string | null = null;
const mockUpdateApiKey = jest.fn((key: string | null) => {
  mockApiKey = key;
  return Promise.resolve(true);
});

jest.mock("./use-gemini-api-key", () => ({
  useGeminiApiKey: () => ({
    apiKey: mockApiKey,
    hasApiKey: Boolean(mockApiKey && mockApiKey.length >= 10),
    maskedKey: mockApiKey ? `${mockApiKey.slice(0, 6)}...` : null,
    isChecking: false,
    updateApiKey: mockUpdateApiKey,
  }),
}));

jest.mock("@/lib/ai/firebase-ai", () => {
  const actual = jest.requireActual("@/lib/ai/firebase-ai");
  return {
    ...actual,
    checkOnDeviceAvailability: jest.fn().mockResolvedValue("available"),
    createHybridGenerativeModel: jest.fn().mockImplementation(() => ({
      generateContentStream: jest.fn().mockImplementation(async () => ({
        stream: (async function* () {
          yield { text: () => "Resposta do assistente" };
        })(),
        response: Promise.resolve({ inferenceSource: "ON_DEVICE" }),
      })),
    })),
  };
});

describe("useFirebaseAI hook", () => {
  beforeEach(() => {
    mockApiKey = null;
    jest.clearAllMocks();
    (window as any).ai = { languageModel: {} };
  });

  afterEach(() => {
    delete (window as any).ai;
  });

  it("deve inicializar com activeEngine 'gemini-nano' quando disponível e sem chave cloud", async () => {
    const { result } = renderHook(() => useFirebaseAI());

    await waitFor(() => {
      expect(result.current.onDeviceStatus).toBe("available");
    });

    expect(result.current.activeEngine).toBe("gemini-nano");
    expect(result.current.apiKey).toBeNull();
  });

  it("deve selecionar 'vertex' quando houver chave de API configurada e estiver online", async () => {
    mockApiKey = "AIzaSyValidTestKey123";

    const { result } = renderHook(() => useFirebaseAI());

    await waitFor(() => {
      expect(result.current.apiKey).toBe("AIzaSyValidTestKey123");
    });

    expect(result.current.activeEngine).toBe("vertex");
  });

  it("deve delegar a persistência de nova chave via setApiKey para updateApiKey", async () => {
    const { result } = renderHook(() => useFirebaseAI());

    await waitFor(() => {
      expect(result.current.onDeviceStatus).toBe("available");
    });

    act(() => {
      result.current.setApiKey("AIzaSyNewKey456");
    });

    expect(mockUpdateApiKey).toHaveBeenCalledWith("AIzaSyNewKey456");
  });

  it("deve remover chave de API quando passada string vazia", async () => {
    mockApiKey = "AIzaSyKeyToRemove";

    const { result } = renderHook(() => useFirebaseAI());

    await waitFor(() => {
      expect(result.current.onDeviceStatus).toBe("available");
    });

    act(() => {
      result.current.setApiKey("");
    });

    expect(mockUpdateApiKey).toHaveBeenCalledWith(null);
  });

  it("deve executar sendMessage e obter chunks de texto", async () => {
    const { result } = renderHook(() => useFirebaseAI());

    await waitFor(() => {
      expect(result.current.onDeviceStatus).toBe("available");
    });

    const chunks: string[] = [];
    await act(async () => {
      const stream = result.current.sendMessage("Resuma o texto", {
        context: "Conteúdo para estudo",
      });
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
    });

    expect(chunks).toContain("Resposta do assistente");
    expect(result.current.isLoading).toBe(false);
  });

  it("deve gerenciar histórico de mensagens com sendPrompt e limpar com clearMessages", async () => {
    const { result } = renderHook(() => useFirebaseAI());

    await waitFor(() => {
      expect(result.current.onDeviceStatus).toBe("available");
    });

    await act(async () => {
      await result.current.sendPrompt("Qual o tema principal?");
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].role).toBe("user");
    expect(result.current.messages[0].content).toBe("Qual o tema principal?");
    expect(result.current.messages[1].role).toBe("assistant");
    expect(result.current.messages[1].content).toBe("Resposta do assistente");
    expect(result.current.messages[1].source).toBe("nano");

    act(() => {
      result.current.clearMessages();
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.status).toBe("idle");
  });

  it("deve chavear para 'gemini-nano' quando offline se nano estiver disponível", async () => {
    mockApiKey = "AIzaSyCloudKey";

    const { result } = renderHook(() => useFirebaseAI());

    await waitFor(() => {
      expect(result.current.apiKey).toBe("AIzaSyCloudKey");
      expect(result.current.onDeviceStatus).toBe("available");
    });

    expect(result.current.activeEngine).toBe("vertex");

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(result.current.isOnline).toBe(false);
    expect(result.current.activeEngine).toBe("gemini-nano");

    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    expect(result.current.isOnline).toBe(true);
    expect(result.current.activeEngine).toBe("vertex");
  });

  it("deve sanitizar erros 403 / Referrer Blocked sem vazar dados brutos de infraestrutura", () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const error403 = new Error(
      "AI: Error fetching from https://firebasevertexai.googleapis.com/...: [403 ] Requests from referer https://viva-voz.vercel.app/ are blocked. API_KEY_HTTP_REFERRER_BLOCKED"
    );
    const sanitized = sanitizeClientAIError(error403);
    expect(sanitized).toContain("Acesso não autorizado ou chave de API recusada");
    expect(sanitized).not.toContain("firebasevertexai.googleapis.com");
    expect(sanitized).not.toContain("API_KEY_HTTP_REFERRER_BLOCKED");
    consoleErrorSpy.mockRestore();
  });

  it("deve sanitizar erros desconhecidos com mensagem amigável padrão", () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const unknownError = new Error("Unexpected internal crash at line 999");
    const sanitized = sanitizeClientAIError(unknownError);
    expect(sanitized).toBe(
      "Não foi possível processar sua solicitação no momento. Já registramos este evento para análise e correção. Por favor, tente novamente em instantes."
    );
    consoleErrorSpy.mockRestore();
  });
});
