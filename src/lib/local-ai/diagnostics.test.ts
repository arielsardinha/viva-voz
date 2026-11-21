import * as Sentry from "@sentry/nextjs";
import { clearRiskyStage, markRiskyStage, reportPreviousTabCrash } from "./diagnostics";

jest.mock("@sentry/nextjs", () => ({
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
  logger: { info: jest.fn(), error: jest.fn() },
}));

describe("sentinela de travamento da aba", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  it("reporta no próximo carregamento a etapa em que a aba morreu", async () => {
    markRiskyStage("chat_stream", { modelId: "gemma-4-e2b-chat", profile: "lite" });
    // A aba "morre" aqui: clearRiskyStage nunca é chamado.

    await reportPreviousTabCrash();

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    const [err, ctx] = (Sentry.captureException as jest.Mock).mock.calls[0];
    expect((err as Error).message).toMatch(/Aba encerrada pelo navegador durante chat_stream/);
    expect(ctx.tags).toMatchObject({
      local_ai_stage: "chat_stream",
      local_ai_error: "TabCrash",
      local_ai_model: "gemma-4-e2b-chat",
    });
    // Reporta uma vez só.
    await reportPreviousTabCrash();
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });

  it("não reporta nada quando a etapa terminou normalmente", async () => {
    markRiskyStage("engine_create", { modelId: "gemma-4-e2b-chat" });
    clearRiskyStage();

    await reportPreviousTabCrash();

    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});
