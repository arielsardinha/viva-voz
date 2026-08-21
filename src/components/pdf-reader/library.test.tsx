import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Library } from "./library";
import { ReaderSettingsProvider } from "@/context/reader-settings-context";
import { saveReading, deleteReading, listReadings, type Reading } from "@/lib/library-db";

jest.mock("next/navigation", () => ({
  usePathname: () => "/leituras",
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

  it("deve renderizar o botão Selecionar Arquivo e Colar Texto na dropzone", async () => {
    render(
      <ReaderSettingsProvider>
        <Library />
      </ReaderSettingsProvider>
    );

    const selectFileButton = screen.getByRole("button", { name: /selecionar arquivo/i });
    expect(selectFileButton).toBeInTheDocument();

    const pasteTextButton = screen.getByRole("button", { name: /colar texto/i });
    expect(pasteTextButton).toBeInTheDocument();

    // Clicar em Colar Texto deve abrir o modal de texto rápido
    fireEvent.click(pasteTextButton);
    expect(screen.getByText(/Colar ou Digitar Texto/i)).toBeInTheDocument();
  });
});
