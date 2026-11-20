import { render, screen, fireEvent } from "@testing-library/react";
import { createInitialModelStates } from "@/lib/local-ai/domain/local-model-catalog";
import { LocalModelsDrawer } from "./local-models-drawer";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockStartDownload = jest.fn();
const mockCancelDownload = jest.fn();
const mockDeleteModel = jest.fn();
const mockCloseDrawer = jest.fn();
const mockSetDrawerOpen = jest.fn();

let mockDrawerOpen = true;
const mockModels = createInitialModelStates();

jest.mock("@/context/local-ai-context", () => ({
  useLocalAi: () => ({
    models: mockModels,
    runtimeSupport: {
      webGpuSupported: true,
      cacheApiSupported: true,
      wasmSupported: true,
    },
    storageEstimate: null,
    isDrawerOpen: mockDrawerOpen,
    highlightedModelId: "kokoro-82m-tts",
    preferredChatEngine: "auto",
    activeDownloadsCount: 0,
    totalLocalModelsBytes: 0,
    isInitialized: true,
    openDrawer: jest.fn(),
    closeDrawer: mockCloseDrawer,
    setDrawerOpen: mockSetDrawerOpen,
    setPreferredChatEngine: jest.fn(),
    startDownload: mockStartDownload,
    cancelDownload: mockCancelDownload,
    deleteModel: mockDeleteModel,
    refreshModels: jest.fn(),
    isModelReady: () => false,
  }),
}));

jest.mock("@/context/reader-settings-context", () => ({
  useReaderSettings: () => ({
    patchSettings: jest.fn(),
  }),
}));

describe("LocalModelsDrawer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDrawerOpen = true;
  });

  it("deve renderizar os dois modelos locais e link para a tela completa /modelos", () => {
    render(<LocalModelsDrawer />);

    expect(screen.getByText("Modelos de IA Local")).toBeInTheDocument();
    expect(screen.getByText("Kokoro 82M (Voz Neural PT-BR)")).toBeInTheDocument();
    expect(
      screen.getByText("Gemma 4 E2B Multimodal (Chat Local)"),
    ).toBeInTheDocument();

    const fullLink = screen.getByRole("link", {
      name: /abrir tela completa de modelos/i,
    });
    expect(fullLink).toHaveAttribute("href", "/modelos");

    const downloadBtns = screen.getAllByRole("button", { name: /baixar modelo/i });
    fireEvent.click(downloadBtns[0]!);
    expect(mockStartDownload).toHaveBeenCalledWith("kokoro-82m-tts");
  });
});
