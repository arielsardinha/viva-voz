import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useState } from "react";
import { ReaderSettingsProvider } from "@/context/reader-settings-context";
import { LocalAiProvider, useLocalAi } from "@/context/local-ai-context";
import { AIStudyTemplate } from "./reader-templates/ai-study-template";
import { useTtsPlayer } from "@/hooks/use-tts-player";
import { getVoicesForEngine, type TtsEngine } from "@/lib/tts-engines";
import type { Sentence } from "@/lib/pdf-text";
import type { ReaderSettings } from "./ui/template-switcher";
import * as storageService from "@/lib/local-ai/storage/model-storage.service";
import { getAudioCacheStats } from "@/lib/tts-audio-cache";

const mockRouterPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock("./ui/text-selection-menu", () => ({
  TextSelectionMenu: () => null,
}));

jest.mock("./ui/pages-drawer", () => ({
  PagesDrawer: () => null,
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

const mockSynthesizeToWavBlob = jest.fn();

jest.mock("@/lib/local-ai/engines/local-tts.engine", () => ({
  getLocalTtsEngine: () => ({
    synthesizeToWavBlob: mockSynthesizeToWavBlob,
    cancel: jest.fn(),
    dispose: jest.fn(),
    ensureReady: jest.fn(),
  }),
}));

const mockedStorage = storageService as jest.Mocked<typeof storageService>;

const sampleSentences: Sentence[] = [
  { index: 0, page: 1, text: "Narração offline com Kokoro." },
  { index: 1, page: 1, text: "Segunda frase de teste." },
];

const settings: ReaderSettings = {
  template: "ai-study",
  theme: "light",
  font: "sans",
  fontSize: 16,
  lineHeight: 1.8,
  speed: 1,
  hasCompletedOnboarding: true,
};

function LocalTtsReaderHarness() {
  const [engine, setEngineState] = useState<TtsEngine>("system");
  const [voice, setVoice] = useState("pf_dora");
  const { isModelReady, openModelsPage, isInitialized } = useLocalAi();

  const player = useTtsPlayer({
    sentences: sampleSentences,
    engine,
    voice,
    speed: 1,
    onEngineUnavailable: (failed) => {
      if (failed === "litert") openModelsPage("kokoro-82m-tts");
    },
  });

  const handleEngineChange = (next: TtsEngine) => {
    if (next === "litert" && !isModelReady("kokoro-82m-tts")) {
      openModelsPage("kokoro-82m-tts");
      return;
    }
    setEngineState(next);
  };

  return (
    <div data-testid="harness-ready" data-initialized={isInitialized ? "true" : "false"}>
      <AIStudyTemplate
        sentences={sampleSentences}
        currentIndex={player.currentIndex}
        title="Livro Offline"
        settings={settings}
        isPlaying={player.isPlaying}
        isBuffering={player.isBuffering}
        voice={voice}
        speed="1"
        engine={engine}
        activeTtsModel={player.activeTtsModel}
        voices={getVoicesForEngine(engine, [{ id: "sys", label: "Sistema" }])}
        disabledEngines={[]}
        onEngineChange={handleEngineChange}
        onSelectSentence={player.jumpTo}
        onToggle={player.toggle}
        onPrevious={player.previous}
        onNext={player.next}
        onRestart={player.restart}
        onVoiceChange={setVoice}
        onSpeedChange={jest.fn()}
      />
    </div>
  );
}

describe("Integração TTS Local Offline (Kokoro 82M)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedStorage.detectLocalRuntimeSupport.mockReturnValue({
      webGpuSupported: true,
      cacheApiSupported: true,
      wasmSupported: true,
    });
    mockedStorage.getStorageQuotaEstimate.mockResolvedValue({
      usageBytes: 0,
      quotaBytes: 5_000_000_000,
    });
  });

  it("deve navegar para /modelos?model=kokoro-82m-tts ao clicar em IA Local (Offline) sem modelo baixado", async () => {
    mockedStorage.getCachedModelMeta.mockResolvedValue({
      cached: false,
      sizeBytes: 0,
      cachedAt: null,
      sourceUrl: null,
    });

    render(
      <ReaderSettingsProvider>
        <LocalAiProvider>
          <LocalTtsReaderHarness />
        </LocalAiProvider>
      </ReaderSettingsProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("harness-ready")).toHaveAttribute(
        "data-initialized",
        "true",
      );
    });

    const voiceTrigger = screen.getByRole("button", { name: "Selecionar voz e motor" });
    fireEvent.keyDown(voiceTrigger, { key: "ArrowDown", code: "ArrowDown" });

    const localOption = await screen.findByText("IA Local (Offline)");
    fireEvent.click(localOption);

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith("/modelos?model=kokoro-82m-tts");
    });
    expect(screen.queryAllByTestId("tts-model-indicator")).toHaveLength(0);
  });

  it("deve narrar com Kokoro 82M em memória quando pronto e manter zero blobs de áudio no IndexedDB", async () => {
    mockedStorage.getCachedModelMeta.mockImplementation(async (id) => ({
      cached: id === "kokoro-82m-tts",
      sizeBytes: id === "kokoro-82m-tts" ? 294_750_530 : 0,
      cachedAt: id === "kokoro-82m-tts" ? Date.now() : null,
      sourceUrl: null,
    }));

    mockSynthesizeToWavBlob.mockResolvedValue({
      blob: new Blob(["wav"], { type: "audio/wav" }),
      sampleRateHz: 24000,
    });

    render(
      <ReaderSettingsProvider>
        <LocalAiProvider>
          <LocalTtsReaderHarness />
        </LocalAiProvider>
      </ReaderSettingsProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("harness-ready")).toHaveAttribute(
        "data-initialized",
        "true",
      );
    });

    const voiceTrigger = screen.getByRole("button", { name: "Selecionar voz e motor" });
    fireEvent.keyDown(voiceTrigger, { key: "ArrowDown", code: "ArrowDown" });
    fireEvent.click(await screen.findByText("IA Local (Offline)"));

    await waitFor(() => {
      expect(screen.getAllByTestId("tts-model-indicator")[0]).toHaveAttribute(
        "data-tts-model",
        "kokoro-82m",
      );
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Reproduzir" })[0]!);

    await waitFor(() => {
      expect(mockSynthesizeToWavBlob).toHaveBeenCalledWith(
        expect.stringContaining("Narração offline com Kokoro."),
        "pf_dora",
      );
    });

    const stats = await getAudioCacheStats();
    expect(stats.totalTracks).toBe(0);
  });
});
