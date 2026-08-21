import {
  checkChromeAiAvailability,
  streamChromeAiPrompt,
} from "./chrome-ai";

describe("Chrome Built-in AI (Prompt API)", () => {
  const originalWindow = global.window;

  afterEach(() => {
    delete (window as unknown as { ai?: unknown }).ai;
    delete (globalThis as unknown as { ai?: unknown }).ai;
  });

  describe("checkChromeAiAvailability", () => {
    it("deve retornar 'no' quando window.ai não estiver disponível", async () => {
      const status = await checkChromeAiAvailability();
      expect(status).toBe("no");
    });

    it("deve retornar 'readily' quando a API relatar prontidão", async () => {
      window.ai = {
        languageModel: {
          capabilities: jest.fn().mockResolvedValue({ available: "readily" }),
          create: jest.fn(),
        },
      };

      const status = await checkChromeAiAvailability();
      expect(status).toBe("readily");
    });

    it("deve retornar 'readily' quando a API relatar prontidão via availability()", async () => {
      window.ai = {
        languageModel: {
          availability: jest.fn().mockResolvedValue("readily"),
          create: jest.fn(),
        } as unknown as Parameters<typeof checkChromeAiAvailability>[never],
      };

      const status = await checkChromeAiAvailability();
      expect(status).toBe("readily");
    });

    it("deve suportar window.ai.assistant como fallback legado", async () => {
      window.ai = {
        assistant: {
          capabilities: jest.fn().mockResolvedValue({ available: "readily" }),
          create: jest.fn(),
        },
      };

      const status = await checkChromeAiAvailability();
      expect(status).toBe("readily");
    });

    it("deve retornar 'no' caso ocorra um erro ao consultar capabilities", async () => {
      window.ai = {
        languageModel: {
          capabilities: jest.fn().mockRejectedValue(new Error("API desabilitada")),
          create: jest.fn(),
        },
      };

      const status = await checkChromeAiAvailability();
      expect(status).toBe("no");
    });
  });

  describe("streamChromeAiPrompt", () => {
    it("deve lançar erro se a API não estiver disponível", async () => {
      await expect(
        streamChromeAiPrompt({
          prompt: "Olá",
          onChunk: jest.fn(),
        }),
      ).rejects.toThrow("Chrome Built-in AI não disponível neste navegador.");
    });

    it("deve criar sessão e fazer streaming com AsyncIterable", async () => {
      const mockChunks = ["Olá", "Olá, como", "Olá, como posso ajudar?"];
      async function* mockGenerator() {
        for (const chunk of mockChunks) {
          yield chunk;
        }
      }

      const mockDestroy = jest.fn();
      const mockPromptStreaming = jest.fn().mockReturnValue(mockGenerator());
      const mockCreate = jest.fn().mockResolvedValue({
        prompt: jest.fn(),
        promptStreaming: mockPromptStreaming,
        destroy: mockDestroy,
      });

      window.ai = {
        languageModel: {
          capabilities: jest.fn().mockResolvedValue({ available: "readily" }),
          create: mockCreate,
        },
      };

      const onChunk = jest.fn();
      const result = await streamChromeAiPrompt({
        prompt: "Qual o resumo do texto?",
        context: "Texto do documento de teste",
        onChunk,
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          systemPrompt: expect.stringContaining("assistente acadêmico"),
        }),
      );
      expect(mockPromptStreaming).toHaveBeenCalledWith(
        "Qual o resumo do texto?",
        expect.anything(),
      );
      expect(onChunk).toHaveBeenCalledTimes(3);
      expect(result).toBe("Olá, como posso ajudar?");
      expect(mockDestroy).toHaveBeenCalled();
    });

    it("deve respeitar AbortSignal durante o streaming", async () => {
      const controller = new AbortController();
      async function* mockGenerator() {
        yield "Chunk 1";
        controller.abort();
        yield "Chunk 2";
      }

      const mockDestroy = jest.fn();
      const mockPromptStreaming = jest.fn().mockReturnValue(mockGenerator());
      const mockCreate = jest.fn().mockResolvedValue({
        prompt: jest.fn(),
        promptStreaming: mockPromptStreaming,
        destroy: mockDestroy,
      });

      window.ai = {
        languageModel: {
          capabilities: jest.fn().mockResolvedValue({ available: "readily" }),
          create: mockCreate,
        },
      };

      const onChunk = jest.fn();
      const result = await streamChromeAiPrompt({
        prompt: "Teste abort",
        onChunk,
        signal: controller.signal,
      });

      expect(onChunk).toHaveBeenCalledWith("Chunk 1");
      expect(mockDestroy).toHaveBeenCalled();
    });
  });
});
