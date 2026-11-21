import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { ReaderSettingsProvider } from "@/context/reader-settings-context";
import { LocalAiProvider } from "@/context/local-ai-context";
import { AIStudyTemplate } from "./reader-templates/ai-study-template";
import * as storageService from "@/lib/local-ai/storage/model-storage.service";
import type { ReaderSettings } from "./ui/template-switcher";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock("@/hooks/use-chrome-ai", () => ({
  useChromeAi: () => ({ status: "unavailable", isSupported: false }),
}));

jest.mock("@/hooks/use-gemini-api-key", () => ({
  useGeminiApiKey: () => ({
    apiKey: null,
    hasApiKey: false,
    maskedKey: null,
    isChecking: false,
    updateApiKey: jest.fn(),
    syncKey: jest.fn(),
  }),
}));

jest.mock("@/lib/local-ai/storage/model-storage.service", () => ({
  detectLocalRuntimeSupport: jest.fn(),
  getCachedModelMeta: jest.fn(),
  getStorageQuotaEstimate: jest.fn(),
  downloadAndCacheModel: jest.fn(),
  deleteCachedModel: jest.fn(),
}));

const mockStreamMultimodalPrompt = jest.fn();

jest.mock("@/lib/local-ai/engines/local-chat.engine", () => ({
  getLocalChatEngine: () => ({
    streamMultimodalPrompt: mockStreamMultimodalPrompt,
    dispose: jest.fn().mockResolvedValue(undefined),
  }),
}));

const mockedStorage = storageService as jest.Mocked<typeof storageService>;

const sampleSettings: ReaderSettings = {
  template: "ai-study",
  theme: "light",
  font: "inter",
  fontSize: 16,
  lineHeight: 1.8,
  speed: 1,
  hasCompletedOnboarding: true,
};

describe("Integração Chat Multimodal Local (Gemma 4 E2B / LiteRT-LM)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockedStorage.detectLocalRuntimeSupport.mockReturnValue({
      webGpuSupported: true,
      cacheApiSupported: true,
      wasmSupported: true,
    });
    mockedStorage.getStorageQuotaEstimate.mockResolvedValue({
      usageBytes: 0,
      quotaBytes: 5_000_000_000,
    });
    mockedStorage.getCachedModelMeta.mockImplementation(async (id) => ({
      cached: id === "gemma-4-e2b-chat",
      sizeBytes: id === "gemma-4-e2b-chat" ? 2_340_870_772 : 0,
      cachedAt: id === "gemma-4-e2b-chat" ? Date.now() : null,
      sourceUrl: null,
    }));
  });

  it("deve permitir anexar imagem e áudio e responder via LiteRT-LM local no AIStudyTemplate", async () => {
    mockStreamMultimodalPrompt.mockImplementation(async function* () {
      yield "Explicação local ";
      yield "com imagem e áudio.";
    });

    render(
      <ReaderSettingsProvider>
        <LocalAiProvider>
          <AIStudyTemplate
            sentences={[
              { index: 0, page: 1, text: "Conteúdo de estudo em IA." },
            ]}
            currentIndex={0}
            title="Apostila Local.pdf"
            settings={sampleSettings}
            isPlaying={false}
            isBuffering={false}
            voice="sys"
            speed="1"
            engine="system"
            voices={[{ id: "sys", label: "Sistema" }]}
            disabledEngines={[]}
            onEngineChange={jest.fn()}
            onSelectSentence={jest.fn()}
            onToggle={jest.fn()}
            onPrevious={jest.fn()}
            onNext={jest.fn()}
            onRestart={jest.fn()}
            onVoiceChange={jest.fn()}
            onSpeedChange={jest.fn()}
          />
        </LocalAiProvider>
      </ReaderSettingsProvider>,
    );

    const engineSelector = screen.getByRole("button", {
      name: /selecionar motor de ia do chat/i,
    });
    await waitFor(() => {
      expect(
        within(engineSelector).getByText("Gemma 4 Local"),
      ).toBeInTheDocument();
    });

    const imageInput = screen.getByLabelText("Selecionar imagem para o chat");
    fireEvent.change(imageInput, {
      target: {
        files: [new File(["png"], "slide.png", { type: "image/png" })],
      },
    });

    const audioInput = screen.getByLabelText(
      "Selecionar arquivo de áudio para o chat",
    );
    fireEvent.change(audioInput, {
      target: {
        files: [new File(["wav"], "duvida.wav", { type: "audio/wav" })],
      },
    });

    await waitFor(() => {
      expect(screen.getByText("slide.png")).toBeInTheDocument();
      expect(screen.getByText("duvida.wav")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("Pergunte sobre o documento...");
    fireEvent.change(input, { target: { value: "Resuma o slide e o áudio" } });
    fireEvent.click(
      screen.getByRole("button", {
        name: "Enviar pergunta sobre o documento",
      }),
    );

    await waitFor(() => {
      expect(
        screen.getByText("Explicação local com imagem e áudio."),
      ).toBeInTheDocument();
      expect(
        screen.getByText("VivaVoz AI - LiteRT-LM (Local)"),
      ).toBeInTheDocument();
    });

    expect(mockStreamMultimodalPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "Resuma o slide e o áudio",
        fileName: "Apostila Local.pdf",
        attachments: expect.arrayContaining([
          expect.objectContaining({ type: "image", name: "slide.png" }),
          expect.objectContaining({ type: "audio", name: "duvida.wav" }),
        ]),
      }),
    );
  });
});
