import { renderHook, act } from "@testing-library/react";
import { usePwaInstall } from "./use-pwa-install";

describe("usePwaInstall", () => {
  beforeEach(() => {
    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: false,
      addListener: jest.fn(),
      removeListener: jest.fn(),
    }));
  });

  it("deve iniciar com canInstall=false quando não há evento nem iOS", () => {
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.canInstall).toBe(false);
    expect(result.current.isInstalled).toBe(false);
  });

  it("deve habilitar canInstall quando o evento beforeinstallprompt é disparado", () => {
    const { result } = renderHook(() => usePwaInstall());

    const mockEvent = new Event("beforeinstallprompt") as any;
    mockEvent.prompt = jest.fn().mockResolvedValue(undefined);
    mockEvent.userChoice = Promise.resolve({ outcome: "accepted", platform: "web" });

    act(() => {
      window.dispatchEvent(mockEvent);
    });

    expect(result.current.canInstall).toBe(true);
  });

  it("deve chamar prompt() e retornar o resultado ao executar promptInstall()", async () => {
    const { result } = renderHook(() => usePwaInstall());

    const mockEvent = new Event("beforeinstallprompt") as any;
    mockEvent.prompt = jest.fn().mockResolvedValue(undefined);
    mockEvent.userChoice = Promise.resolve({ outcome: "accepted", platform: "web" });

    act(() => {
      window.dispatchEvent(mockEvent);
    });

    let outcome: string = "";
    await act(async () => {
      outcome = await result.current.promptInstall();
    });

    expect(mockEvent.prompt).toHaveBeenCalled();
    expect(outcome).toBe("accepted");
  });

  it("deve marcar isInstalled como true quando o evento appinstalled for disparado", () => {
    const { result } = renderHook(() => usePwaInstall());

    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });

    expect(result.current.isInstalled).toBe(true);
    expect(result.current.canInstall).toBe(false);
  });
});
