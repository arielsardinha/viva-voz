import { C } from "./tokens.mjs";
import { createContext } from "./primitives.mjs";
import { buildJourneyScreens } from "./screens-journey.mjs";
import { buildListeningAndAiScreens } from "./screens-listening-ai.mjs";
import { buildQuizA2uiScreen } from "./screen-quiz-a2ui.mjs";
import { buildFocusScreen } from "./screen-focus.mjs";
import { buildMobileAndSystemScreens } from "./screens-mobile-system.mjs";

interface FigCraftStep {
  command: string;
  params: Record<string, unknown>;
}

interface FigCraftContext {
  steps: FigCraftStep[];
  links: Array<[number, string]>;
  frames: Record<string, number>;
  getLastId: () => number;
}

const EXPECTED_FRAMES = [
  "capa",
  "inicio",
  "biblioteca",
  "adicionar",
  "leitor",
  "estudioVoz",
  "assistente",
  "chatModos",
  "foco",
  "mobileLeitor",
  "mobileAssistente",
  "sistema",
];

const CREATING_COMMANDS = new Set([
  "frame.create",
  "text.create",
  "shape.rectangle",
  "shape.ellipse",
  "vector.create",
]);

describe("Gerador da jornada FigCraft (VivaVoz v2)", () => {
  it("gera todas as 12 telas com IDs determinísticos e links válidos", () => {
    const ctx = createContext() as unknown as FigCraftContext;
    buildJourneyScreens(ctx as never);
    buildListeningAndAiScreens(ctx as never);
    buildQuizA2uiScreen(ctx as never);
    buildFocusScreen(ctx as never);
    buildMobileAndSystemScreens(ctx as never);

    expect(Object.keys(ctx.frames)).toEqual(EXPECTED_FRAMES);

    for (const [sourceId, targetKey] of ctx.links) {
      expect(typeof sourceId).toBe("number");
      expect(ctx.frames[targetKey]).toBeDefined();
    }

    const createdNodes = ctx.steps.filter((s) => CREATING_COMMANDS.has(s.command)).length;
    expect(ctx.getLastId()).toBe(1 + createdNodes);

    const mobileScreens = ctx.steps.filter(
      (s) =>
        s.command === "frame.create" &&
        (s.params.name === "09 · Celular — leitor e escuta" ||
          s.params.name === "10 · Celular — assistente e voz"),
    );
    expect(mobileScreens).toHaveLength(2);
    for (const screen of mobileScreens) {
      expect(Number(screen.params.width)).toBeGreaterThanOrEqual(370);
    }

    expect(C.amber).not.toBe(C.indigo);
  });
});
