import { renderHook, act, waitFor } from "@testing-library/react";
import { useFirebaseAI } from "./useFirebaseAI";
import * as firebaseAiModule from "@/lib/ai/firebase-ai";

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
    localStorage.clear();
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
    localStorage.setItem("gemini-api-key", "AIzaSyValidTestKey123");

    const { result } = renderHook(() => useFirebaseAI());

    await waitFor(() => {
      expect(result.current.apiKey).toBe("AIzaSyValidTestKey123");
    });

    expect(result.current.activeEngine).toBe("vertex");
  });

  it("deve salvar nova chave de API no localStorage via setApiKey", async () => {
    const { result } = renderHook(() => useFirebaseAI());

    await waitFor(() => {
      expect(result.current.onDeviceStatus).toBe("available");
    });

    act(() => {
      result.current.setApiKey("AIzaSyNewKey456");
    });

    expect(result.current.apiKey).toBe("AIzaSyNewKey456");
    expect(localStorage.getItem("gemini-api-key")).toBe("AIzaSyNewKey456");
  });

  it("deve remover chave de API quando passada string vazia", async () => {
    localStorage.setItem("gemini-api-key", "AIzaSyKeyToRemove");

    const { result } = renderHook(() => useFirebaseAI());

    await waitFor(() => {
      expect(result.current.onDeviceStatus).toBe("available");
    });

    act(() => {
      result.current.setApiKey("");
    });

    expect(result.current.apiKey).toBeNull();
    expect(localStorage.getItem("gemini-api-key")).toBeNull();
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
    localStorage.setItem("gemini-api-key", "AIzaSyCloudKey");

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
});
