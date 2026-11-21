import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { POST as quizPostHandler } from "@/app/api/quiz/route";
import * as cookieService from "@/lib/ai/server/gemini-cookie.service";
import { ReaderSettingsProvider } from "@/context/reader-settings-context";
import { LocalAiProvider } from "@/context/local-ai-context";
import { AIStudyTemplate } from "../reader-templates/ai-study-template";
import * as storageService from "@/lib/local-ai/storage/model-storage.service";
import type { ReaderSettings } from "../ui/template-switcher";
import type { Sentence } from "@/lib/pdf-text";
import { QUIZ_TOKEN_BUDGETS } from "@/lib/a2ui/quiz-content-planner";

let mockHasApiKey = true;
let mockClientApiKey: string | null = "AIzaSy...xyz";
let mockLiteRtCached = false;

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock("@/hooks/use-chrome-ai", () => ({
  useChromeAi: () => ({ status: "unavailable", isSupported: false }),
}));

jest.mock("@/hooks/use-gemini-api-key", () => ({
  useGeminiApiKey: () => ({
    apiKey: mockClientApiKey,
    hasApiKey: mockHasApiKey,
    maskedKey: mockClientApiKey,
    isChecking: false,
    updateApiKey: jest.fn().mockResolvedValue(true),
    syncKey: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock("@/lib/ai/server/gemini-cookie.service", () => ({
  getGeminiKeyCookie: jest.fn(),
}));

jest.mock("@/lib/local-ai/storage/model-storage.service", () => ({
  detectLocalRuntimeSupport: jest.fn(),
  getCachedModelMeta: jest.fn(),
  getStorageQuotaEstimate: jest.fn(),
  downloadAndCacheModel: jest.fn(),
  deleteCachedModel: jest.fn(),
}));

const mockStreamMultimodalPrompt = jest.fn();

jest.mock("@/lib/local-ai/engines/local-chat.engine", () => {
  const actual = jest.requireActual("@/lib/local-ai/engines/local-chat.engine");
  return {
    ...actual,
    getLocalChatEngine: () => ({
      streamMultimodalPrompt: mockStreamMultimodalPrompt,
      dispose: jest.fn().mockResolvedValue(undefined),
    }),
  };
});

const mockedStorage = storageService as jest.Mocked<typeof storageService>;

const BASE_SETTINGS: ReaderSettings = {
  template: "ai-study",
  theme: "light",
  font: "inter",
  fontSize: 16,
  lineHeight: 1.8,
  speed: 1,
  hasCompletedOnboarding: true,
};

function makeDocSentences(
  count: number,
  wordsEach: number,
  pages: number,
): Sentence[] {
  return Array.from({ length: count }, (_, idx) => {
    const words = Array.from(
      { length: wordsEach },
      (__, w) => `conceito${idx}_${w}`,
    ).join(" ");
    return {
      index: idx,
      page: Math.min(pages, Math.floor((idx * pages) / count) + 1),
      text: `Passagem documental numero ${idx + 1} tratando de sistemas distribuidos e aprendizado continuo: ${words}.`,
    };
  });
}

function buildGeminiQuestionsPayload(count: number, totalSentences: number) {
  return JSON.stringify({
    questions: Array.from({ length: count }, (_, idx) => {
      const sentenceIndex = Math.min(
        totalSentences - 1,
        Math.floor((idx * totalSentences) / count),
      );
      return {
        topic: `Tema ${idx + 1}`,
        sentenceIndex,
        prompt: `Qual aspecto central é destacado na passagem ${sentenceIndex + 1}?`,
        evidenceQuote: `Passagem documental numero ${sentenceIndex + 1}`,
        explanation: `O parágrafo ¶${sentenceIndex + 1} detalha esse fundamento com clareza.`,
        hint: `Releia o trecho ¶${sentenceIndex + 1}.`,
        options: [
          { id: "A", label: `Distrator A-${idx + 1}`, isCorrect: false },
          { id: "B", label: `Sistemas distribuídos e aprendizado contínuo (${idx + 1})`, isCorrect: true },
          { id: "C", label: `Distrator C-${idx + 1}`, isCorrect: false },
          { id: "D", label: `Distrator D-${idx + 1}`, isCorrect: false },
        ],
      };
    }),
  });
}

function renderTemplate(
  sentences: Sentence[],
  callbacks?: {
    onSelectSentence?: jest.Mock;
    onAddNote?: jest.Mock;
  },
) {
  return render(
    <ReaderSettingsProvider>
      <LocalAiProvider>
        <AIStudyTemplate
          sentences={sentences}
          currentIndex={0}
          title="Arquitetura Moderna"
          settings={BASE_SETTINGS}
          isPlaying={false}
          isBuffering={false}
          voice="sys"
          speed="1"
          engine="system"
          voices={[{ id: "sys", label: "Sistema" }]}
          disabledEngines={[]}
          apiKey={mockClientApiKey}
          onEngineChange={jest.fn()}
          onSelectSentence={callbacks?.onSelectSentence ?? jest.fn()}
          onToggle={jest.fn()}
          onPrevious={jest.fn()}
          onNext={jest.fn()}
          onRestart={jest.fn()}
          onVoiceChange={jest.fn()}
          onSpeedChange={jest.fn()}
          onAddNote={callbacks?.onAddNote}
        />
      </LocalAiProvider>
    </ReaderSettingsProvider>,
  );
}

describe("Integração Quiz Inteligente A2UI (UI + Hook + BFF /api/quiz + IA Local)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockHasApiKey = true;
    mockClientApiKey = "AIzaSy...xyz";
    mockLiteRtCached = false;
    (cookieService.getGeminiKeyCookie as jest.Mock).mockResolvedValue(
      "AIzaSyRealCookieSecret999",
    );

    mockedStorage.detectLocalRuntimeSupport.mockReturnValue({
      webGpuSupported: true,
      cacheApiSupported: true,
      wasmSupported: true,
    });
    mockedStorage.getStorageQuotaEstimate.mockResolvedValue({
      usageBytes: 0,
      quotaBytes: 5_000_000_000,
    });
    mockedStorage.getCachedModelMeta.mockImplementation(async (id) => ({
      cached: mockLiteRtCached && id === "gemma-4-e2b-chat",
      sizeBytes: mockLiteRtCached && id === "gemma-4-e2b-chat" ? 2_340_870_772 : 0,
      cachedAt: mockLiteRtCached && id === "gemma-4-e2b-chat" ? Date.now() : null,
      sourceUrl: null,
    }));
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("gera 6 questões via BFF /api/quiz, destaca evidência, salva nota e exibe resumo final", async () => {
    const sentences = makeDocSentences(22, 36, 6);
    let geminiCalls = 0;

    global.fetch = jest.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url === "/api/quiz") {
        return quizPostHandler(
          new Request("http://localhost/api/quiz", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: String(init?.body ?? "{}"),
          }),
        );
      }
      if (url.includes("generativelanguage.googleapis.com")) {
        geminiCalls += 1;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [{ text: buildGeminiQuestionsPayload(6, sentences.length) }],
                },
              },
            ],
          }),
        } as unknown as Response;
      }
      throw new Error(`URL inesperada: ${url}`);
    }) as typeof fetch;

    const onSelectSentence = jest.fn();
    const onAddNote = jest.fn();

    renderTemplate(sentences, { onSelectSentence, onAddNote });

    await waitFor(() => {
      expect(screen.getByText(/6 questões/i)).toBeInTheDocument();
    });
    // Zero tokens gastos antes de abrir o Quiz
    expect(geminiCalls).toBe(0);

    fireEvent.click(screen.getByRole("button", { name: /gerar quiz interativo/i }));

    await waitFor(() => {
      expect(screen.getByText("1 de 6")).toBeInTheDocument();
    });
    expect(geminiCalls).toBe(1);
    expect(screen.getByText("IA Nuvem")).toBeInTheDocument();
    expect(screen.getByText("100% do conteúdo")).toBeInTheDocument();

    // Responde todas as 6 questões, validando evidência e salvamento de card na 1ª
    for (let i = 0; i < 6; i += 1) {
      fireEvent.click(screen.getByRole("radio", { name: /Sistemas distribuídos/i }));
      if (i === 0) {
        fireEvent.click(screen.getByRole("button", { name: /✓ Certeza/i }));
        fireEvent.click(screen.getByRole("button", { name: /destacar ¶/i }));
        expect(onSelectSentence).toHaveBeenCalledWith(0);
        fireEvent.click(screen.getByRole("button", { name: /salvar card/i }));
        expect(onAddNote).toHaveBeenCalledTimes(1);
      }
      if (i < 5) {
        fireEvent.click(screen.getByRole("button", { name: /^próxima \(/i }));
      }
    }

    const summary = screen.getByLabelText("Resumo do Quiz");
    expect(within(summary).getByText(/6 de 6 acertos/i)).toBeInTheDocument();
    expect(within(summary).getByText(/100%/i)).toBeInTheDocument();
    expect(within(summary).getByText(/360 XP/i)).toBeInTheDocument();
  });

  it("limita documento extenso (>30k chars) ao orçamento de 6000 tokens com 10 questões e economiza tokens em cache", async () => {
    const hugeDoc = makeDocSentences(130, 40, 20);
    let geminiCalls = 0;
    let capturedPromptText = "";

    global.fetch = jest.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url === "/api/quiz") {
        return quizPostHandler(
          new Request("http://localhost/api/quiz", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: String(init?.body ?? "{}"),
          }),
        );
      }
      if (url.includes("generativelanguage.googleapis.com")) {
        geminiCalls += 1;
        const bodyObj = JSON.parse(String(init?.body ?? "{}")) as {
          contents: Array<{ parts: Array<{ text: string }> }>;
        };
        capturedPromptText = bodyObj.contents[0].parts[0].text;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [{ text: buildGeminiQuestionsPayload(10, hugeDoc.length) }],
                },
              },
            ],
          }),
        } as unknown as Response;
      }
      throw new Error(`URL inesperada: ${url}`);
    }) as typeof fetch;

    renderTemplate(hugeDoc);

    await waitFor(() => {
      expect(screen.getByText(/10 questões/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /gerar quiz interativo/i }));

    await waitFor(() => {
      expect(screen.getByText("1 de 10")).toBeInTheDocument();
    });

    const contextOnly = capturedPromptText.split("=== TRECHOS DO DOCUMENTO ===")[1] ?? "";
    expect(contextOnly.trim().length).toBeLessThanOrEqual(
      QUIZ_TOKEN_BUDGETS.cloud.maxContextChars,
    );
    expect(contextOnly).toContain("p.1]");
    expect(contextOnly).toContain("p.20]");
    expect(screen.getByText(/economia de tokens/i)).toBeInTheDocument();

    // Alternar para Conversar e voltar para Quiz usa cache sem gastar tokens
    fireEvent.click(screen.getByRole("button", { name: "Conversar" }));
    fireEvent.click(screen.getByRole("button", { name: "Quiz" }));
    expect(screen.getByText("1 de 10")).toBeInTheDocument();
    expect(geminiCalls).toBe(1);

    // Clicar explicitamente em "Novas perguntas" dispara nova geração
    fireEvent.click(screen.getByRole("button", { name: "Gerar novas perguntas" }));
    await waitFor(() => {
      expect(geminiCalls).toBe(2);
    });
  });

  it("faz fallback resiliente para o modo rápido quando toda a cascata retorna 429", async () => {
    const sentences = makeDocSentences(8, 30, 3);

    global.fetch = jest.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url === "/api/quiz") {
        return quizPostHandler(
          new Request("http://localhost/api/quiz", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: String(init?.body ?? "{}"),
          }),
        );
      }
      if (url.includes("generativelanguage.googleapis.com")) {
        return { ok: false, status: 429 } as unknown as Response;
      }
      throw new Error(`URL inesperada: ${url}`);
    }) as typeof fetch;

    renderTemplate(sentences);

    await waitFor(() => {
      expect(screen.getByText(/4 questões/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /gerar quiz interativo/i }));

    await waitFor(() => {
      expect(screen.getByText("Modo rápido")).toBeInTheDocument();
      expect(
        screen.getByText(/Não foi possível gerar com a IA agora/i),
      ).toBeInTheDocument();
    });
    expect(screen.getByText("1 de 4")).toBeInTheDocument();
  });

  it("usa o motor local LiteRT-LM (Gemma 4) com contexto estratificado e badge IA Local", async () => {
    mockHasApiKey = false;
    mockClientApiKey = null;
    mockLiteRtCached = true;
    (cookieService.getGeminiKeyCookie as jest.Mock).mockResolvedValue(null);

    const sentences = makeDocSentences(18, 45, 6);
    mockStreamMultimodalPrompt.mockImplementation(async function* () {
      yield "Aqui está:\n```json\n";
      yield buildGeminiQuestionsPayload(5, sentences.length);
      yield "\n```";
    });

    renderTemplate(sentences);

    const engineSelector = screen.getByRole("button", {
      name: /selecionar motor de ia do chat/i,
    });
    await waitFor(() => {
      expect(within(engineSelector).getByText("Gemma 4 Local")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /gerar quiz interativo/i }));

    await waitFor(() => {
      expect(screen.getByText("IA Local")).toBeInTheDocument();
      expect(screen.getByText("1 de 5")).toBeInTheDocument();
    });

    expect(mockStreamMultimodalPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: "Arquitetura Moderna",
        context: expect.any(String),
      }),
    );
    const callArg = mockStreamMultimodalPrompt.mock.calls[0][0] as { context: string };
    expect(callArg.context.length).toBeLessThanOrEqual(
      QUIZ_TOKEN_BUDGETS["litert-lm-full"].maxContextChars,
    );
  });
});
