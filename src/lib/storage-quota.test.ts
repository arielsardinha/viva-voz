import {
  StorageQuotaExceededError,
  isQuotaExceededError,
  checkStorageAvailable,
} from "./storage-quota";

describe("storage-quota utils", () => {
  const originalStorage = navigator.storage;

  afterEach(() => {
    Object.defineProperty(navigator, "storage", {
      value: originalStorage,
      writable: true,
      configurable: true,
    });
  });

  describe("StorageQuotaExceededError", () => {
    it("deve criar uma instância com nome e mensagem padrão", () => {
      const err = new StorageQuotaExceededError();
      expect(err.name).toBe("StorageQuotaExceededError");
      expect(err.message).toContain("Memória interna insuficiente");
    });

    it("deve aceitar mensagem personalizada e detalhes", () => {
      const err = new StorageQuotaExceededError("Espaço esgotado", {
        requiredBytes: 1024,
        availableBytes: 512,
      });
      expect(err.message).toBe("Espaço esgotado");
      expect(err.requiredBytes).toBe(1024);
      expect(err.availableBytes).toBe(512);
    });
  });

  describe("isQuotaExceededError", () => {
    it("deve retornar true para instância de StorageQuotaExceededError", () => {
      expect(isQuotaExceededError(new StorageQuotaExceededError())).toBe(true);
    });

    it("deve retornar true para DOMException com nome QuotaExceededError", () => {
      const domError = new DOMException("Quota exceeded", "QuotaExceededError");
      expect(isQuotaExceededError(domError)).toBe(true);
    });

    it("deve retornar true para erros com código ou mensagem de quota", () => {
      const errorWithMessage = new Error("The quota has been exceeded");
      expect(isQuotaExceededError(errorWithMessage)).toBe(true);

      const legacyFirefoxError = { name: "NS_ERROR_DOM_QUOTA_REACHED" };
      expect(isQuotaExceededError(legacyFirefoxError)).toBe(true);
    });

    it("deve retornar false para erros normais", () => {
      expect(isQuotaExceededError(new Error("File not found"))).toBe(false);
      expect(isQuotaExceededError(null)).toBe(false);
      expect(isQuotaExceededError(undefined)).toBe(false);
    });
  });

  describe("checkStorageAvailable", () => {
    it("deve retornar hasSpace: true quando navigator.storage.estimate não estiver disponível", async () => {
      Object.defineProperty(navigator, "storage", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const res = await checkStorageAvailable(1024);
      expect(res.hasSpace).toBe(true);
      expect(res.isSupported).toBe(false);
    });

    it("deve retornar hasSpace: true quando houver quota e espaço livre suficiente", async () => {
      Object.defineProperty(navigator, "storage", {
        value: {
          estimate: jest.fn().mockResolvedValue({
            quota: 100 * 1024 * 1024, // 100MB
            usage: 20 * 1024 * 1024,  // 20MB (80MB livre)
          }),
        },
        writable: true,
        configurable: true,
      });

      const res = await checkStorageAvailable(5 * 1024 * 1024); // 5MB
      expect(res.hasSpace).toBe(true);
      expect(res.isSupported).toBe(true);
      expect(res.availableBytes).toBe(80 * 1024 * 1024);
    });

    it("deve retornar hasSpace: false quando o espaço livre for menor que o necessário + margem de segurança", async () => {
      Object.defineProperty(navigator, "storage", {
        value: {
          estimate: jest.fn().mockResolvedValue({
            quota: 10 * 1024 * 1024, // 10MB
            usage: 9.5 * 1024 * 1024, // 9.5MB (500KB livre, menor que a margem)
          }),
        },
        writable: true,
        configurable: true,
      });

      const res = await checkStorageAvailable(1024);
      expect(res.hasSpace).toBe(false);
      expect(res.isSupported).toBe(true);
    });

    it("deve retornar hasSpace: true em caso de falha no estimate() para não travar o usuário", async () => {
      Object.defineProperty(navigator, "storage", {
        value: {
          estimate: jest.fn().mockRejectedValue(new Error("Estimate failed")),
        },
        writable: true,
        configurable: true,
      });

      const res = await checkStorageAvailable(1024);
      expect(res.hasSpace).toBe(true);
    });
  });
});
