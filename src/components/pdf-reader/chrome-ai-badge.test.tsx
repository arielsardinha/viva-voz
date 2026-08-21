import { render, screen, fireEvent, act } from "@testing-library/react";
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

  it("deve renderizar 'IA Não Conectada' e exibir instruções passo a passo ao abrir o popover", () => {
    const { unmount } = render(<ChromeAiBadge hasCloudKey={false} />);

    const badgeButton = screen.getByRole("button", {
      name: /Informações sobre o motor de inteligência artificial ativo/i,
    });
    expect(screen.getByText("IA Não Conectada")).toBeInTheDocument();

    act(() => {
      fireEvent.click(badgeButton);
    });

    expect(
      screen.getByText(/Como ativar a IA Local Gratuita \(Gemini Nano\):/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Prompt API/i)).toBeInTheDocument();
    expect(screen.getByText(/Enabled/i)).toBeInTheDocument();
    expect(screen.getByText(/Relaunch/i)).toBeInTheDocument();
    expect(screen.getByText(/chrome:\/\/flags\/#prompt-api-for-gemini-nano/i)).toBeInTheDocument();

    unmount();
  });

  it("deve permitir copiar a URL da flag e disparar checkNow ao clicar em Verificar", async () => {
    const writeTextMock = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    const { unmount } = render(<ChromeAiBadge hasCloudKey={false} />);

    const badgeButton = screen.getByRole("button", {
      name: /Informações sobre o motor de inteligência artificial ativo/i,
    });
    act(() => {
      fireEvent.click(badgeButton);
    });

    const copyButton = screen.getByRole("button", {
      name: /Copiar link da flag do Chrome/i,
    });
    await act(async () => {
      fireEvent.click(copyButton);
    });

    expect(writeTextMock).toHaveBeenCalledWith(
      "chrome://flags/#prompt-api-for-gemini-nano",
    );

    const verifyButton = screen.getByRole("button", {
      name: /Verificar disponibilidade da IA no navegador/i,
    });
    act(() => {
      fireEvent.click(verifyButton);
    });

    expect(mockCheckNow).toHaveBeenCalled();

    unmount();
  });
});
