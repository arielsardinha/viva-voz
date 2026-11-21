import { isMobileDevice } from "./device";
import {
  LOCAL_AI_MODELS,
  createInitialModelStates,
  findExclusiveConflict,
  getAvailableLocalModels,
  getLocalModelById,
  getReadyChatModelId,
} from "./local-model-catalog";

function nav(ua: string, extra: Record<string, unknown> = {}): Navigator {
  return { userAgent: ua, maxTouchPoints: 0, ...extra } as unknown as Navigator;
}

describe("Gemma 4 E4B (somente computador)", () => {
  it("está no catálogo com o arquivo web recomendado e configuração de máquina", () => {
    const e4b = getLocalModelById("gemma-4-e4b-chat")!;
    expect(e4b.downloadUrl).toContain("gemma-4-E4B-it-gpu.litertlm");
    expect(e4b.sizeBytes).toBe(3_310_938_740);
    expect(e4b.desktopOnly).toBe(true);
    expect(e4b.exclusiveGroup).toBe("local-chat");
    expect(e4b.recommendedSpecs.join(" ")).toMatch(/16 GB de RAM/);
  });

  it("todo modelo informa a configuração recomendada", () => {
    for (const model of LOCAL_AI_MODELS) {
      expect(model.recommendedSpecs.length).toBeGreaterThan(0);
    }
  });

  it("nunca aparece em celulares e aparece no computador", () => {
    const mobileIds = getAvailableLocalModels(true).map((m) => m.id);
    const desktopIds = getAvailableLocalModels(false).map((m) => m.id);
    expect(mobileIds).not.toContain("gemma-4-e4b-chat");
    expect(mobileIds).toContain("gemma-4-e2b-chat");
    expect(desktopIds).toContain("gemma-4-e4b-chat");
  });
});

describe("um modelo de chat local por vez", () => {
  it("bloqueia o E4B enquanto o E2B estiver instalado, e vice-versa", () => {
    const models = createInitialModelStates();
    models["gemma-4-e2b-chat"] = { ...models["gemma-4-e2b-chat"], status: "ready" };

    expect(findExclusiveConflict("gemma-4-e4b-chat", models)?.id).toBe("gemma-4-e2b-chat");
    expect(findExclusiveConflict("gemma-4-e2b-chat", models)).toBeNull();

    models["gemma-4-e2b-chat"] = { ...models["gemma-4-e2b-chat"], status: "not_downloaded" };
    models["gemma-4-e4b-chat"] = { ...models["gemma-4-e4b-chat"], status: "downloading" };
    expect(findExclusiveConflict("gemma-4-e2b-chat", models)?.id).toBe("gemma-4-e4b-chat");
  });

  it("não bloqueia vozes (TTS), que não fazem parte do grupo", () => {
    const models = createInitialModelStates();
    models["gemma-4-e2b-chat"] = { ...models["gemma-4-e2b-chat"], status: "ready" };
    expect(findExclusiveConflict("kokoro-82m-tts", models)).toBeNull();
  });

  it("informa qual modelo de chat está instalado", () => {
    const models = createInitialModelStates();
    expect(getReadyChatModelId(models)).toBeNull();
    models["gemma-4-e4b-chat"] = { ...models["gemma-4-e4b-chat"], status: "ready" };
    expect(getReadyChatModelId(models)).toBe("gemma-4-e4b-chat");
  });
});

describe("isMobileDevice", () => {
  it.each([
    ["iPhone (Chrome)", nav("Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) CriOS/138.0 Mobile/15E148")],
    ["Android", nav("Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/138.0 Mobile Safari/537.36")],
    ["tablet Android", nav("Mozilla/5.0 (Linux; Android 14; SM-X710) Chrome/138.0 Safari/537.36")],
    ["iPad como Mac", nav("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15", { maxTouchPoints: 5 })],
    ["Client Hints mobile", nav("Mozilla/5.0", { userAgentData: { mobile: true } })],
  ])("%s é celular/tablet", (_label, n) => {
    expect(isMobileDevice(n)).toBe(true);
  });

  it.each([
    ["Windows", nav("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/138.0 Safari/537.36")],
    ["Mac", nav("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/138.0 Safari/537.36")],
    ["Linux", nav("Mozilla/5.0 (X11; Linux x86_64) Chrome/138.0 Safari/537.36")],
  ])("%s é computador", (_label, n) => {
    expect(isMobileDevice(n)).toBe(false);
  });
});
