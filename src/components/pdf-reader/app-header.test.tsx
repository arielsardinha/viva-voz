import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppHeader } from "./app-header";
import { ReaderSettingsProvider } from "@/context/reader-settings-context";

// Mock do hook usePathname
const mockUsePathname = jest.fn();
jest.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

const mockUseGoogleDriveSync = jest.fn();
jest.mock("@/hooks/use-google-drive-sync", () => ({
  useGoogleDriveSync: () => mockUseGoogleDriveSync(),
}));

jest.mock("@/hooks/use-gemini-api-key", () => ({
  useGeminiApiKey: () => ({
    apiKey: null,
    hasApiKey: false,
    maskedKey: null,
    isChecking: false,
    updateApiKey: jest.fn().mockResolvedValue(true),
    syncKey: jest.fn().mockResolvedValue(true),
  }),
}));

describe("AppHeader Component", () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue("/");
    mockUseGoogleDriveSync.mockReturnValue({
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
    });
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
  });

  it("deve renderizar o logotipo VivaVoz e os links de navegação", () => {
    render(
      <ReaderSettingsProvider>
        <AppHeader />
      </ReaderSettingsProvider>
    );

    expect(screen.getByText("VivaVoz")).toBeInTheDocument();
    expect(screen.getByText("AI Studio")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /leitor/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /biblioteca/i })).toBeInTheDocument();
  });

  it("deve renderizar os botões principais de ação (apoio Pix, contato com dev e tema) e não exibir botões de tutorial ou chave Gemini fixos", () => {
    render(
      <ReaderSettingsProvider>
        <AppHeader />
      </ReaderSettingsProvider>
    );

    // O botão de tutorial NÃO deve ficar fixo no menu superior
    expect(
      screen.queryByRole("button", { name: /personalizar preferências e tutorial/i })
    ).not.toBeInTheDocument();

    // O botão do Gemini NÃO deve ficar fixo no menu superior
    expect(
      screen.queryByRole("button", { name: /conectar chave gemini/i })
    ).not.toBeInTheDocument();

    // Os outros botões principais devem estar presentes
    expect(
      screen.getByRole("button", { name: /apoiar.*vivavoz/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /entrar em contato com o desenvolvedor/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /alternar tema de leitura/i })
    ).toBeInTheDocument();
  });

  it("deve abrir o modal de contato com o desenvolvedor ao clicar no botão correspondente", () => {
    render(
      <ReaderSettingsProvider>
        <AppHeader />
      </ReaderSettingsProvider>
    );

    const contactBtn = screen.getByRole("button", {
      name: /entrar em contato com o desenvolvedor/i,
    });
    fireEvent.click(contactBtn);

    expect(
      screen.getByText("Falar com o Desenvolvedor")
    ).toBeInTheDocument();
  });

  it("deve renderizar o menu hambúrguer em mobile com opções de Tema, Apoiar e Contato", () => {
    render(
      <ReaderSettingsProvider>
        <AppHeader />
      </ReaderSettingsProvider>
    );

    // Deve conter o gatilho do menu hambúrguer
    const mobileMenuBtn = screen.getByRole("button", {
      name: /abrir menu de opções/i,
    });
    expect(mobileMenuBtn).toBeInTheDocument();

    // Ao clicar no menu hambúrguer, o dropdown com as opções deve abrir
    fireEvent.keyDown(mobileMenuBtn, { key: "ArrowDown", code: "ArrowDown" });

    expect(screen.getByText("Apoiar com Pix")).toBeInTheDocument();
    expect(screen.getByText("Falar com o Desenvolvedor")).toBeInTheDocument();
    expect(screen.getByText("Clean (Claro)")).toBeInTheDocument();
    expect(screen.getByText("Papel Zen (Sépia)")).toBeInTheDocument();
    expect(screen.getByText("Escuro (Midnight)")).toBeInTheDocument();
  });

  it("deve abrir o modal de Apoio Pix ao clicar em 'Apoiar com Pix' no menu hambúrguer", () => {
    render(
      <ReaderSettingsProvider>
        <AppHeader />
      </ReaderSettingsProvider>
    );

    const mobileMenuBtn = screen.getByRole("button", {
      name: /abrir menu de opções/i,
    });
    fireEvent.keyDown(mobileMenuBtn, { key: "ArrowDown", code: "ArrowDown" });

    const supportItem = screen.getByText("Apoiar com Pix");
    fireEvent.click(supportItem);

    expect(screen.getByText(/Apoie o VivaVoz/i)).toBeInTheDocument();
  });

  it("deve alternar o tema de leitura ao selecionar no menu hambúrguer", () => {
    render(
      <ReaderSettingsProvider>
        <AppHeader />
      </ReaderSettingsProvider>
    );

    const mobileMenuBtn = screen.getByRole("button", {
      name: /abrir menu de opções/i,
    });
    fireEvent.keyDown(mobileMenuBtn, { key: "ArrowDown", code: "ArrowDown" });

    const sepiaItem = screen.getByText("Papel Zen (Sépia)");
    fireEvent.click(sepiaItem);

    expect(localStorage.getItem("vivavoz-reader-settings")).toContain('"theme":"sepia"');
  });

  it("deve exibir o botão de sincronização Google Drive no cabeçalho quando desconectado (em / e /leituras)", () => {
    mockUsePathname.mockReturnValue("/leituras");
    mockUseGoogleDriveSync.mockReturnValue({
      status: { isConnected: false },
      isLoading: false,
      isSyncing: false,
    });

    render(
      <ReaderSettingsProvider>
        <AppHeader />
      </ReaderSettingsProvider>
    );

    expect(
      screen.getByRole("button", { name: /backup e sincronização no google drive/i })
    ).toBeInTheDocument();
  });

  it("NÃO deve exibir o botão de sincronização Google Drive no cabeçalho quando já estiver conectado (em / e /leituras)", () => {
    mockUsePathname.mockReturnValue("/leituras");
    mockUseGoogleDriveSync.mockReturnValue({
      status: { isConnected: true, email: "user@test.com" },
      isLoading: false,
      isSyncing: false,
    });

    render(
      <ReaderSettingsProvider>
        <AppHeader />
      </ReaderSettingsProvider>
    );

    expect(
      screen.queryByRole("button", { name: /backup e sincronização no google drive/i })
    ).not.toBeInTheDocument();
  });

  it("deve exibir 'Conectar Chave Gemini' no menu mobile quando não conectado", () => {
    render(
      <ReaderSettingsProvider>
        <AppHeader />
      </ReaderSettingsProvider>
    );

    const mobileMenuBtn = screen.getByRole("button", {
      name: /abrir menu de opções/i,
    });
    fireEvent.keyDown(mobileMenuBtn, { key: "ArrowDown", code: "ArrowDown" });

    expect(screen.getByText("Conectar Chave Gemini")).toBeInTheDocument();
  });
});


