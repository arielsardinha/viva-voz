import { POST } from "./route";
import * as geminiCookieService from "@/lib/ai/server/gemini-cookie.service";

jest.mock("@/lib/ai/server/gemini-cookie.service");

describe("API Route: /api/ocr/gemini (BFF OCR)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve retornar status 401 se nenhuma chave estiver presente", async () => {
    (geminiCookieService.getGeminiKeyCookie as jest.Mock).mockResolvedValue(null);

    const req = new Request("http://localhost:3000/api/ocr/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageBase64: "ZmFrZS1pbWFnZQ==",
        mimeType: "image/png",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain("Chave da API Gemini não encontrada");
  });

  it("deve retornar status 400 se o arquivo/imagem não for fornecido", async () => {
    (geminiCookieService.getGeminiKeyCookie as jest.Mock).mockResolvedValue("fake_gemini_key_12345");

    const req = new Request("http://localhost:3000/api/ocr/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // imageBase64 ausente
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Nenhum arquivo de imagem foi fornecido");
  });

  it("deve enviar a imagem para o Gemini Vision e retornar o texto extraído com sucesso", async () => {
    (geminiCookieService.getGeminiKeyCookie as jest.Mock).mockResolvedValue("fake_gemini_key_12345");

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: "Texto transcrito com sucesso da foto da página." }],
            },
          },
        ],
      }),
    });

    const req = new Request("http://localhost:3000/api/ocr/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageBase64: "ZmFrZS1pbWFnZS1iaW5hcnk=",
        mimeType: "image/jpeg",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.text).toBe("Texto transcrito com sucesso da foto da página.");
  });
});
