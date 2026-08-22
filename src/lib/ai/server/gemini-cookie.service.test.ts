import {
  setGeminiKeyCookie,
  getGeminiKeyCookie,
  hasGeminiKeyCookie,
  clearGeminiKeyCookie,
  G_GEMINI_KEY_COOKIE,
  encryptGeminiKey,
  decryptGeminiKey,
} from "./gemini-cookie.service";
import { cookies } from "next/headers";

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

describe("gemini-cookie.service", () => {
  const originalEnv = process.env;
  let mockCookieStore: {
    get: jest.Mock;
    set: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, SESSION_SECRET: "test-super-secret-key-32-chars-long!" };
    mockCookieStore = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };
    (cookies as unknown as jest.Mock).mockResolvedValue(mockCookieStore);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("Criptografia AES-256-GCM", () => {
    it("deve cifrar e decifrar uma chave Gemini com sucesso", () => {
      const originalKey = "AIzaSyDummyTestKey1234567890";
      const encrypted = encryptGeminiKey(originalKey);

      expect(encrypted).not.toBe(originalKey);
      expect(encrypted.split(".").length).toBe(3); // iv.tag.ciphertext

      const decrypted = decryptGeminiKey(encrypted);
      expect(decrypted).toBe(originalKey);
    });

    it("deve retornar null para strings corrompidas ou inválidas", () => {
      expect(decryptGeminiKey("invalido")).toBeNull();
      expect(decryptGeminiKey("a.b.c")).toBeNull();
      expect(decryptGeminiKey("")).toBeNull();
    });
  });

  describe("setGeminiKeyCookie", () => {
    it("deve gravar a chave cifrada em um cookie HttpOnly com flags seguras", async () => {
      const apiKey = "AIzaSyValidApiKey123456";
      await setGeminiKeyCookie(apiKey);

      expect(mockCookieStore.set).toHaveBeenCalledTimes(1);
      const [cookieName, cookieValue, options] = mockCookieStore.set.mock.calls[0];

      expect(cookieName).toBe(G_GEMINI_KEY_COOKIE);
      expect(cookieValue).not.toBe(apiKey);
      expect(decryptGeminiKey(cookieValue)).toBe(apiKey);

      expect(options).toMatchObject({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });
      expect(options.maxAge).toBeGreaterThan(0);
    });
  });

  describe("getGeminiKeyCookie", () => {
    it("deve retornar a chave pura decifrada quando o cookie existir", async () => {
      const apiKey = "AIzaSyValidApiKey123456";
      const encrypted = encryptGeminiKey(apiKey);
      mockCookieStore.get.mockReturnValue({ value: encrypted });

      const result = await getGeminiKeyCookie();
      expect(result).toBe(apiKey);
      expect(mockCookieStore.get).toHaveBeenCalledWith(G_GEMINI_KEY_COOKIE);
    });

    it("deve retornar null quando o cookie não existir", async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const result = await getGeminiKeyCookie();
      expect(result).toBeNull();
    });

    it("deve retornar null quando o cookie contiver dados corrompidos", async () => {
      mockCookieStore.get.mockReturnValue({ value: "invalid.data.payload" });

      const result = await getGeminiKeyCookie();
      expect(result).toBeNull();
    });
  });

  describe("hasGeminiKeyCookie", () => {
    it("deve retornar true quando existir cookie válido", async () => {
      const apiKey = "AIzaSyValidApiKey123456";
      const encrypted = encryptGeminiKey(apiKey);
      mockCookieStore.get.mockReturnValue({ value: encrypted });

      const result = await hasGeminiKeyCookie();
      expect(result).toBe(true);
    });

    it("deve retornar false quando não houver cookie", async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const result = await hasGeminiKeyCookie();
      expect(result).toBe(false);
    });
  });

  describe("clearGeminiKeyCookie", () => {
    it("deve deletar o cookie do Gemini", async () => {
      await clearGeminiKeyCookie();

      expect(mockCookieStore.delete).toHaveBeenCalledWith(G_GEMINI_KEY_COOKIE);
    });
  });
});
