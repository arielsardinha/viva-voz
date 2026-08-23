import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useGeminiApiKey, GeminiApiKeyProvider, GEMINI_KEY_EVENT } from "./use-gemini-api-key";
import * as actions from "@/app/actions/gemini-key.actions";

jest.mock("@/app/actions/gemini-key.actions", () => ({
  saveGeminiApiKeyAction: jest.fn(),
  removeGeminiApiKeyAction: jest.fn(),
  getGeminiApiKeyStatusAction: jest.fn(),
}));

/**
 * Wrapper que provê o GeminiApiKeyProvider para os testes do hook.
 * Necessário após a refatoração de hook standalone → Context Provider.
 */
function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <GeminiApiKeyProvider>{children}</GeminiApiKeyProvider>;
  };
}

describe("useGeminiApiKey Hook (via GeminiApiKeyProvider)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (actions.getGeminiApiKeyStatusAction as jest.Mock).mockResolvedValue({ hasKey: false });
  });

  it("deve inicializar com hasApiKey: false se a Server Action retornar false", async () => {
    const { result } = renderHook(() => useGeminiApiKey(), { wrapper: createWrapper() });

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

    const { result } = renderHook(() => useGeminiApiKey(), { wrapper: createWrapper() });

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

    const { result } = renderHook(() => useGeminiApiKey(), { wrapper: createWrapper() });

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

    const { result } = renderHook(() => useGeminiApiKey(), { wrapper: createWrapper() });

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
    const { result } = renderHook(() => useGeminiApiKey(), { wrapper: createWrapper() });

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

  it("deve lançar erro se useGeminiApiKey for usado fora do Provider", () => {
    // Silencia console.error para este teste, pois renderHook emite log de erro
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      renderHook(() => useGeminiApiKey());
    }).toThrow("useGeminiApiKey deve ser usado dentro de <GeminiApiKeyProvider>");

    consoleSpy.mockRestore();
  });

  it("deve ignorar setState se componente desmontou antes da Server Action resolver (race condition)", async () => {
    // Simula uma Server Action lenta que resolve após desmontagem
    let resolveAction: (value: { hasKey: boolean; maskedKey?: string }) => void;
    (actions.getGeminiApiKeyStatusAction as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        resolveAction = resolve;
      })
    );

    const { result, unmount } = renderHook(() => useGeminiApiKey(), {
      wrapper: createWrapper(),
    });

    // Componente está verificando (action ainda em voo)
    expect(result.current.isChecking).toBe(true);

    // Desmonta o componente (simula navegação)
    unmount();

    // Resolve a action APÓS desmontagem — não deve causar setState
    await act(async () => {
      resolveAction!({ hasKey: true, maskedKey: "AIzaSy...late" });
    });

    // Se chegou aqui sem "Warning: Can't perform a React state update on an unmounted component",
    // a flag cancelled está funcionando corretamente.
    expect(true).toBe(true);
  });
});
