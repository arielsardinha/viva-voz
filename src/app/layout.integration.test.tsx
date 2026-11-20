import fs from "fs";
import path from "path";
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

jest.mock("next/font/local", () => ({
  __esModule: true,
  default: (options: { variable?: string }) => {
    const variableName = options.variable ?? "--font-unknown";
    return {
      className: `class-${variableName.replace(/^--/, "")}`,
      variable: `var-${variableName.replace(/^--/, "")}`,
      style: { fontFamily: `mock-${variableName}` },
    };
  },
}));

jest.mock("@vercel/analytics/next", () => ({
  Analytics: () => null,
}));

jest.mock("@vercel/speed-insights/next", () => ({
  SpeedInsights: () => null,
}));

jest.mock("@/components/clarity", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/pwa/pwa-register", () => ({
  PwaRegister: () => null,
}));

jest.mock("@/components/ui/sonner", () => ({
  Toaster: () => null,
}));

jest.mock("@/app/actions/gemini-key.actions", () => ({
  saveGeminiApiKeyAction: jest.fn().mockResolvedValue({ success: true }),
  removeGeminiApiKeyAction: jest.fn().mockResolvedValue({ success: true }),
  getGeminiApiKeyStatusAction: jest.fn().mockResolvedValue({ hasKey: false }),
}));

import RootLayout from "./layout";
import { getFontFamilyClass, useReaderSettings, type ReadingFont } from "@/context/reader-settings-context";
import { useGeminiApiKey } from "@/hooks/use-gemini-api-key";

const EXPECTED_FONT_VARS = [
  "var-font-inter",
  "var-font-merriweather",
  "var-font-lora",
  "var-font-roboto",
  "var-font-literata",
];

const READER_FONT_CLASS_MAP: Array<{ id: ReadingFont; expectedClass: string }> = [
  { id: "inter", expectedClass: "font-inter" },
  { id: "merriweather", expectedClass: "font-merriweather" },
  { id: "lora", expectedClass: "font-lora" },
  { id: "roboto", expectedClass: "font-roboto" },
  { id: "literata", expectedClass: "font-literata" },
];

function FontIntegrationHarness() {
  const { settings, patchSettings } = useReaderSettings();
  const { isChecking } = useGeminiApiKey();

  return (
    <div>
      <span data-testid="gemini-checking">{isChecking ? "loading" : "ready"}</span>
      <p data-testid="reading-sample" className={getFontFamilyClass(settings.font)}>
        Amostra tipografica VivaVoz
      </p>
      {READER_FONT_CLASS_MAP.map((font) => (
        <button
          key={font.id}
          type="button"
          onClick={() => patchSettings({ font: font.id })}
        >
          Aplicar {font.id}
        </button>
      ))}
    </div>
  );
}

describe("RootLayout + Fontes Locais Integracao", () => {
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    localStorage.clear();
    consoleErrorSpy = jest.spyOn(console, "error");
    consoleWarnSpy = jest.spyOn(console, "warn");
  });

  afterEach(() => {
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it("deve aplicar lang='pt-BR' e todas as 5 classes de variaveis de fonte no elemento html", () => {
    const rootTree = RootLayout({
      children: <main>Conteudo</main>,
    }) as React.ReactElement<{
      lang: string;
      className: string;
      children: React.ReactElement<{ children: React.ReactNode }>;
    }>;

    expect(rootTree.type).toBe("html");
    expect(rootTree.props.lang).toBe("pt-BR");

    for (const fontVarClass of EXPECTED_FONT_VARS) {
      expect(rootTree.props.className).toContain(fontVarClass);
    }
  });

  it("deve integrar os providers do RootLayout e alternar entre as 5 fontes locais", async () => {
    const rootTree = RootLayout({
      children: <FontIntegrationHarness />,
    }) as React.ReactElement<{
      children: React.ReactElement<{ children: React.ReactNode }>;
    }>;

    // Renderiza apenas o conteudo interno do <body> para evitar validateDOMNesting (<html> dentro de <div>)
    const bodyElement = rootTree.props.children;
    const bodyChildren = React.Children.toArray(bodyElement.props.children).filter(
      (child) => React.isValidElement(child) && child.type !== "script"
    );

    render(<>{bodyChildren}</>);

    await waitFor(() => {
      expect(screen.getByTestId("gemini-checking")).toHaveTextContent("ready");
    });

    const sample = screen.getByTestId("reading-sample");
    expect(sample).toHaveClass("font-inter");

    for (const font of READER_FONT_CLASS_MAP) {
      fireEvent.click(screen.getByRole("button", { name: `Aplicar ${font.id}` }));
      expect(sample).toHaveClass(font.expectedClass);
    }
  });

  it("deve manter todas as variaveis CSS das 5 fontes mapeadas em src/app/globals.css", () => {
    const globalsCss = fs.readFileSync(
      path.resolve(process.cwd(), "src", "app", "globals.css"),
      "utf8"
    );

    const requiredTokens = [
      "--font-inter",
      "--font-merriweather",
      "--font-lora",
      "--font-roboto",
      "--font-literata",
      ".font-inter",
      ".font-merriweather",
      ".font-lora",
      ".font-roboto",
      ".font-literata",
    ];

    for (const token of requiredTokens) {
      expect(globalsCss).toContain(token);
    }
  });
});
