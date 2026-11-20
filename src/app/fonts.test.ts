import fs from "fs";
import path from "path";
import localFont from "next/font/local";

jest.mock("next/font/local", () => ({
  __esModule: true,
  default: jest.fn((options: { variable?: string }) => {
    const variableName = options.variable ?? "--font-unknown";
    return {
      className: `mock-class-${variableName}`,
      variable: `mock-${variableName}`,
      style: {
        fontFamily: `mock-family-${variableName}`,
      },
    };
  }),
}));

import {
  inter,
  merriweather,
  lora,
  roboto,
  literata,
  ROOT_FONT_VARIABLE_CLASSES,
} from "./fonts";

interface ExpectedFontConfig {
  name: string;
  instance: { variable: string; className: string; style: { fontFamily: string } };
  src: string;
  fileName: string;
  weight: string;
  variable: string;
  adjustFontFallback: "Arial" | "Times New Roman";
  preload: boolean;
}

describe("app/fonts (Self-Hosted Local Fonts)", () => {
  const appDir = path.resolve(process.cwd(), "src", "app");
  const fontsDir = path.join(appDir, "fonts");

  const expectedConfigs: ExpectedFontConfig[] = [
    {
      name: "inter",
      instance: inter,
      src: "./fonts/inter-latin-wght-normal.woff2",
      fileName: "inter-latin-wght-normal.woff2",
      weight: "100 900",
      variable: "--font-inter",
      adjustFontFallback: "Arial",
      preload: true,
    },
    {
      name: "merriweather",
      instance: merriweather,
      src: "./fonts/merriweather-latin-wght-normal.woff2",
      fileName: "merriweather-latin-wght-normal.woff2",
      weight: "300 900",
      variable: "--font-merriweather",
      adjustFontFallback: "Times New Roman",
      preload: false,
    },
    {
      name: "lora",
      instance: lora,
      src: "./fonts/lora-latin-wght-normal.woff2",
      fileName: "lora-latin-wght-normal.woff2",
      weight: "400 700",
      variable: "--font-lora",
      adjustFontFallback: "Times New Roman",
      preload: false,
    },
    {
      name: "roboto",
      instance: roboto,
      src: "./fonts/roboto-latin-wght-normal.woff2",
      fileName: "roboto-latin-wght-normal.woff2",
      weight: "100 900",
      variable: "--font-roboto",
      adjustFontFallback: "Arial",
      preload: false,
    },
    {
      name: "literata",
      instance: literata,
      src: "./fonts/literata-latin-wght-normal.woff2",
      fileName: "literata-latin-wght-normal.woff2",
      weight: "200 900",
      variable: "--font-literata",
      adjustFontFallback: "Times New Roman",
      preload: false,
    },
  ];

  it("deve registrar todas as 5 fontes com localFont e configuracoes exatas", () => {
    const calls = (localFont as unknown as jest.Mock).mock.calls.map(([options]) => options);
    expect(calls).toHaveLength(5);

    expectedConfigs.forEach((expected, index) => {
      const call = calls[index];
      expect(call).toEqual({
        src: expected.src,
        weight: expected.weight,
        style: "normal",
        variable: expected.variable,
        display: "swap",
        adjustFontFallback: expected.adjustFontFallback,
        preload: expected.preload,
      });
      expect(expected.instance.variable).toBe(`mock-${expected.variable}`);
    });
  });

  it("deve concatenar as 5 classes de variaveis CSS em ROOT_FONT_VARIABLE_CLASSES", () => {
    expect(ROOT_FONT_VARIABLE_CLASSES).toBe(
      "mock---font-inter mock---font-merriweather mock---font-lora mock---font-roboto mock---font-literata"
    );
  });

  it("deve conter todos os 5 binarios WOFF2 validos no disco com assinatura wOF2", () => {
    for (const expected of expectedConfigs) {
      const filePath = path.join(fontsDir, expected.fileName);
      expect(fs.existsSync(filePath)).toBe(true);

      const content = fs.readFileSync(filePath);
      expect(content.byteLength).toBeGreaterThan(20_000);
      expect(content.subarray(0, 4).toString("ascii")).toBe("wOF2");
    }
  });

  it("nao deve importar next/font/google em src/app/fonts.ts nem em src/app/layout.tsx", () => {
    const fontsSource = fs.readFileSync(path.join(appDir, "fonts.ts"), "utf8");
    const layoutSource = fs.readFileSync(path.join(appDir, "layout.tsx"), "utf8");

    expect(fontsSource).toContain('from "next/font/local"');
    expect(fontsSource).not.toContain("next/font/google");
    expect(layoutSource).not.toContain("next/font/google");
  });
});
