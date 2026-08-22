import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppHeader } from "./app-header";
import { ReaderSettingsProvider } from "@/context/reader-settings-context";

// Mock do hook usePathname
const mockUsePathname = jest.fn();
jest.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
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

describe("AppHeader Component", () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue("/");
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
});
