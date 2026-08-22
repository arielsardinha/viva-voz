import {
  saveGeminiApiKeyAction,
  removeGeminiApiKeyAction,
  getGeminiApiKeyStatusAction,
} from "./gemini-key.actions";
import * as cookieService from "@/lib/ai/server/gemini-cookie.service";

jest.mock("@/lib/ai/server/gemini-cookie.service", () => ({
  setGeminiKeyCookie: jest.fn(),
  getGeminiKeyCookie: jest.fn(),
  hasGeminiKeyCookie: jest.fn(),
  clearGeminiKeyCookie: jest.fn(),
}));

describe("gemini-key.actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("saveGeminiApiKeyAction", () => {
    it("deve salvar a chave no cookie quando válida", async () => {
      const validKey = "AIzaSyValidGeminiKey123456";
      (cookieService.setGeminiKeyCookie as jest.Mock).mockResolvedValue(undefined);

      const result = await saveGeminiApiKeyAction(validKey);

      expect(result).toEqual({ success: true });
      expect(cookieService.setGeminiKeyCookie).toHaveBeenCalledWith(validKey);
    });

    it("deve rejeitar chaves curtas ou vazias com erro amigável", async () => {
      const resultShort = await saveGeminiApiKeyAction("AIza");
      expect(resultShort).toEqual({
        success: false,
        error: "Informe uma chave válida do Google AI Studio (mínimo de 10 caracteres).",
      });
      expect(cookieService.setGeminiKeyCookie).not.toHaveBeenCalled();

      const resultEmpty = await saveGeminiApiKeyAction("   ");
      expect(resultEmpty).toEqual({
        success: false,
        error: "Informe uma chave válida do Google AI Studio (mínimo de 10 caracteres).",
      });
    });

    it("deve tratar erros inesperados de gravação graciosamente", async () => {
      (cookieService.setGeminiKeyCookie as jest.Mock).mockRejectedValue(new Error("Falha no cookie"));
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const result = await saveGeminiApiKeyAction("AIzaSyValidGeminiKey123456");

      expect(result).toEqual({
        success: false,
        error: "Não foi possível salvar a chave nos cookies seguros.",
      });
      consoleSpy.mockRestore();
    });
  });

  describe("removeGeminiApiKeyAction", () => {
    it("deve apagar o cookie e retornar sucesso", async () => {
      (cookieService.clearGeminiKeyCookie as jest.Mock).mockResolvedValue(undefined);

      const result = await removeGeminiApiKeyAction();

      expect(result).toEqual({ success: true });
      expect(cookieService.clearGeminiKeyCookie).toHaveBeenCalledTimes(1);
    });

    it("deve tratar erros ao apagar o cookie", async () => {
      (cookieService.clearGeminiKeyCookie as jest.Mock).mockRejectedValue(new Error("Erro delete"));
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const result = await removeGeminiApiKeyAction();

      expect(result).toEqual({
        success: false,
        error: "Não foi possível desconectar a chave dos cookies seguros.",
      });
      consoleSpy.mockRestore();
    });
  });

  describe("getGeminiApiKeyStatusAction", () => {
    it("deve retornar hasKey: true e maskedKey quando a chave existir", async () => {
      (cookieService.getGeminiKeyCookie as jest.Mock).mockResolvedValue("AIzaSyABC123456789XYZ");

      const result = await getGeminiApiKeyStatusAction();

      expect(result).toEqual({
        hasKey: true,
        maskedKey: "AIzaSy...XYZ",
      });
    });

    it("deve retornar hasKey: false quando não houver chave no cookie", async () => {
      (cookieService.getGeminiKeyCookie as jest.Mock).mockResolvedValue(null);

      const result = await getGeminiApiKeyStatusAction();

      expect(result).toEqual({
        hasKey: false,
      });
    });
  });
});
