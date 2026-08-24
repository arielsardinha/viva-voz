import { renderHook } from "@testing-library/react";
import { useIsMobile } from "./use-mobile";

describe("useIsMobile", () => {
  const originalInnerWidth = window.innerWidth;

  afterEach(() => {
    window.innerWidth = originalInnerWidth;
  });

  it("deve retornar false quando a largura da janela for de desktop (>= 768px)", () => {
    window.innerWidth = 1024;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("deve retornar true quando a largura da janela for de mobile (< 768px)", () => {
    window.innerWidth = 500;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });
});
