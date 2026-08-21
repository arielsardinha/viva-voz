import { DefaultChatTransport, type ChatTransport, type UIMessage, type UIMessageChunk } from "ai";
import { checkChromeAiAvailability, streamChromeAiPrompt } from "./chrome-ai";

export interface HybridChatTransportOptions {
  api: string;
  context: string;
  fileName?: string | null;
  userApiKey?: string | null;
  onEngineChange?: (engine: "cloud" | "local") => void;
}

/**
 * Transporte de chat híbrido que conecta ao endpoint na nuvem (/api/ask)
 * e faz fallback automático e transparente para a Chrome Built-in AI (Gemini Nano)
 * quando a chave não estiver configurada ou a nuvem estiver indisponível.
 */
export class HybridChatTransport implements ChatTransport<UIMessage> {
  private defaultTransport: DefaultChatTransport<UIMessage>;
  private context: string;
  private fileName?: string | null;
  private userApiKey?: string | null;
  private onEngineChange?: (engine: "cloud" | "local") => void;

  constructor(options: HybridChatTransportOptions) {
    this.context = options.context;
    this.fileName = options.fileName;
    this.userApiKey = options.userApiKey;
    this.onEngineChange = options.onEngineChange;

    this.defaultTransport = new DefaultChatTransport({
      api: options.api,
      body: () => ({
        context: this.context,
        fileName: this.fileName,
        userApiKey: this.userApiKey ?? undefined,
      }),
    });
  }

  async reconnectToStream(
    options: Parameters<ChatTransport<UIMessage>["reconnectToStream"]>[0],
  ): Promise<ReadableStream<UIMessageChunk> | null> {
    return this.defaultTransport.reconnectToStream(options);
  }

  async sendMessages(
    options: Parameters<ChatTransport<UIMessage>["sendMessages"]>[0],
  ): Promise<ReadableStream<UIMessageChunk>> {
    const isLocalAvailable = (await checkChromeAiAvailability()) === "readily";

    // Se temos chave ou a IA local não está disponível, tenta a nuvem
    if (this.userApiKey || !isLocalAvailable) {
      try {
        this.onEngineChange?.("cloud");
        return await this.defaultTransport.sendMessages(options);
      } catch (cloudError) {
        if (!isLocalAvailable) {
          throw cloudError;
        }
        console.warn("Falha ao consultar IA na nuvem, usando Chrome AI local:", cloudError);
      }
    }

    // Executa localmente com o Gemini Nano (Chrome Prompt API)
    this.onEngineChange?.("local");
    const lastUserMessage = [...options.messages].reverse().find((m) => m.role === "user");
    const promptText =
      lastUserMessage?.parts
        ?.map((part) => (part.type === "text" ? part.text : ""))
        .join("") || "";

    const partId = `text-part-${Date.now()}`;
    const context = this.context;

    return new ReadableStream<UIMessageChunk>({
      async start(controller) {
        controller.enqueue({ type: "text-start", id: partId });
        let previousLength = 0;

        try {
          await streamChromeAiPrompt({
            prompt: promptText,
            context,
            signal: options.abortSignal,
            onChunk: (accumulated) => {
              const delta = accumulated.slice(previousLength);
              previousLength = accumulated.length;
              if (delta) {
                controller.enqueue({
                  type: "text-delta",
                  id: partId,
                  delta,
                });
              }
            },
          });
        } catch (err) {
          controller.enqueue({
            type: "error",
            errorText: err instanceof Error ? err.message : "Erro na IA local",
          });
        } finally {
          controller.enqueue({ type: "text-end", id: partId });
          controller.close();
        }
      },
    });
  }
}
