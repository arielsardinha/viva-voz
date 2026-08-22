import { describeAskError, handleAskRequest } from "./ask-handler";
import * as cookieService from "@/lib/ai/server/gemini-cookie.service";

jest.mock("@/lib/ai/server/gemini-cookie.service", () => ({
  getGeminiKeyCookie: jest.fn(),
}));

jest.mock("@/lib/ai-gateway.server", () => ({
  createUserGeminiProvider: jest.fn().mockReturnValue(() => ({
    modelId: "gemini-2.5-flash",
  })),
}));

jest.mock("ai", () => ({
  convertToModelMessages: jest.fn().mockResolvedValue([]),
  streamText: jest.fn().mockReturnValue({
    toUIMessageStreamResponse: jest.fn().mockImplementation(
      () =>
        new globalThis.Response("streamed response content", {
          headers: { "content-type": "text/plain; charset=utf-8" },
        })
    ),
  }),
}));

describe("describeAskError", () => {
  it("deve tratar erros de créditos esgotados (402)", () => {
    const errorWithStatus = { status: 402, message: "Payment required" };
    expect(describeAskError(errorWithStatus)).toContain("Limite ou créditos da IA esgotados");

    const errorWithMessage = new Error("not enough credits on account");
    expect(describeAskError(errorWithMessage)).toContain("Limite ou créditos da IA esgotados");
  });

  it("deve tratar erros de rate limit (429)", () => {
    const error = { statusCode: 429 };
    expect(describeAskError(error)).toContain("Muitas perguntas em pouco tempo");
  });

  it("deve tratar erros de chave de API inválida (401 / 403 / mensagem com api key)", () => {
    const error401 = { status: 401 };
    expect(describeAskError(error401)).toContain("A chave do Gemini informada foi recusada");

    const errorKeyMsg = new Error("Invalid API key provided");
    expect(describeAskError(errorKeyMsg)).toContain("A chave do Gemini informada foi recusada");
  });

  it("deve tratar erros de servidor upstream (500+)", () => {
    const error500 = { status: 503 };
    expect(describeAskError(error500)).toContain("O serviço do Gemini está temporariamente indisponível");
  });

  it("deve formatar erro genérico com a mensagem original", () => {
    const generic = new Error("Falha na conexão");
    expect(describeAskError(generic)).toBe("Não foi possível consultar a IA: Falha na conexão");
  });
});

describe("handleAskRequest", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    (cookieService.getGeminiKeyCookie as jest.Mock).mockResolvedValue(null);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("deve retornar status 400 para corpo de requisição não-JSON", async () => {
    const request = new Request("http://localhost/api/ask", {
      method: "POST",
      body: "not-a-json",
    });

    const response = await handleAskRequest(request);
    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Corpo inválido");
  });

  it("deve retornar status 400 se o campo 'messages' não for um array", async () => {
    const request = new Request("http://localhost/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: "invalid" }),
    });

    const response = await handleAskRequest(request);
    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Mensagens obrigatórias");
  });

  it("deve retornar status 400 se nenhuma chave de API for informada nem no cookie nem no body", async () => {
    const request = new Request("http://localhost/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ id: "1", role: "user", parts: [{ type: "text", text: "Resuma o texto" }] }],
        context: "Conteúdo do documento",
      }),
    });

    const response = await handleAskRequest(request);
    expect(response.status).toBe(400);
    const body = await response.text();
    expect(body).toContain("Chave de API do Gemini não configurada");
  });

  it("deve processar e retornar stream quando a chave estiver presente no cookie seguro HttpOnly", async () => {
    (cookieService.getGeminiKeyCookie as jest.Mock).mockResolvedValue("cookie_key_valid_12345678");

    const request = new Request("http://localhost/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ id: "1", role: "user", parts: [{ type: "text", text: "Qual o resumo?" }] }],
        context: "Texto do documento.",
        fileName: "artigo.pdf",
        // sem userApiKey no body
      }),
    });

    const response = await handleAskRequest(request);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("streamed response content");
  });

  it("deve processar e retornar a resposta em stream quando a chave userApiKey for fornecida no body", async () => {
    const request = new Request("http://localhost/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ id: "1", role: "user", parts: [{ type: "text", text: "Qual o tema do texto?" }] }],
        context: "O tema do texto é inteligência artificial.",
        fileName: "livro.pdf",
        userApiKey: "valid_api_key_longer_than_10_chars",
      }),
    });

    const response = await handleAskRequest(request);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("streamed response content");
  });

  it("deve ignorar variáveis de ambiente no servidor e exigir chave do cookie ou userApiKey do usuário", async () => {
    process.env.GEMINI_API_KEY = "env_gemini_api_key_valid";

    const request = new Request("http://localhost/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ id: "1", role: "user", parts: [{ type: "text", text: "Resumo" }] }],
        context: "Texto de exemplo",
      }),
    });

    const response = await handleAskRequest(request);
    expect(response.status).toBe(400);
    const body = await response.text();
    expect(body).toContain("Chave de API do Gemini não configurada");
  });
});
