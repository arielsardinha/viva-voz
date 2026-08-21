import { isStandaloneMode, isIosDevice, isSafariBrowser, registerServiceWorker } from "./pwa-utils";

describe("pwa-utils", () => {
  const originalNavigator = window.navigator;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("isStandaloneMode", () => {
    it("deve retornar true se matchMedia display-mode: standalone for verdadeiro", () => {
      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: query === "(display-mode: standalone)",
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      expect(isStandaloneMode()).toBe(true);
    });

    it("deve retornar false se não estiver em modo standalone", () => {
      window.matchMedia = jest.fn().mockImplementation(() => ({
        matches: false,
        media: "",
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      expect(isStandaloneMode()).toBe(false);
    });
  });

  describe("isIosDevice", () => {
    it("deve identificar iPhone como dispositivo iOS", () => {
      Object.defineProperty(window, "navigator", {
        value: {
          ...originalNavigator,
          userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        },
        writable: true,
      });

      expect(isIosDevice()).toBe(true);
    });

    it("deve retornar false para navegadores desktop normais", () => {
      Object.defineProperty(window, "navigator", {
        value: {
          ...originalNavigator,
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        writable: true,
      });

      expect(isIosDevice()).toBe(false);
    });
  });

  describe("isSafariBrowser", () => {
    it("deve identificar Safari", () => {
      Object.defineProperty(window, "navigator", {
        value: {
          ...originalNavigator,
          userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15",
        },
        writable: true,
      });

      expect(isSafariBrowser()).toBe(true);
    });

    it("deve retornar false se for Chrome (mesmo contendo Safari no userAgent)", () => {
      Object.defineProperty(window, "navigator", {
        value: {
          ...originalNavigator,
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        },
        writable: true,
      });

      expect(isSafariBrowser()).toBe(false);
    });
  });

  describe("registerServiceWorker", () => {
    it("deve registrar o service worker quando suportado pelo navegador", async () => {
      const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
      const mockRegister = jest.fn().mockResolvedValue({ scope: "/" });
      Object.defineProperty(window, "navigator", {
        value: {
          ...originalNavigator,
          serviceWorker: {
            register: mockRegister,
          },
        },
        writable: true,
      });

      const reg = await registerServiceWorker();
      expect(mockRegister).toHaveBeenCalledWith("/sw.js", { scope: "/" });
      expect(reg).toEqual({ scope: "/" });
      logSpy.mockRestore();
    });
  });
});
