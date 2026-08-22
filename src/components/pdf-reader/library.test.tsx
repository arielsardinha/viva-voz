import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Library } from "./library";
import { ReaderSettingsProvider } from "@/context/reader-settings-context";
import { saveReading, deleteReading, listReadings, type Reading } from "@/lib/library-db";
import { toast } from "sonner";

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock("next/navigation", () => ({
  usePathname: () => "/leituras",
}));

const mockUpdateApiKey = jest.fn();
let mockGeminiApiState = {
  hasApiKey: false,
  maskedKey: null as string | null,
  apiKey: null as string | null,
  updateApiKey: mockUpdateApiKey,
};

jest.mock("@/hooks/use-gemini-api-key", () => ({
  useGeminiApiKey: () => mockGeminiApiState,
}));

jest.mock("@/hooks/use-google-drive-sync", () => ({
  useGoogleDriveSync: () => ({
    status: { isConnected: false },
    isLoading: false,
    isSyncing: false,
    syncPhase: "idle",
    progress: 0,
    errorMessage: null,
    showPermissionModal: false,
    setShowPermissionModal: jest.fn(),
    checkStatus: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    backupNow: jest.fn(),
    restoreNow: jest.fn(),
    syncBidirectional: jest.fn(),
  }),
}));

describe("Library Component", () => {
  const mockReading1: Reading = {
    id: "r1",
    title: "Apostila de TypeScript",
    fileName: "typescript.pdf",
    size: 2048,
    pageCount: 5,
    sentences: [{ index: 0, page: 1, text: "Frase 1" }],
    file: new Blob(["mock"], { type: "application/pdf" }),
    createdAt: 1000,
    updatedAt: 1000,
    lastIndex: 2,
  };

  const mockReading2: Reading = {
    id: "r2",
    title: "Manual de Next.js",
    fileName: "nextjs.pdf",
    size: 4096,
    pageCount: 10,
    sentences: [{ index: 0, page: 1, text: "Frase 1" }],
    file: new Blob(["mock"], { type: "application/pdf" }),
    createdAt: 2000,
    updatedAt: 2000,
    lastIndex: 0,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockGeminiApiState = {
      hasApiKey: false,
      maskedKey: null,
      apiKey: null,
      updateApiKey: mockUpdateApiKey,
    };
    localStorage.clear();
    localStorage.setItem(
      "vivavoz-reader-settings",
      JSON.stringify({
        template: "modern",
        theme: "light",
        font: "inter",
        fontSize: 16,
        lineHeight: 1.8,
        hasCompletedOnboarding: true,
      })
    );
    localStorage.setItem("vivavoz_onboarding_dismissed", "true");
    localStorage.setItem("has-seen-preferences-tutorial-v1", "true");

    const existing = await listReadings();
    for (const r of existing) {
      await deleteReading(r.id);
    }
  });

  it("deve renderizar estado vazio quando não houver leituras salvas", async () => {
    render(
      <ReaderSettingsProvider>
        <Library />
      </ReaderSettingsProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Nenhuma leitura encontrada")).toBeInTheDocument();
    });
  });

  it("deve listar leituras gravadas no IndexedDB", async () => {
    await saveReading(mockReading1);
    await saveReading(mockReading2);

    render(
      <ReaderSettingsProvider>
        <Library />
      </ReaderSettingsProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Apostila de TypeScript")).toBeInTheDocument();
      expect(screen.getByText("Manual de Next.js")).toBeInTheDocument();
    });

    expect(screen.getAllByText("Ouvir Áudio")).toHaveLength(2);
  });

  it("deve filtrar leituras pelo campo de busca", async () => {
    await saveReading(mockReading1);
    await saveReading(mockReading2);

    render(
      <ReaderSettingsProvider>
        <Library />
      </ReaderSettingsProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Apostila de TypeScript")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Pesquisar leituras…");
    fireEvent.change(searchInput, { target: { value: "Next.js" } });

    expect(screen.queryByText("Apostila de TypeScript")).not.toBeInTheDocument();
    expect(screen.getByText("Manual de Next.js")).toBeInTheDocument();
  });

  it("deve permitir favoritar uma leitura", async () => {
    await saveReading(mockReading1);

    render(
      <ReaderSettingsProvider>
        <Library />
      </ReaderSettingsProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Apostila de TypeScript")).toBeInTheDocument();
    });

    const favButton = screen.getByRole("button", { name: /favoritar/i });
    fireEvent.click(favButton);

    const savedFavs = JSON.parse(localStorage.getItem("vivavoz-favorites") ?? "[]");
    expect(savedFavs).toContain("r1");
  });

  it("deve abrir o modal de confirmação e excluir uma leitura ao confirmar", async () => {
    await saveReading(mockReading1);

    render(
      <ReaderSettingsProvider>
        <Library />
      </ReaderSettingsProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Apostila de TypeScript")).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole("button", { name: /excluir leitura/i });
    fireEvent.click(deleteButton);

    // Modal de confirmação deve abrir
    expect(screen.getByText("Excluir Leitura")).toBeInTheDocument();
    const confirmButton = screen.getByRole("button", { name: /sim, excluir leitura/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.queryByText("Apostila de TypeScript")).not.toBeInTheDocument();
      expect(screen.getByText("Nenhuma leitura encontrada")).toBeInTheDocument();
    });
  });

  it("deve renderizar o botão Selecionar Arquivo, Colar Texto e Ler Artigo da Web na dropzone", async () => {
    render(
      <ReaderSettingsProvider>
        <Library />
      </ReaderSettingsProvider>
    );

    const selectFileButton = screen.getByRole("button", { name: /selecionar arquivo/i });
    expect(selectFileButton).toBeInTheDocument();

    const pasteTextButton = screen.getByRole("button", { name: /colar texto/i });
    expect(pasteTextButton).toBeInTheDocument();

    const webUrlButton = screen.getByRole("button", { name: /ler artigo da web/i });
    expect(webUrlButton).toBeInTheDocument();

    // Clicar em Colar Texto deve abrir o modal de texto rápido
    fireEvent.click(pasteTextButton);
    expect(screen.getByText(/Colar ou Digitar Texto/i)).toBeInTheDocument();

    // Fechar e abrir o modal de URL
    const cancelPaste = screen.getByRole("button", { name: /cancelar/i });
    fireEvent.click(cancelPaste);

    fireEvent.click(webUrlButton);
    expect(screen.getByRole("dialog", { name: /ler artigo da web/i })).toBeInTheDocument();
  });

  describe("Gerenciamento da Chave Gemini no Armazenamento Local", () => {
    it("deve renderizar botão 'Conectar Chave Gemini' quando a chave não estiver conectada", () => {
      render(
        <ReaderSettingsProvider>
          <Library />
        </ReaderSettingsProvider>
      );

      const connectBtn = screen.getByRole("button", { name: /conectar chave gemini/i });
      expect(connectBtn).toBeInTheDocument();
      expect(screen.getByText("Inativa")).toBeInTheDocument();

      fireEvent.click(connectBtn);
      expect(screen.getByText("Conectar conta do Gemini (Google AI Studio)")).toBeInTheDocument();
    });

    it("deve renderizar status 'Conectada', abrir modal de confirmação e desconectar ao confirmar", async () => {
      mockGeminiApiState = {
        hasApiKey: true,
        maskedKey: "AIzaSy...890",
        apiKey: "AIzaSy...890",
        updateApiKey: mockUpdateApiKey.mockResolvedValue(true),
      };

      render(
        <ReaderSettingsProvider>
          <Library />
        </ReaderSettingsProvider>
      );

      expect(screen.getByText("Conectada")).toBeInTheDocument();
      expect(screen.getByText(/Chave salva em cookie seguro \(AIzaSy\.\.\.890\)/i)).toBeInTheDocument();

      const disconnectBtn = screen.getByRole("button", { name: /desconectar chave gemini/i });
      expect(disconnectBtn).toBeInTheDocument();

      // Clica em desconectar -> abre modal de confirmação
      fireEvent.click(disconnectBtn);

      expect(screen.getByRole("heading", { name: "Desconectar Chave Gemini" })).toBeInTheDocument();
      expect(
        screen.getByText(/Tem certeza que deseja desconectar sua chave de IA\?/i)
      ).toBeInTheDocument();

      const confirmButton = screen.getByRole("button", { name: /sim, desconectar/i });
      expect(confirmButton).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(confirmButton);
      });

      expect(mockUpdateApiKey).toHaveBeenCalledWith(null);
      expect(toast.success).toHaveBeenCalledWith("Conta Gemini desconectada.");
    });
  });
});
