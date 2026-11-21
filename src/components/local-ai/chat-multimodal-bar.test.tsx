import { render, screen, fireEvent } from "@testing-library/react";
import type { ChatAttachment } from "@/lib/local-ai/domain/local-model.types";
import { ChatMultimodalBar } from "./chat-multimodal-bar";

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

let mockGemmaReady = false;
let mockPref: "auto" | "cloud" | "gemini-nano" | "litert-lm" = "auto";
const mockSetPref = jest.fn((next: typeof mockPref) => {
  mockPref = next;
});
const mockOpenModelsPage = jest.fn();

jest.mock("@/context/local-ai-context", () => ({
  useLocalAi: () => ({
    preferredChatEngine: mockPref,
    setPreferredChatEngine: mockSetPref,
    isModelReady: (id: string) => id === "gemma-4-e2b-chat" && mockGemmaReady,
    openModelsPage: mockOpenModelsPage,
  }),
}));

describe("ChatMultimodalBar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGemmaReady = false;
    mockPref = "auto";
  });

  it("deve abrir a central /modelos do Gemma 4 ao tentar selecionar Gemma 4 Local sem o modelo baixado", async () => {
    render(
      <ChatMultimodalBar
        attachments={[]}
        onAddAttachment={jest.fn()}
        onRemoveAttachment={jest.fn()}
        activeEngine="disconnected"
      />,
    );

    const selector = screen.getByRole("button", {
      name: /selecionar motor de ia do chat/i,
    });
    fireEvent.keyDown(selector, { key: "ArrowDown", code: "ArrowDown" });

    const gemmaItem = await screen.findByRole("menuitemradio", {
      name: /Gemma 4 Local/,
    });
    fireEvent.click(gemmaItem);

    expect(mockOpenModelsPage).toHaveBeenCalledWith("gemma-4-e2b-chat");
    expect(mockSetPref).not.toHaveBeenCalled();
  });

  it("deve permitir selecionar Gemma 4 Local quando pronto e anexar/remover imagem e áudio", async () => {
    mockGemmaReady = true;
    const onAddAttachment = jest.fn();
    const onRemoveAttachment = jest.fn();

    const initialAttachment: ChatAttachment = {
      id: "att-img",
      type: "image",
      file: new Blob(["png"], { type: "image/png" }),
      name: "diagrama.png",
      mimeType: "image/png",
      previewUrl: "blob:preview-1",
    };

    render(
      <ChatMultimodalBar
        attachments={[initialAttachment]}
        onAddAttachment={onAddAttachment}
        onRemoveAttachment={onRemoveAttachment}
        activeEngine="litert-lm"
      />,
    );

    expect(screen.getByText("diagrama.png")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Remover anexo diagrama.png" }),
    );
    expect(onRemoveAttachment).toHaveBeenCalledWith("att-img");

    const imageInput = screen.getByLabelText("Selecionar imagem para o chat");
    const pngFile = new File(["img"], "grafico.png", { type: "image/png" });
    fireEvent.change(imageInput, { target: { files: [pngFile] } });

    expect(onAddAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "image",
        name: "grafico.png",
        mimeType: "image/png",
      }),
    );

    const audioInput = screen.getByLabelText(
      "Selecionar arquivo de áudio para o chat",
    );
    const wavFile = new File(["wav"], "pergunta.wav", { type: "audio/wav" });
    fireEvent.change(audioInput, { target: { files: [wavFile] } });

    await screen.findByRole("button", { name: "Anexar arquivo de áudio" });
    expect(onAddAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "audio",
        name: "pergunta.wav",
        mimeType: "audio/wav",
      }),
    );

    const selector = screen.getByRole("button", {
      name: /selecionar motor de ia do chat/i,
    });
    fireEvent.keyDown(selector, { key: "ArrowDown", code: "ArrowDown" });
    fireEvent.click(
      await screen.findByRole("menuitemradio", { name: /Gemma 4 Local/ }),
    );
    expect(mockSetPref).toHaveBeenCalledWith("litert-lm");
  });
});
