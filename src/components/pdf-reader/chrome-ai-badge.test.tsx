import { render, screen } from "@testing-library/react";
import { ChromeAiBadge } from "./chrome-ai-badge";
import * as chromeAiHook from "@/hooks/use-chrome-ai";

jest.mock("@/hooks/use-chrome-ai");

describe("ChromeAiBadge", () => {
  const mockCheckNow = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (chromeAiHook.useChromeAi as jest.Mock).mockReturnValue({
      status: "no",
      isChecking: false,
      isReady: false,
      isDownloading: false,
      checkNow: mockCheckNow,
      lastChecked: null,
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it("deve renderizar 'Gemini 2.5 Flash' quando uma chave na nuvem estiver conectada", () => {
    const { unmount } = render(<ChromeAiBadge hasCloudKey={true} />);

    expect(screen.getByText("Gemini 2.5 Flash")).toBeInTheDocument();
    unmount();
  });

  it("deve renderizar 'Gemini Nano' quando a IA local estiver pronta (readily) e não houver chave na nuvem", () => {
    (chromeAiHook.useChromeAi as jest.Mock).mockReturnValue({
      status: "readily",
      isChecking: false,
      isReady: true,
      isDownloading: false,
      checkNow: mockCheckNow,
      lastChecked: null,
    });

    const { unmount } = render(<ChromeAiBadge hasCloudKey={false} />);

    expect(screen.getByText(/Gemini Nano/i)).toBeInTheDocument();
    unmount();
  });

  it("deve renderizar 'Baixando Modelo...' quando o status for 'after-download'", () => {
    (chromeAiHook.useChromeAi as jest.Mock).mockReturnValue({
      status: "after-download",
      isChecking: false,
      isReady: false,
      isDownloading: true,
      checkNow: mockCheckNow,
      lastChecked: null,
    });

    const { unmount } = render(<ChromeAiBadge hasCloudKey={false} />);

    expect(screen.getByText("Baixando Modelo...")).toBeInTheDocument();
    unmount();
  });

  it("deve renderizar 'IA Não Conectada' quando não houver chave nem IA local pronta", () => {
    const { unmount } = render(<ChromeAiBadge hasCloudKey={false} />);

    expect(screen.getByText("IA Não Conectada")).toBeInTheDocument();
    unmount();
  });
});
