import React from "react";
import { render, screen, act, fireEvent } from "@testing-library/react";
import {
  ReaderSettingsProvider,
  useReaderSettings,
  getFontFamilyClass,
  READER_SETTINGS_STORAGE,
} from "./reader-settings-context";

function TestConsumer() {
  const { settings, patchSettings, setTheme } = useReaderSettings();
  return (
    <div>
      <span data-testid="template">{settings.template}</span>
      <span data-testid="theme">{settings.theme}</span>
      <span data-testid="font">{settings.font}</span>
      <span data-testid="fontSize">{settings.fontSize}</span>
      <span data-testid="lineHeight">{settings.lineHeight}</span>

      <button onClick={() => setTheme("sepia")}>Mudar para Sepia</button>
      <button onClick={() => setTheme("dark")}>Mudar para Dark</button>
      <button onClick={() => patchSettings({ fontSize: 20, font: "merriweather" })}>
        Aumentar Fonte
      </button>
    </div>
  );
}

describe("ReaderSettingsContext", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-reading-theme");
    document.documentElement.classList.remove("dark");
  });

  it("deve lançar erro quando useReaderSettings é chamado fora do Provider", () => {
    // Silencia console.error para o teste esperado de erro do React
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      "useReaderSettings must be used within a ReaderSettingsProvider"
    );
    spy.mockRestore();
  });

  it("deve carregar configurações padrão e aplicar tema inicial no DOM", () => {
    render(
      <ReaderSettingsProvider>
        <TestConsumer />
      </ReaderSettingsProvider>
    );

    expect(screen.getByTestId("template")).toHaveTextContent("modern");
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
    expect(screen.getByTestId("font")).toHaveTextContent("inter");
    expect(screen.getByTestId("fontSize")).toHaveTextContent("16");
    expect(document.documentElement.getAttribute("data-reading-theme")).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("deve carregar configurações salvas no localStorage", () => {
    localStorage.setItem(
      READER_SETTINGS_STORAGE,
      JSON.stringify({ theme: "dark", fontSize: 22, template: "zen" })
    );

    render(
      <ReaderSettingsProvider>
        <TestConsumer />
      </ReaderSettingsProvider>
    );

    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(screen.getByTestId("fontSize")).toHaveTextContent("22");
    expect(screen.getByTestId("template")).toHaveTextContent("zen");
    expect(document.documentElement.getAttribute("data-reading-theme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("deve alterar tema, atualizar DOM e persistir no localStorage", () => {
    render(
      <ReaderSettingsProvider>
        <TestConsumer />
      </ReaderSettingsProvider>
    );

    // Muda para sépia
    fireEvent.click(screen.getByText("Mudar para Sepia"));
    expect(screen.getByTestId("theme")).toHaveTextContent("sepia");
    expect(document.documentElement.getAttribute("data-reading-theme")).toBe("sepia");
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    // Muda para dark
    fireEvent.click(screen.getByText("Mudar para Dark"));
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(document.documentElement.getAttribute("data-reading-theme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    const saved = JSON.parse(localStorage.getItem(READER_SETTINGS_STORAGE) ?? "{}");
    expect(saved.theme).toBe("dark");
  });

  it("deve aplicar patchSettings e atualizar múltiplos campos", () => {
    render(
      <ReaderSettingsProvider>
        <TestConsumer />
      </ReaderSettingsProvider>
    );

    fireEvent.click(screen.getByText("Aumentar Fonte"));
    expect(screen.getByTestId("fontSize")).toHaveTextContent("20");
    expect(screen.getByTestId("font")).toHaveTextContent("merriweather");

    const saved = JSON.parse(localStorage.getItem(READER_SETTINGS_STORAGE) ?? "{}");
    expect(saved.fontSize).toBe(20);
    expect(saved.font).toBe("merriweather");
  });

  it("deve sincronizar alterações disparadas pelo evento StorageEvent de outras abas", () => {
    render(
      <ReaderSettingsProvider>
        <TestConsumer />
      </ReaderSettingsProvider>
    );

    act(() => {
      const storageEvent = new StorageEvent("storage", {
        key: READER_SETTINGS_STORAGE,
        newValue: JSON.stringify({ theme: "dark", template: "ai-study" }),
      });
      window.dispatchEvent(storageEvent);
    });

    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(screen.getByTestId("template")).toHaveTextContent("ai-study");
    expect(document.documentElement.getAttribute("data-reading-theme")).toBe("dark");
  });
});

describe("getFontFamilyClass", () => {
  it("deve retornar as classes CSS adequadas para cada família tipográfica", () => {
    expect(getFontFamilyClass("merriweather")).toContain("font-merriweather");
    expect(getFontFamilyClass("lora")).toContain("font-lora");
    expect(getFontFamilyClass("roboto")).toContain("font-roboto");
    expect(getFontFamilyClass("literata")).toContain("font-literata");
    expect(getFontFamilyClass("mono")).toContain("font-mono");
    expect(getFontFamilyClass("inter")).toContain("font-inter");
    expect(getFontFamilyClass("sans")).toContain("font-inter");
  });
});
