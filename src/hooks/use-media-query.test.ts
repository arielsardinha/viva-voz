import { renderHook, act } from "@testing-library/react";
import { useMediaQuery } from "./use-media-query";

describe("useMediaQuery", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("deve inicializar com o valor de matches do matchMedia", () => {
    jest.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    const { result } = renderHook(() => useMediaQuery("(min-width: 1024px)"));
    expect(result.current).toBe(true);
  });

  it("deve atualizar o estado quando o evento 'change' do media query disparar", () => {
    let listenerFn: (() => void) | null = null;

    const mockMql = {
      matches: false,
      media: "(min-width: 768px)",
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn((_event: string, cb: unknown) => {
        listenerFn = cb as () => void;
      }),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    };

    jest.spyOn(window, "matchMedia").mockReturnValue(mockMql as unknown as MediaQueryList);

    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(false);

    expect(typeof listenerFn).toBe("function");

    act(() => {
      mockMql.matches = true;
      listenerFn?.();
    });

    expect(result.current).toBe(true);
  });
});
