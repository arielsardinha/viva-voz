import { renderHook, act } from "@testing-library/react";
import { useGeminiApiKey, GEMINI_KEY_STORAGE, GEMINI_KEY_EVENT } from "./use-gemini-api-key";

describe("useGeminiApiKey Hook", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("deve inicializar com chave nula se o localStorage estiver vazio", () => {
    const { result } = renderHook(() => useGeminiApiKey());
    expect(result.current.apiKey).toBeNull();
    expect(result.current.hasApiKey).toBe(false);
  });

  it("deve inicializar com a chave existente no localStorage", () => {
    window.localStorage.setItem(GEMINI_KEY_STORAGE, "AIzaSy1234567890");
    const { result } = renderHook(() => useGeminiApiKey());
    expect(result.current.apiKey).toBe("AIzaSy1234567890");
    expect(result.current.hasApiKey).toBe(true);
  });

  it("deve atualizar a chave e salvar no localStorage", () => {
    const { result } = renderHook(() => useGeminiApiKey());

    act(() => {
      result.current.updateApiKey("AIzaSyNewKey123456");
    });

    expect(result.current.apiKey).toBe("AIzaSyNewKey123456");
    expect(result.current.hasApiKey).toBe(true);
    expect(window.localStorage.getItem(GEMINI_KEY_STORAGE)).toBe("AIzaSyNewKey123456");
  });

  it("deve remover a chave quando passado null ou string vazia", () => {
    window.localStorage.setItem(GEMINI_KEY_STORAGE, "AIzaSy1234567890");
    const { result } = renderHook(() => useGeminiApiKey());

    act(() => {
      result.current.updateApiKey(null);
    });

    expect(result.current.apiKey).toBeNull();
    expect(result.current.hasApiKey).toBe(false);
    expect(window.localStorage.getItem(GEMINI_KEY_STORAGE)).toBeNull();
  });

  it("deve reagir a eventos de custom event disparados em outros componentes", () => {
    const { result } = renderHook(() => useGeminiApiKey());
    expect(result.current.apiKey).toBeNull();

    act(() => {
      window.localStorage.setItem(GEMINI_KEY_STORAGE, "AIzaSyDispatchedKey");
      window.dispatchEvent(new CustomEvent(GEMINI_KEY_EVENT, { detail: "AIzaSyDispatchedKey" }));
    });

    expect(result.current.apiKey).toBe("AIzaSyDispatchedKey");
    expect(result.current.hasApiKey).toBe(true);
  });
});
