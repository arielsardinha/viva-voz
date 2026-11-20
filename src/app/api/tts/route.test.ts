import { POST } from "./route";
import * as cookieService from "@/lib/ai/server/gemini-cookie.service";
import { resetTtsModelCooldowns } from "@/lib/ai/server/tts-fallback.service";
import {
  TTS_FALLBACK_HEADER,
  TTS_MODEL_HEADER,
  TTS_MODEL_LABEL_HEADER,
} from "@/lib/tts-models";

jest.mock("@/lib/ai/server/gemini-cookie.service", () => ({
  getGeminiKeyCookie: jest.fn(),
}));

describe("/api/tts Route Handler", () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    resetTtsModelCooldowns();
    process.env = { ...originalEnv };
    (cookieService.getGeminiKeyCookie as jest.Mock).mockResolvedValue(null);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
  });

  it("deve retornar 400 para requisição com corpo inválido", async () => {
    const req = new Request("http://localhost/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}), // text ausente
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Requisição inválida.");
  });

  it("deve retornar 401 se nenhuma chave de API for fornecida nem no body nem no cookie", async () => {
    const req = new Request("http://localhost/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Texto para narrar", voice: "Kore" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain("Chave do Google AI Studio não configurada");
  });

  it("deve utilizar a chave do cookie HttpOnly quando disponível e expor headers do modelo primário", async () => {
    (cookieService.getGeminiKeyCookie as jest.Mock).mockResolvedValue("cookie_key_valid_12345678");

    const mockBase64Pcm = btoa(String.fromCharCode(0, 0, 0, 0));
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: jest.fn().mockResolvedValue({
        steps: [
          {
            type: "model_output",
            content: [{ type: "audio", data: mockBase64Pcm }],
          },
        ],
      }),
    });

    const req = new Request("http://localhost/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "Texto usando cookie seguro",
        voice: "Kore",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get(TTS_MODEL_HEADER)).toBe("gemini-3.8-flash-tts");
    expect(res.headers.get(TTS_MODEL_LABEL_HEADER)).toBe("Gemini 3.8 Flash TTS");
    expect(res.headers.get(TTS_FALLBACK_HEADER)).toBe("false");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("generativelanguage.googleapis.com/v1beta/interactions"),
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-goog-api-key": "cookie_key_valid_12345678",
        }),
      }),
    );
  });

  it("deve realizar fallback automático e marcar X-TTS-Fallback=true quando o modelo primário retornar 429", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const mockBase64Pcm = btoa(String.fromCharCode(1, 2, 3, 4));

    global.fetch = jest.fn().mockImplementation((_url: string, init?: RequestInit) => {
      const payload = JSON.parse(String(init?.body ?? "{}")) as { model?: string };
      if (payload.model === "gemini-3.8-flash-tts") {
        return Promise.resolve({
          ok: false,
          status: 429,
          headers: new Headers(),
          text: jest.fn().mockResolvedValue("Rate limit exceeded"),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: jest.fn().mockResolvedValue({
          steps: [
            {
              type: "model_output",
              content: [{ type: "audio", data: mockBase64Pcm }],
            },
          ],
        }),
      });
    });

    const req = new Request("http://localhost/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "Frase com fallback automático",
        voice: "Kore",
        userApiKey: "valid_api_key_longer_than_10_chars",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("audio/wav");
    expect(res.headers.get(TTS_MODEL_HEADER)).toBe("gemini-3.8-flash-lite-tts");
    expect(res.headers.get(TTS_MODEL_LABEL_HEADER)).toBe("Gemini 3.8 Flash-Lite TTS");
    expect(res.headers.get(TTS_FALLBACK_HEADER)).toBe("true");
    errorSpy.mockRestore();
  });

  it("deve repassar o erro upstream 429 quando toda a cascata exceder a cota do Gemini", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers(),
      text: jest.fn().mockResolvedValue("Rate limit exceeded"),
    });

    const req = new Request("http://localhost/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "Frase para narrar",
        voice: "Kore",
        userApiKey: "valid_api_key_longer_than_10_chars",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toContain("Cota de narração com IA esgotada");
    errorSpy.mockRestore();
  });

  it("deve converter o áudio base64 retornado pelo Gemini em arquivo WAV e retornar com status 200", async () => {
    const mockBase64Pcm = btoa(String.fromCharCode(0, 0, 0, 0));

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: jest.fn().mockResolvedValue({
        steps: [
          {
            type: "model_output",
            content: [{ type: "audio", data: mockBase64Pcm }],
          },
        ],
      }),
    });

    const req = new Request("http://localhost/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "Texto de narração com voz de IA.",
        voice: "Puck",
        userApiKey: "valid_api_key_longer_than_10_chars",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("audio/wav");

    const arrayBuffer = await res.arrayBuffer();
    expect(arrayBuffer.byteLength).toBeGreaterThan(44); // 44 bytes de cabeçalho WAV + PCM

    const headerBytes = new Uint8Array(arrayBuffer.slice(0, 12));
    const headerStr = String.fromCharCode(...headerBytes);
    expect(headerStr.startsWith("RIFF")).toBe(true);
    expect(headerStr.includes("WAVE")).toBe(true);
  });

  it("deve retornar status 502 se nenhum modelo da cascata retornar dados de áudio", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: jest.fn().mockResolvedValue({
        steps: [],
        candidates: [],
      }),
    });

    const req = new Request("http://localhost/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "Texto sem áudio",
        voice: "Kore",
        userApiKey: "valid_api_key_longer_than_10_chars",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toContain("A IA não retornou áudio");
    errorSpy.mockRestore();
  });

  it("deve ignorar chaves no servidor e exigir que o userApiKey seja enviado na requisição ou em cookie (BYOK)", async () => {
    process.env.GEMINI_API_KEY = "dummy_server_key";
    process.env.GOOGLE_API_KEY = "dummy_server_key";

    const req = new Request("http://localhost/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "Texto de teste",
        voice: "Kore",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain("Chave do Google AI Studio não configurada");
  });
});
