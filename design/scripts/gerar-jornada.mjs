// Gera a jornada repaginada v2 do VivaVoz como script do FigCraft.
//
//   node design/scripts/gerar-jornada.mjs
//   D:\dev\figcraft\FigCraft\figcraft-cli.exe run design/build/jornada.json --out design/vivavoz-repaginada.figcraft
//   D:\dev\figcraft\FigCraft\figcraft-cli.exe export design/vivavoz-repaginada.figcraft -o design/jornada --format png

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createContext } from "./primitives.mjs";
import { buildJourneyScreens } from "./screens-journey.mjs";
import { buildListeningAndAiScreens } from "./screens-listening-ai.mjs";
import { buildQuizA2uiScreen } from "./screen-quiz-a2ui.mjs";
import { buildFocusScreen } from "./screen-focus.mjs";
import { buildMobileAndSystemScreens } from "./screens-mobile-system.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "build", "jornada.json");

const ctx = createContext();

buildJourneyScreens(ctx);
buildListeningAndAiScreens(ctx);
buildQuizA2uiScreen(ctx);
buildFocusScreen(ctx);
buildMobileAndSystemScreens(ctx);

for (const [id, key] of ctx.links) {
  ctx.addStep("proto.interaction.add", {
    id,
    trigger: { type: "onClick" },
    action: { type: "navigate", dest: ctx.frames[key] },
    transition: { type: "dissolve" },
    durationMs: 220,
    easing: "easeOut",
  });
}

ctx.addStep("proto.flow.add", { start: ctx.frames.capa, name: "Jornada do leitor" });
ctx.addStep("proto.flow.add", { start: ctx.frames.mobileLeitor, name: "Jornada no celular" });
ctx.addStep("page.rename", { name: "Jornada repaginada · v2" });
ctx.addStep("file.rename", { name: "VivaVoz — Repaginação v2" });

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(ctx.steps, null, 0).replace(/\},\{"command"/g, '},\n{"command"'));
console.log(`${ctx.steps.length} passos, última camada prevista #${ctx.getLastId()} → ${OUT}`);
