import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { POST as ttsPostHandler } from "@/app/api/tts/route";
import { resetTtsModelCooldowns } from "@/lib/ai/server/tts-fallback.service";
import * as cookieService from "@/lib/ai/server/gemini-cookie.service";
import { useTtsPlayer } from "@/hooks/use-tts-player";
import { ModernStudioTemplate } from "./reader-templates/modern-studio-template";
import { GOOGLE_VOICES, type TtsEngine } from "@/lib/tts-engines";
import type { ActiveTtsModelInfo } from "@/lib/tts-models";
import type { Sentence } from "@/lib/pdf-text";
import type { ReaderSettings } from "./ui/template-switcher";

jest.mock("@/lib/ai/server/gemini-cookie.service", () => ({
  getGeminiKeyCookie: jest.fn(),
}));

jest.mock("./ui/text-selection-menu", () => ({
  TextSelectionMenu: () => null,
}));

jest.mock("./ui/pages-drawer", () => ({
  PagesDrawer: () => null,
}));

function createMinimalWavBase64(): string {
  const buffer = new ArrayBuffer(48);
  const view = new DataView(buffer);
  const write = (offset: number, label: string) => {
    for (let i = 0; i < label.length; i++) view.setUint8(offset + i, label.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 40, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 24000, true);
  view.setUint32(28, 48000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, 4, true);
  return Buffer.from(buffer).toString("base64");
}

const integrationSentences: Sentence[] = [
  { index: 0, page: 1, text: "Primeira frase da página um." },
  { index: 1, page: 1, text: "Segunda frase da página um." },
  { index: 2, page: 2, text: "Primeira frase da página dois." },
  { index: 3, page: 2, text: "Segunda frase da página dois." },
];

const settings: ReaderSettings = {
  template: "modern",
  theme: "light",
  font: "sans",
  fontSize: 16,
  lineHeight: 1.8,
  speed: 1.0,
  hasCompletedOnboarding: true,
};

interface ReaderHarnessProps {
  onModelFallback?: (model: ActiveTtsModelInfo) => void;
  onEngineUnavailable?: (engine: TtsEngine, message: string) => void;
}

function ReaderIntegrationHarness({ onModelFallback, onEngineUnavailable }: ReaderHarnessProps) {
  const player = useTtsPlayer({
    sentences: integrationSentences,
    engine: "google",
    voice: "Kore",
    speed: 1,
    userApiKey: "AIzaSyIntegrationTestKey12345",
    onModelFallback,
    onEngineUnavailable,
  });

  return (
    <ModernStudioTemplate
      sentences={integrationSentences}
      currentIndex={player.currentIndex}
      title="Leitura Integrada"
      settings={settings}
      isPlaying={player.isPlaying}
      isBuffering={player.isBuffering}
      voice="Kore"
      speed="1"
      engine="google"
      activeTtsModel={player.activeTtsModel}
      voices={GOOGLE_VOICES}
      disabledEngines={[]}
      apiKey="AIzaSyIntegrationTestKey12345"
      onEngineChange={jest.fn()}
      onSelectSentence={player.jumpTo}
      onToggle={player.toggle}
      onPrevious={player.previous}
      onNext={player.next}
      onRestart={player.restart}
      onVoiceChange={jest.fn()}
      onSpeedChange={jest.fn()}
    />
  );
}

describe("TTS Fallback & Chunking - Integração UI + Hook + BFF (/api/tts)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    resetTtsModelCooldowns();
    (cookieService.getGeminiKeyCookie as jest.Mock).mockResolvedValue("AIzaSyIntegrationTestKey12345");
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("deve agrupar frases da página 1 em 1 requisição, fazer fallback de 3.8 Flash (429) para 3.8 Lite (200) e exibir o indicador discreto", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const onModelFallback = jest.fn();
    const bffRequests: string[] = [];
    const wavB64 = createMinimalWavBase64();

    global.fetch = jest.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url === "/api/tts") {
        const bodyObj = JSON.parse(String(init?.body ?? "{}")) as { text?: string };
        bffRequests.push(bodyObj.text ?? "");
        const req = new Request("http://localhost/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: String(init?.body ?? "{}"),
        });
        return ttsPostHandler(req);
      }

      if (url.includes("generativelanguage.googleapis.com")) {
        const upstreamBody = JSON.parse(String(init?.body ?? "{}")) as { model?: string };
        if (upstreamBody.model === "gemini-3.8-flash-tts") {
          return {
            ok: false,
            status: 429,
            headers: new Headers(),
            text: async () => "Quota exceeded",
          } as unknown as Response;
        }
        return {
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => ({
            steps: [
              {
                type: "model_output",
                content: [{ type: "audio", data: wavB64 }],
              },
            ],
          }),
        } as unknown as Response;
      }

      throw new Error(`URL inesperada no teste de integração: ${url}`);
    }) as typeof fetch;

    render(<ReaderIntegrationHarness onModelFallback={onModelFallback} />);

    const playButtons = screen.getAllByRole("button", { name: "Reproduzir" });
    fireEvent.click(playButtons[0]);

    await waitFor(() => {
      expect(onModelFallback).toHaveBeenCalledTimes(1);
    });

    // Verifica chunking: as 2 frases da página 1 foram agrupadas na primeira requisição
    expect(bffRequests[0]).toBe("Primeira frase da página um. Segunda frase da página um.");

    // Verifica indicador discreto na UI
    const indicators = await screen.findAllByTestId("tts-model-indicator");
    expect(indicators[0]).toHaveAttribute("data-tts-model", "gemini-3.8-flash-lite-tts");
    expect(indicators[0]).toHaveAttribute("data-tts-fallback", "true");
    expect(indicators[0]).toHaveTextContent("3.8 Lite");

    expect(onModelFallback).toHaveBeenCalledWith({
      id: "gemini-3.8-flash-lite-tts",
      label: "Gemini 3.8 Flash-Lite TTS",
      shortLabel: "3.8 Lite",
      isFallback: true,
    });

    errorSpy.mockRestore();
  });

  it("deve acionar onEngineUnavailable com mensagem sanitizada quando toda a cascata retornar 429", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const onEngineUnavailable = jest.fn();

    global.fetch = jest.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url === "/api/tts") {
        const req = new Request("http://localhost/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: String(init?.body ?? "{}"),
        });
        return ttsPostHandler(req);
      }

      if (url.includes("generativelanguage.googleapis.com")) {
        return {
          ok: false,
          status: 429,
          headers: new Headers(),
          text: async () => "RESOURCE_EXHAUSTED",
        } as unknown as Response;
      }

      throw new Error(`URL inesperada no teste de integração: ${url}`);
    }) as typeof fetch;

    render(<ReaderIntegrationHarness onEngineUnavailable={onEngineUnavailable} />);

    const playButtons = screen.getAllByRole("button", { name: "Reproduzir" });
    fireEvent.click(playButtons[0]);

    await waitFor(() => {
      expect(onEngineUnavailable).toHaveBeenCalledTimes(1);
    });

    const [failedEngine, userMessage] = onEngineUnavailable.mock.calls[0] as [TtsEngine, string];
    expect(failedEngine).toBe("google");
    expect(userMessage).toContain("Cota de narração com IA esgotada");
    expect(userMessage).not.toMatch(/\b429\b/);

    errorSpy.mockRestore();
  });
});
