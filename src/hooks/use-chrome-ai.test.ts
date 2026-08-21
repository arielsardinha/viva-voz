import { renderHook, act, waitFor } from "@testing-library/react";
import { useChromeAi } from "./use-chrome-ai";
import { checkChromeAiAvailability } from "@/lib/client/chrome-ai";
import { toast } from "sonner";

jest.mock("@/lib/client/chrome-ai", () => ({
  checkChromeAiAvailability: jest.fn(),
  streamChromeAiPrompt: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

const mockCheckAvailability = checkChromeAiAvailability as jest.MockedFunction<
  typeof checkChromeAiAvailability
>;

describe("useChromeAi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("deve carregar o status inicial como 'readily' quando a IA estiver disponível", async () => {
    mockCheckAvailability.mockResolvedValue("readily");

    const { result, unmount } = renderHook(() => useChromeAi({ pollIntervalMs: 0 }));

    await waitFor(() => {
      expect(result.current.status).toBe("readily");
    });
    expect(result.current.isReady).toBe(true);
    expect(result.current.isChecking).toBe(false);

    unmount();
  });

  it("deve atualizar o status para 'readily' e emitir notificação quando o foco da janela for disparado", async () => {
    mockCheckAvailability
      .mockResolvedValueOnce("no")
      .mockResolvedValueOnce("readily");

    const { result, unmount } = renderHook(() => useChromeAi({ pollIntervalMs: 0 }));

    await waitFor(() => {
      expect(result.current.status).toBe("no");
    });
    expect(result.current.isReady).toBe(false);

    // Dispara foco na janela (ex: usuário voltou da aba chrome://flags)
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });

    await waitFor(() => {
      expect(result.current.status).toBe("readily");
    });
    expect(result.current.isReady).toBe(true);
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("Gemini Nano detectado e ativo!"),
    );

    unmount();
  });

  it("deve permitir checagem manual com checkNow", async () => {
    mockCheckAvailability
      .mockResolvedValueOnce("no")
      .mockResolvedValueOnce("after-download");

    const { result, unmount } = renderHook(() => useChromeAi({ pollIntervalMs: 0 }));

    await waitFor(() => {
      expect(result.current.status).toBe("no");
    });

    let newStatus: string | undefined;
    await act(async () => {
      newStatus = await result.current.checkNow();
    });

    expect(newStatus).toBe("after-download");
    expect(result.current.status).toBe("after-download");
    expect(result.current.isDownloading).toBe(true);

    unmount();
  });
});
