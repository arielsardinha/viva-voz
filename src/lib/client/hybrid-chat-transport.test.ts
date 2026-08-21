import * as chromeAi from "./chrome-ai";
import type { UIMessage } from "ai";

jest.mock("./chrome-ai", () => ({
  checkChromeAiAvailability: jest.fn(),
  streamChromeAiPrompt: jest.fn(),
}));

// Mock do módulo 'ai' para compatibilidade com Jest / CommonJS
const mockDefaultSendMessages = jest.fn();
jest.mock("ai", () => ({
  DefaultChatTransport: jest.fn().mockImplementation(() => ({
    sendMessages: mockDefaultSendMessages,
  })),
}));

import { HybridChatTransport } from "./hybrid-chat-transport";

describe("HybridChatTransport", () => {
  const mockCheckChromeAiAvailability = chromeAi.checkChromeAiAvailability as jest.Mock;
  const mockStreamChromeAiPrompt = chromeAi.streamChromeAiPrompt as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve usar o DefaultChatTransport quando houver userApiKey", async () => {
    mockCheckChromeAiAvailability.mockResolvedValue("readily");
    const mockStream = new ReadableStream();
    mockDefaultSendMessages.mockResolvedValue(mockStream);

    const onEngineChange = jest.fn();

    const transport = new HybridChatTransport({
      api: "/api/ask",
      context: "Contexto do documento",
      userApiKey: "chave-valida-teste",
      onEngineChange,
    });

    const messages: UIMessage[] = [
      { id: "1", role: "user", parts: [{ type: "text", text: "Resuma o texto" }] },
    ];

    const result = await transport.sendMessages({
      trigger: "submit-message",
      chatId: "test-chat",
      messageId: undefined,
      messages,
      abortSignal: undefined,
    });

    expect(result).toBe(mockStream);
    expect(onEngineChange).toHaveBeenCalledWith("cloud");
    expect(mockStreamChromeAiPrompt).not.toHaveBeenCalled();
  });

  it("deve usar o Chrome Built-in AI local quando não houver userApiKey e o Chrome AI estiver 'readily'", async () => {
    mockCheckChromeAiAvailability.mockResolvedValue("readily");
    mockStreamChromeAiPrompt.mockImplementation(async ({ onChunk }) => {
      onChunk("Resposta da ");
      onChunk("Resposta da IA local");
      return "Resposta da IA local";
    });

    const onEngineChange = jest.fn();

    const transport = new HybridChatTransport({
      api: "/api/ask",
      context: "Contexto de teste",
      userApiKey: null,
      onEngineChange,
    });

    const messages: UIMessage[] = [
      { id: "1", role: "user", parts: [{ type: "text", text: "Qual a ideia principal?" }] },
    ];

    const stream = await transport.sendMessages({
      trigger: "submit-message",
      chatId: "test-chat",
      messageId: undefined,
      messages,
      abortSignal: undefined,
    });

    expect(onEngineChange).toHaveBeenCalledWith("local");
    expect(stream).toBeInstanceOf(ReadableStream);

    const reader = stream.getReader();
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    expect(chunks.some((c) => c.type === "text-start")).toBe(true);
    expect(chunks.some((c) => c.type === "text-delta")).toBe(true);
    expect(chunks.some((c) => c.type === "text-end")).toBe(true);
    expect(mockStreamChromeAiPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "Qual a ideia principal?",
        context: "Contexto de teste",
      }),
    );
  });
});
