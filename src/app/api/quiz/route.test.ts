import { POST } from "./route";
import * as cookieService from "@/lib/ai/server/gemini-cookie.service";
import type { Sentence } from "@/lib/pdf-text";
import { QUIZ_TOKEN_BUDGETS } from "@/lib/a2ui/quiz-content-planner";

jest.mock("@/lib/ai/server/gemini-cookie.service", () => ({
  getGeminiKeyCookie: jest.fn(),
}));

function makeSentences(count: number, wordsEach = 40, pages = 4): Sentence[] {
  return Array.from({ length: count }, (_, idx) => {
    const words = Array.from({ length: wordsEach }, (__, w) => `conceito${idx}_${w}`).join(" ");
    return {
      index: idx,
      page: Math.min(pages, Math.floor((idx * pages) / count) + 1),
      text: `Passagem ${idx + 1} sobre engenharia de software e arquitetura: ${words}.`,
    };
  });
}

function makeMockQuizJson(count: number): string {
  return JSON.stringify({
    questions: Array.from({ length: count }, (_, idx) => ({
      topic: `Tópico ${idx + 1}`,
      sentenceIndex: idx,
      prompt: `Qual é o foco da passagem ${idx + 1} no material estudado?`,
      evidenceQuote: `Passagem ${idx + 1} sobre engenharia de software`,
      explanation: `A passagem ${idx + 1} explica os fundamentos desta seção.`,
      hint: `Observe o parágrafo ${idx + 1}.`,
      options: [
        { id: "A", label: `Fundamento real da seção ${idx + 1}.`, isCorrect: true },
        { id: "B", label: `Distrator plausível B-${idx + 1}.`, isCorrect: false },
        { id: "C", label: `Distrator plausível C-${idx + 1}.`, isCorrect: false },
        { id: "D", label: `Distrator plausível D-${idx + 1}.`, isCorrect: false },
      ],
    })),
  });
}

describe("/api/quiz Route Handler (BYOK + Orçamento de Tokens)", () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    (cookieService.getGeminiKeyCookie as jest.Mock).mockResolvedValue(null);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
  });

  it("retorna 400 para corpo inválido ou lista de sentenças vazia", async () => {
    const badJsonReq = new Request("http://localhost/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "nao-json",
    });
    const res1 = await POST(badJsonReq);
    expect(res1.status).toBe(400);

    const emptySentencesReq = new Request("http://localhost/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sentences: [], difficulty: "normal" }),
    });
    const res2 = await POST(emptySentencesReq);
    expect(res2.status).toBe(400);
  });

  it("retorna 401 sem chave BYOK e ignora GEMINI_API_KEY/GOOGLE_API_KEY do servidor", async () => {
    process.env.GEMINI_API_KEY = "server_env_key_should_be_ignored";
    process.env.GOOGLE_API_KEY = "server_env_key_should_be_ignored";

    const req = new Request("http://localhost/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Guia",
        sentences: makeSentences(3, 20),
        difficulty: "normal",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain("Chave do Google AI Studio não configurada");
  });

  it("ignora userApiKey mascarada do client e prioriza cookie HttpOnly", async () => {
    (cookieService.getGeminiKeyCookie as jest.Mock).mockResolvedValue("AIzaSyRealCookieKey123456");

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: makeMockQuizJson(3) }] } }],
        usageMetadata: { promptTokenCount: 420, candidatesTokenCount: 280, totalTokenCount: 700 },
      }),
    }) as typeof fetch;

    const req = new Request("http://localhost/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Artigo",
        sentences: makeSentences(6, 25, 2),
        difficulty: "normal",
        userApiKey: "AIzaSy...xyz",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("models/gemini-2.5-flash:generateContent"),
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-goog-api-key": "AIzaSyRealCookieKey123456",
        }),
      }),
    );

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(callUrl).not.toContain("AIzaSy");

    const data = await res.json();
    expect(data.questions).toHaveLength(3);
    expect(data.modelId).toBe("gemini-2.5-flash");
    expect(data.tokenUsage).toEqual({
      promptTokenCount: 420,
      candidatesTokenCount: 280,
      totalTokenCount: 700,
    });
  });

  it("recalcula orçamento de tokens no servidor para documento >30k chars sem exceder 6000 tokens", async () => {
    (cookieService.getGeminiKeyCookie as jest.Mock).mockResolvedValue("AIzaSyRealCookieKey123456");

    let capturedBody = "";
    global.fetch = jest.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      capturedBody = String(init?.body ?? "");
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: makeMockQuizJson(10) }] } }],
        }),
      };
    }) as typeof fetch;

    // 140 frases x ~330 chars = ~46.200 chars (> 30k)
    const hugeSentences = makeSentences(140, 42, 20);
    const req = new Request("http://localhost/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Livro Extenso",
        sentences: hugeSentences,
        difficulty: "hard",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const payload = JSON.parse(capturedBody) as {
      generationConfig: { responseMimeType: string; responseSchema: unknown };
      contents: Array<{ parts: Array<{ text: string }> }>;
    };
    expect(payload.generationConfig.responseMimeType).toBe("application/json");
    expect(payload.generationConfig.responseSchema).toBeDefined();

    const userText = payload.contents[0].parts[0].text;
    const contextSection = userText.split("=== TRECHOS DO DOCUMENTO ===")[1] ?? "";
    expect(contextSection.trim().length).toBeLessThanOrEqual(
      QUIZ_TOKEN_BUDGETS.cloud.maxContextChars,
    );

    const data = await res.json();
    expect(data.questions).toHaveLength(10);
    expect(data.coverage.wasBudgetLimited).toBe(true);
    expect(data.coverage.estimatedInputTokens).toBeLessThanOrEqual(6000);
    expect(data.coverage.coveredPageRange).toEqual({ from: 1, to: 20 });
  });

  it("faz fallback de gemini-2.5-flash (429) para gemini-2.5-flash-lite (200)", async () => {
    (cookieService.getGeminiKeyCookie as jest.Mock).mockResolvedValue("AIzaSyRealCookieKey123456");

    global.fetch = jest.fn().mockImplementation(async (url: string) => {
      if (url.includes("gemini-2.5-flash:")) {
        return { ok: false, status: 429, json: async () => ({}) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: makeMockQuizJson(2) }] } }],
        }),
      };
    }) as typeof fetch;

    const req = new Request("http://localhost/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Fallback Test",
        sentences: makeSentences(3, 20, 1),
        difficulty: "normal",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.modelId).toBe("gemini-2.5-flash-lite");
    expect(data.questions).toHaveLength(2);
  });

  it("retorna erros sanitizados em 401, 429 total e JSON malformado sem vazar chave ou logs", async () => {
    (cookieService.getGeminiKeyCookie as jest.Mock).mockResolvedValue("AIzaSySecretLeakTest123");

    // 1. 401 upstream
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 }) as typeof fetch;
    const req1 = new Request("http://localhost/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sentences: makeSentences(2, 15, 1) }),
    });
    const res401 = await POST(req1);
    expect(res401.status).toBe(401);
    const body401 = await res401.json();
    expect(body401.error).toContain("recusada");
    expect(JSON.stringify(body401)).not.toContain("AIzaSySecretLeakTest123");

    // 2. 429 em toda cascata
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 429 }) as typeof fetch;
    const res429 = await POST(
      new Request("http://localhost/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentences: makeSentences(2, 15, 1) }),
      }),
    );
    expect(res429.status).toBe(429);
    const body429 = await res429.json();
    expect(body429.error).toContain("Limite temporário");

    // 3. JSON malformado
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "nao e json valido" }] } }],
      }),
    }) as typeof fetch;
    const res502 = await POST(
      new Request("http://localhost/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentences: makeSentences(2, 15, 1) }),
      }),
    );
    expect(res502.status).toBe(502);
    const body502 = await res502.json();
    expect(body502.error).toContain("formato inesperado");
  });
});
