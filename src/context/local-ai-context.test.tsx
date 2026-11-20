import { render, screen, act, waitFor, fireEvent } from "@testing-library/react";
import { LocalAiProvider, useLocalAi } from "./local-ai-context";
import * as storageService from "@/lib/local-ai/storage/model-storage.service";

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock("@/lib/local-ai/storage/model-storage.service", () => ({
  detectLocalRuntimeSupport: jest.fn(),
  getCachedModelMeta: jest.fn(),
  getStorageQuotaEstimate: jest.fn(),
  downloadAndCacheModel: jest.fn(),
  deleteCachedModel: jest.fn(),
}));

jest.mock("@/lib/local-ai/engines/local-tts.engine", () => ({
  getLocalTtsEngine: () => ({ dispose: jest.fn() }),
}));

jest.mock("@/lib/local-ai/engines/local-chat.engine", () => ({
  getLocalChatEngine: () => ({ dispose: jest.fn().mockResolvedValue(undefined) }),
}));

const mockedStorage = storageService as jest.Mocked<typeof storageService>;

function ContextHarness() {
  const {
    models,
    isDrawerOpen,
    highlightedModelId,
    preferredChatEngine,
    activeDownloadsCount,
    openDrawer,
    closeDrawer,
    setPreferredChatEngine,
    startDownload,
    cancelDownload,
    deleteModel,
    isModelReady,
    isInitialized,
  } = useLocalAi();

  return (
    <div>
      <span data-testid="initialized">{isInitialized ? "yes" : "no"}</span>
      <span data-testid="kokoro-status">{models["kokoro-82m-tts"].status}</span>
      <span data-testid="kokoro-progress">
        {models["kokoro-82m-tts"].progressPercent}
      </span>
      <span data-testid="kokoro-ready">
        {isModelReady("kokoro-82m-tts") ? "yes" : "no"}
      </span>
      <span data-testid="drawer-open">{isDrawerOpen ? "open" : "closed"}</span>
      <span data-testid="highlighted">{highlightedModelId ?? "none"}</span>
      <span data-testid="chat-pref">{preferredChatEngine}</span>
      <span data-testid="active-downloads">{activeDownloadsCount}</span>
      <button type="button" onClick={() => openDrawer("kokoro-82m-tts")}>
        Abrir Drawer
      </button>
      <button type="button" onClick={() => closeDrawer()}>
        Fechar Drawer
      </button>
      <button
        type="button"
        onClick={() => setPreferredChatEngine("litert-lm")}
      >
        Preferir LiteRT
      </button>
      <button type="button" onClick={() => void startDownload("kokoro-82m-tts")}>
        Baixar Kokoro
      </button>
      <button type="button" onClick={() => cancelDownload("kokoro-82m-tts")}>
        Cancelar Kokoro
      </button>
      <button type="button" onClick={() => void deleteModel("kokoro-82m-tts")}>
        Remover Kokoro
      </button>
    </div>
  );
}

describe("LocalAiProvider & useLocalAi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockedStorage.detectLocalRuntimeSupport.mockReturnValue({
      webGpuSupported: true,
      cacheApiSupported: true,
      wasmSupported: true,
    });
    mockedStorage.getCachedModelMeta.mockResolvedValue({
      cached: false,
      sizeBytes: 0,
      cachedAt: null,
      sourceUrl: null,
    });
    mockedStorage.getStorageQuotaEstimate.mockResolvedValue({
      usageBytes: 0,
      quotaBytes: 10_000_000_000,
    });
    mockedStorage.deleteCachedModel.mockResolvedValue(true);
  });

  it("deve retornar fallback seguro quando usado fora do LocalAiProvider", () => {
    render(<ContextHarness />);
    expect(screen.getByTestId("kokoro-status")).toHaveTextContent("not_downloaded");
    expect(screen.getByTestId("kokoro-ready")).toHaveTextContent("no");
    expect(screen.getByTestId("drawer-open")).toHaveTextContent("closed");
  });

  it("deve gerenciar ciclo completo: download com progresso -> ready -> delete -> not_downloaded", async () => {
    mockedStorage.downloadAndCacheModel.mockImplementation(
      async (_desc, opts) => {
        opts.onProgress?.({
          downloadedBytes: 100,
          totalBytes: 200,
          progressPercent: 50,
          speedBytesPerSec: 1024,
        });
        return { sizeBytes: 200, cachedAt: Date.now() };
      },
    );

    render(
      <LocalAiProvider>
        <ContextHarness />
      </LocalAiProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("initialized")).toHaveTextContent("yes");
      expect(screen.getByTestId("kokoro-status")).toHaveTextContent("not_downloaded");
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Baixar Kokoro" }));
    });

    expect(screen.getByTestId("kokoro-status")).toHaveTextContent("ready");
    expect(screen.getByTestId("kokoro-progress")).toHaveTextContent("100");
    expect(screen.getByTestId("kokoro-ready")).toHaveTextContent("yes");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Remover Kokoro" }));
    });

    expect(screen.getByTestId("kokoro-status")).toHaveTextContent("not_downloaded");
    expect(screen.getByTestId("kokoro-ready")).toHaveTextContent("no");
  });

  it("deve cancelar download em andamento ao chamar cancelDownload", async () => {
    mockedStorage.downloadAndCacheModel.mockImplementation(
      (_desc, opts) =>
        new Promise((_resolve, reject) => {
          opts.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );

    render(
      <LocalAiProvider>
        <ContextHarness />
      </LocalAiProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("initialized")).toHaveTextContent("yes");
      expect(screen.getByTestId("kokoro-status")).toHaveTextContent("not_downloaded");
    });

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Baixar Kokoro" }));
    });

    expect(screen.getByTestId("kokoro-status")).toHaveTextContent("downloading");
    expect(screen.getByTestId("active-downloads")).toHaveTextContent("1");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Cancelar Kokoro" }));
    });

    expect(screen.getByTestId("kokoro-status")).toHaveTextContent("not_downloaded");
    expect(screen.getByTestId("active-downloads")).toHaveTextContent("0");
  });

  it("deve abrir/fechar drawer com destaque e persistir preferência do motor de chat", async () => {
    render(
      <LocalAiProvider>
        <ContextHarness />
      </LocalAiProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("initialized")).toHaveTextContent("yes");
    });

    fireEvent.click(screen.getByRole("button", { name: "Abrir Drawer" }));
    expect(screen.getByTestId("drawer-open")).toHaveTextContent("open");
    expect(screen.getByTestId("highlighted")).toHaveTextContent("kokoro-82m-tts");

    fireEvent.click(screen.getByRole("button", { name: "Fechar Drawer" }));
    expect(screen.getByTestId("drawer-open")).toHaveTextContent("closed");

    fireEvent.click(screen.getByRole("button", { name: "Preferir LiteRT" }));
    expect(screen.getByTestId("chat-pref")).toHaveTextContent("litert-lm");
    expect(localStorage.getItem("vivavoz-chat-engine-pref")).toBe("litert-lm");
  });
});
