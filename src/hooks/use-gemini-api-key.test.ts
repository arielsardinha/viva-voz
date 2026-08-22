import { renderHook, act, waitFor } from "@testing-library/react";
import { useGeminiApiKey, GEMINI_KEY_EVENT } from "./use-gemini-api-key";
import * as actions from "@/app/actions/gemini-key.actions";

jest.mock("@/app/actions/gemini-key.actions", () => ({
  saveGeminiApiKeyAction: jest.fn(),
  removeGeminiApiKeyAction: jest.fn(),
  getGeminiApiKeyStatusAction: jest.fn(),
}));

describe("useGeminiApiKey Hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (actions.getGeminiApiKeyStatusAction as jest.Mock).mockResolvedValue({ hasKey: false });
  });

  it("deve inicializar com hasApiKey: false se a Server Action retornar false", async () => {
    const { result } = renderHook(() => useGeminiApiKey());

    await waitFor(() => {
      expect(result.current.isChecking).toBe(false);
    });

    expect(result.current.apiKey).toBeNull();
    expect(result.current.hasApiKey).toBe(false);
    expect(actions.getGeminiApiKeyStatusAction).toHaveBeenCalledTimes(1);
  });

  it("deve inicializar com hasApiKey: true se a Server Action indicar cookie existente", async () => {
    (actions.getGeminiApiKeyStatusAction as jest.Mock).mockResolvedValue({
      hasKey: true,
      maskedKey: "AIzaSy...890",
    });

    const { result } = renderHook(() => useGeminiApiKey());

    await waitFor(() => {
      expect(result.current.hasApiKey).toBe(true);
    });

    expect(result.current.apiKey).toBe("AIzaSy...890");
    expect(result.current.hasApiKey).toBe(true);
    expect(result.current.maskedKey).toBe("AIzaSy...890");
  });

  it("deve chamar saveGeminiApiKeyAction ao atualizar a chave e emitir evento", async () => {
    (actions.saveGeminiApiKeyAction as jest.Mock).mockResolvedValue({ success: true });
    const dispatchSpy = jest.spyOn(window, "dispatchEvent");

    const { result } = renderHook(() => useGeminiApiKey());

    await waitFor(() => {
      expect(result.current.isChecking).toBe(false);
    });

    let success = false;
    await act(async () => {
      success = await result.current.updateApiKey("AIzaSyNewValidKey123");
    });

    expect(success).toBe(true);
    expect(actions.saveGeminiApiKeyAction).toHaveBeenCalledWith("AIzaSyNewValidKey123");
    expect(result.current.hasApiKey).toBe(true);
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: GEMINI_KEY_EVENT,
        detail: expect.objectContaining({ hasApiKey: true }),
      })
    );

    dispatchSpy.mockRestore();
  });

  it("deve chamar removeGeminiApiKeyAction ao desconectar (null) e atualizar estado", async () => {
    (actions.getGeminiApiKeyStatusAction as jest.Mock).mockResolvedValue({
      hasKey: true,
      maskedKey: "AIzaSy...890",
    });
    (actions.removeGeminiApiKeyAction as jest.Mock).mockResolvedValue({ success: true });
    const dispatchSpy = jest.spyOn(window, "dispatchEvent");

    const { result } = renderHook(() => useGeminiApiKey());

    await waitFor(() => {
      expect(result.current.hasApiKey).toBe(true);
    });

    let success = false;
    await act(async () => {
      success = await result.current.updateApiKey(null);
    });

    expect(success).toBe(true);
    expect(actions.removeGeminiApiKeyAction).toHaveBeenCalledTimes(1);
    expect(result.current.hasApiKey).toBe(false);
    expect(result.current.apiKey).toBeNull();
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: GEMINI_KEY_EVENT,
        detail: { hasApiKey: false },
      })
    );

    dispatchSpy.mockRestore();
  });

  it("deve reagir a eventos GEMINI_KEY_EVENT disparados em outros componentes", async () => {
    const { result } = renderHook(() => useGeminiApiKey());

    await waitFor(() => {
      expect(result.current.isChecking).toBe(false);
    });
    expect(result.current.hasApiKey).toBe(false);

    act(() => {
      window.dispatchEvent(
        new CustomEvent(GEMINI_KEY_EVENT, {
          detail: { hasApiKey: true, maskedKey: "AIzaSy...XYZ" },
        })
      );
    });

    expect(result.current.hasApiKey).toBe(true);
    expect(result.current.maskedKey).toBe("AIzaSy...XYZ");
  });
});
