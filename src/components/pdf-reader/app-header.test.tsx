import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppHeader } from "./app-header";
import { ReaderSettingsProvider } from "@/context/reader-settings-context";

// Mock do hook usePathname
const mockUsePathname = jest.fn();
jest.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
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

  it("deve renderizar os botões de ação (tutorial, tema e chave Gemini)", () => {
    render(
      <ReaderSettingsProvider>
        <AppHeader />
      </ReaderSettingsProvider>
    );

    expect(
      screen.getByRole("button", { name: /personalizar preferências e tutorial/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /alternar tema de leitura/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /conectar chave gemini/i })
    ).toBeInTheDocument();
  });

  it("deve abrir o modal de chave Gemini ao clicar no botão correspondente", () => {
    render(
      <ReaderSettingsProvider>
        <AppHeader />
      </ReaderSettingsProvider>
    );

    const geminiBtn = screen.getByRole("button", { name: /conectar chave gemini/i });
    fireEvent.click(geminiBtn);

    expect(
      screen.getByText("Conectar conta do Gemini (Google AI Studio)")
    ).toBeInTheDocument();
  });
});
