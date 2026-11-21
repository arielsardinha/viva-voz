// Tela 08: Modo foco — Escuta noturna.

import { C, DOC, SHADOW_FLOAT } from "./tokens.mjs";

export function buildFocusScreen(ctx) {
  const { screen, link, F, row, col, T, R, E, I, button, iconButton, chip, paragraph, currentSentence } = ctx;

  const s = screen("foco", "08 · Modo foco — Escuta noturna", 1440, 900, { fill: C.night });
  const top = row(s, { x: 0, y: 0, w: 1440, h: 64, sizingV: "fixed", pad: [0, 32, 0, 32], main: "spaceBetween" });
  const tl = row(top, { gap: 10 });
  T(tl, "Capítulo I · Óbito do autor", { size: 13, color: C.nightText2 });
  chip(tl, "Dora · 1,25×", { dot: C.amber, fill: C.nightCard, stroke: C.nightLine, color: C.nightText, size: 11.5, pad: [4, 10, 4, 8] });

  const tr = row(top, { gap: 12 });
  T(tr, "Timer: fim do cap. · 12 min", { size: 13, color: C.nightText2 });
  const ex = button(tr, "Sair do foco", { kind: "night", icon: "x", h: 36, size: 12.5, iconSize: 14 });
  link(ex, "leitor");

  const c = col(s, { x: 360, y: 120, w: 720, gap: 26 });
  paragraph(c, `${DOC.p1a} ${DOC.p1b}`, { size: 23, color: C.nightText, opacity: 0.34 });
  currentSentence(c, DOC.p1c, {
    size: 23,
    color: C.nightText,
    fill: "#E9A23B1F",
    bar: C.amber,
    activeWord: "defunto autor",
    activeWordColor: C.amberGlow,
  });
  paragraph(c, DOC.p1d, { size: 23, color: C.nightText, opacity: 0.34 });
  paragraph(c, DOC.p2, { size: 23, color: C.nightText, opacity: 0.34 });
  R(s, { x: 0, y: 610, w: 1440, h: 290, fills: [{ type: "linearGradient", stops: ["#11131A00", "#11131A"] }] });

  // Controles noturnos ergonômicos centralizados com acesso direto à IA
  const flWrap = row(s, { x: 0, y: 786, w: 1440, main: "center" });
  const fl = row(flWrap, {
    gap: 6,
    pad: 8,
    r: 34,
    fill: C.nightCard,
    stroke: C.nightLine,
    fx: SHADOW_FLOAT,
    name: "Controles do foco",
  });
  iconButton(fl, "back15", { s: 44, color: C.nightText2 });
  const pb = row(fl, { w: 48, h: 48, r: 24, fill: C.amber, main: "center" });
  I(pb, "pause", { size: 16, color: C.night, solid: true });
  iconButton(fl, "fwd15", { s: 44, color: C.nightText2 });
  R(fl, { w: 1, h: 24, fill: C.nightLine });
  chip(fl, "1,25×", { size: 12, fill: "#FFFFFF0D", stroke: null, color: C.amberGlow, pad: [8, 12, 8, 12] });
  const amb = row(fl, { gap: 8, pad: [0, 14, 0, 12], h: 44, sizingV: "fixed", r: 22, fill: "#FFFFFF0D" });
  I(amb, "rain", { size: 16, color: C.amberGlow });
  T(amb, "Chuva · 25%", { size: 12.5, weight: 600, color: C.nightText });
  link(amb, "estudioVoz");
  iconButton(fl, "timer", { s: 44, color: C.nightText2 });
  R(fl, { w: 1, h: 24, fill: C.nightLine });
  const fa = row(fl, { gap: 7, pad: [0, 16, 0, 14], h: 44, sizingV: "fixed", r: 22, fill: C.indigo });
  I(fa, "sparkles", { size: 15, color: C.white });
  T(fa, "Perguntar à IA", { size: 12.5, weight: 600, color: C.white });
  link(fa, "assistente");

  // Anel circular de progresso
  const ring = F(s, { x: 1328, y: 794, w: 64, h: 64, name: "Progresso do capítulo" });
  E(ring, { w: 64, h: 64, fill: C.nightLine, arcInner: 0.86 });
  E(ring, { w: 64, h: 64, fill: C.amber, arcInner: 0.86, arcStart: -90, arcSweep: 122 });
  T(ring, "34%", { x: 0, y: 24, w: 64, align: "center", size: 12, weight: 600, color: C.nightText });
}
