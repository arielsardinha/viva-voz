// Telas 09 a 11: Celular (Leitor e Assistente) e Sistema Visual v2.

import { C, DOC, SHADOW_FLOAT, SHADOW_SOFT } from "./tokens.mjs";

export function buildMobileAndSystemScreens(ctx) {
  const {
    screen,
    link,
    F,
    row,
    col,
    T,
    styleRange,
    R,
    E,
    I,
    button,
    iconButton,
    chip,
    waveform,
    progressBar,
    currentSentence,
    inlineVoiceReply,
    paragraph,
    addStep,
  } = ctx;

  function statusBar(s, dark = false) {
    const sb = row(s, { x: 0, y: 0, w: 375, h: 40, sizingV: "fixed", pad: [0, 24, 0, 26], main: "spaceBetween" });
    T(sb, "21:47", { size: 14, weight: 600, color: dark ? C.paper : C.ink });
    const ic = row(sb, { gap: 6 });
    R(ic, { w: 16, h: 10, r: 2, fill: dark ? C.paper : C.ink });
    R(ic, { w: 22, h: 11, r: 3, fill: dark ? C.paper : C.ink });
  }

  function mobileTop(s) {
    const bar = row(s, { x: 0, y: 40, w: 375, h: 52, sizingV: "fixed", pad: [0, 10, 0, 6], main: "spaceBetween" });
    const back = iconButton(bar, "chevL", { s: 44, size: 20 });
    link(back, "biblioteca");
    const t = col(bar, { gap: 0, cross: "center" });
    T(t, "Brás Cubas", { size: 14, weight: 600 });
    T(t, "Cap. I · 34% · 1,25×", { size: 11, color: C.ink3 });
    const right = row(bar, { gap: 2 });
    iconButton(right, "type", { s: 40, size: 17 });
    const studioBtn = iconButton(right, "headphones", { s: 40, size: 17, color: C.amberInk, fill: C.amberSoft });
    link(studioBtn, "estudioVoz");
    return bar;
  }

  /* 09 · Celular — Leitor e escuta (>= 370px) */
  function mobileLeitor() {
    const s = screen("mobileLeitor", "09 · Celular — leitor e escuta", 375, 812, { fill: C.card });
    statusBar(s);
    mobileTop(s);
    const pbLine = progressBar(s, 0.34, { w: 375, h: 3, color: C.amber });
    addStep("node.set", { ids: [pbLine], x: 0, y: 92 });

    const c = col(s, { x: 20, y: 112, w: 335, gap: 14 });
    T(c, "CAPÍTULO I", { size: 11, weight: 700, ls: "16%", color: C.indigo });
    T(c, DOC.chapterTitle, { serif: true, weight: 600, size: 28, lh: "115%" });
    paragraph(c, DOC.p1a, { size: 17.5, lh: "164%", color: C.ink2 });
    currentSentence(c, DOC.p1c, { size: 17.5, lh: "164%", activeWord: "defunto autor" });
    paragraph(c, `${DOC.p1d} ${DOC.p2}`, { size: 17.5, lh: "164%" });
    R(s, { x: 0, y: 495, w: 375, h: 165, fills: [{ type: "linearGradient", stops: ["#FFFDF800", "#FFFDF8"] }] });

    // Ação rápida flutuante na zona confortável do polegar
    const floatRow = row(s, { x: 20, y: 588, w: 335, main: "center", gap: 8 });
    const ai = button(floatRow, "Explicar esta frase", {
      kind: "soft",
      icon: "sparkles",
      h: 44,
      px: 16,
      size: 13,
      fx: SHADOW_SOFT,
    });
    link(ai, "mobileAssistente");
    iconButton(floatRow, "bookmark", { s: 44, size: 17, fill: C.card, stroke: C.line, fx: SHADOW_SOFT });

    // Player ergonômico escuro na base (safe-area inferior respeitada)
    const pl = col(s, {
      x: 12,
      y: 644,
      w: 351,
      gap: 10,
      pad: [12, 14, 12, 14],
      r: 24,
      fill: C.ink,
      fx: SHADOW_FLOAT,
      name: "Player celular",
    });
    const top = row(pl, { sizingH: "fill", gap: 10 });
    waveform(top, { n: 30, progress: 0.38, played: C.amber, rest: "#FFFFFF2E", max: 18, fillW: true });
    T(top, "04:12", { size: 11.5, weight: 600, color: C.nightText2 });

    const ctr = row(pl, { sizingH: "fill", main: "spaceBetween" });
    chip(ctr, "1,25×", { size: 12, fill: "#FFFFFF14", stroke: null, color: C.amberGlow, pad: [7, 10, 7, 10] });
    const mid = row(ctr, { gap: 6 });
    iconButton(mid, "back15", { s: 44, size: 19, color: C.paper });
    const pb = row(mid, { w: 50, h: 50, r: 25, fill: C.amber, main: "center" });
    I(pb, "pause", { size: 18, color: C.ink, solid: true });
    iconButton(mid, "fwd15", { s: 44, size: 19, color: C.paper });
    const aiIconBtn = iconButton(ctr, "sparkles", { s: 44, size: 18, fill: C.indigo, color: C.white });
    link(aiIconBtn, "mobileAssistente");

    const sub = row(pl, { sizingH: "fill", main: "center", gap: 8 });
    T(sub, "Dora · Offline  ·  Chuva leve", { size: 11, color: C.nightText2 });

    R(s, { x: 121, y: 798, w: 133, h: 5, r: 3, fill: C.ink });
  }

  /* 10 · Celular — Assistente e voz (bottom sheet) */
  function mobileAssistente() {
    const s = screen("mobileAssistente", "10 · Celular — assistente e voz", 375, 812, { fill: C.card });
    statusBar(s);
    mobileTop(s);
    const c = col(s, { x: 20, y: 112, w: 335, gap: 14, opacity: 0.45 });
    T(c, DOC.chapterTitle, { serif: true, weight: 600, size: 28, lh: "115%" });
    paragraph(c, DOC.p1a, { size: 17.5, color: C.ink2 });
    R(s, { x: 0, y: 0, w: 375, h: 812, fill: "#1E2230", opacity: 0.36 });

    const sh = col(s, {
      x: 0,
      y: 108,
      w: 375,
      h: 704,
      sizingV: "fixed",
      r: [28, 28, 0, 0],
      fill: C.card,
      fx: SHADOW_FLOAT,
      gap: 11,
      pad: [10, 18, 28, 18],
      name: "Folha do assistente",
    });
    const handle = row(sh, { sizingH: "fill", main: "center" });
    R(handle, { w: 40, h: 5, r: 3, fill: C.line2 });

    const hh = row(sh, { sizingH: "fill", main: "spaceBetween" });
    const hl = row(hh, { gap: 9 });
    const av = row(hl, { w: 32, h: 32, r: 9, fill: C.indigo, main: "center" });
    I(av, "sparkles", { size: 15, color: C.white });
    const hc = col(hl, { gap: 1 });
    T(hc, "Assistente", { size: 14.5, weight: 600 });
    const engRow = row(hc, { gap: 5 });
    E(engRow, { w: 6, fill: C.green });
    T(engRow, "Gemma 4 E2B · Offline", { size: 11, weight: 600, color: C.greenInk });
    const cl = iconButton(hh, "x", { s: 36, size: 16, fill: C.paper });
    link(cl, "mobileLeitor");

    // Mini-faixa de áudio pausado com retomada em 1 toque
    const pauseStrip = row(sh, {
      sizingH: "fill",
      pad: [7, 10, 7, 10],
      r: 12,
      fill: C.amberSoft,
      main: "spaceBetween",
    });
    const psL = row(pauseStrip, { gap: 6 });
    E(psL, { w: 7, fill: C.amber });
    T(psL, "Pausado em ¶1 (04:12)", { size: 11.5, weight: 600, color: C.amberInk });
    const psBtn = row(pauseStrip, { gap: 4, pad: [4, 10, 4, 8], r: 99, fill: C.amber });
    I(psBtn, "play", { size: 10, color: C.ink, solid: true });
    T(psBtn, "Retomar", { size: 11, weight: 700, color: C.ink });
    link(psBtn, "mobileLeitor");

    // Chips de modo
    const modeRow = row(sh, { gap: 6, sizingH: "fill" });
    [
      ["Explicar", true],
      ["Resumo", false],
      ["Quiz", false],
      ["Simples", false],
    ].forEach(([lbl, on]) => {
      chip(modeRow, lbl, {
        size: 11.5,
        fill: on ? C.indigo : C.paper,
        color: on ? C.white : C.ink2,
        stroke: on ? null : C.line,
        pad: [6, 10, 6, 10],
      });
    });

    // Conversa
    const q = row(sh, { sizingH: "fill", main: "max" });
    const qb = row(q, { pad: [10, 14, 10, 14], r: 16, fill: C.ink, w: 256 });
    T(qb, "Explique essa frase de um jeito simples", { size: 13.5, lh: "145%", color: C.paper, fillW: true });

    const a = col(sh, { gap: 8, sizingH: "fill" });
    const replyTxt =
      "Brás Cubas brinca com a ordem das palavras: ele não é um escritor que morreu, e sim um morto que virou escritor. Por isso conta tudo sem filtro.";
    const rtId = T(a, replyTxt, { size: 13.5, lh: "152%", fillW: true });
    styleRange(rtId, replyTxt, "um morto que virou escritor", { fontStyle: "SemiBold", textFills: [C.indigoInk] });

    const voiceAndSrc = row(a, { gap: 6, wrap: true, crossGap: 6, sizingH: "fill" });
    inlineVoiceReply(voiceAndSrc, "0:18", { label: "Ouvir" });
    const srcM = chip(voiceAndSrc, "¶1 · “um defunto autor”", {
      icon: "quote",
      iconColor: C.indigo,
      color: C.indigo,
      fill: C.indigoSoft,
      stroke: null,
      size: 11.5,
      pad: [5, 10, 5, 8],
    });
    link(srcM, "mobileLeitor");

    const acts = row(a, { gap: 6 });
    [
      ["note", "Salvar nota"],
      ["copy", "Copiar"],
    ].forEach(([ic, t]) => {
      const b = row(acts, { gap: 5, pad: [5, 10, 5, 8], r: 8, fill: C.paper });
      I(b, ic, { size: 13, color: C.ink2 });
      T(b, t, { size: 11.5, weight: 600, color: C.ink2 });
    });

    // Segundo turno curto para fluidez natural da conversa no celular
    const q2 = row(sh, { sizingH: "fill", main: "max" });
    const q2b = row(q2, { pad: [8, 13, 8, 13], r: 15, fill: C.ink });
    T(q2b, "E por que ele cita Moisés?", { size: 13, color: C.paper });

    const a2 = col(sh, { gap: 6, sizingH: "fill" });
    T(a2, "Para contrastar: Moisés deixou a morte para o fim; Brás Cubas abre o livro com ela.", {
      size: 13,
      lh: "148%",
      fillW: true,
    });
    chip(a2, "¶2 · “não a pôs no intróito”", {
      icon: "quote",
      iconColor: C.indigo,
      color: C.indigo,
      fill: C.indigoSoft,
      stroke: null,
      size: 11,
      pad: [4, 9, 4, 7],
    });

    F(sh, { w: 10, h: 4, sizingV: "fill" });

    // Mini-widget A2UI cross-platform no mobile
    const a2Mob = row(sh, {
      sizingH: "fill",
      pad: [8, 10, 8, 12],
      r: 14,
      fill: "#F7F6FE",
      stroke: C.indigoBorder,
      main: "spaceBetween",
    });
    const a2MobL = row(a2Mob, { gap: 7 });
    I(a2MobL, "zap", { size: 13, color: C.indigo });
    const a2MobTxt = col(a2MobL, { gap: 1 });
    T(a2MobTxt, "Quiz A2UI · Cap. I", { size: 12, weight: 700, color: C.indigoInk });
    T(a2MobTxt, "3 questões com áudio", { size: 10.5, color: C.ink2 });
    const a2MobBtn = row(a2Mob, { gap: 4, pad: [6, 11, 6, 11], r: 99, fill: C.indigo });
    T(a2MobBtn, "Iniciar", { size: 11.5, weight: 600, color: C.white });
    link(a2MobBtn, "chatModos");

    const inp = row(sh, {
      gap: 6,
      pad: [5, 5, 5, 10],
      h: 52,
      sizingV: "fixed",
      r: 26,
      stroke: C.line2,
      sizingH: "fill",
    });
    iconButton(inp, "image", { s: 36, size: 16 });
    T(inp, "Pergunte ou fale…", { size: 13.5, color: C.ink3 });
    F(inp, { w: 6, h: 10, sizingH: "fill" });
    iconButton(inp, "mic", { s: 40, size: 18, fill: C.indigoSoft, color: C.indigo });
    const send = row(inp, { w: 40, h: 40, r: 20, fill: C.indigo, main: "center" });
    I(send, "arrowUp", { size: 18, color: C.white, sw: 2.2 });

    R(s, { x: 121, y: 799, w: 133, h: 5, r: 3, fill: C.ink });
  }

  /* 11 · Sistema visual — Papel & Tinta v2 */
  function sistema() {
    const s = screen("sistema", "11 · Sistema visual — Papel & Tinta v2", 1440, 1220);
    T(s, "SISTEMA VISUAL V2", { x: 72, y: 56, size: 12, weight: 700, ls: "14%", color: C.indigo });
    T(s, "Papel, Tinta, Âmbar & Índigo", { x: 72, y: 80, serif: true, weight: 600, size: 42 });
    T(
      s,
      "Fundo quente de papel para leitura longa, índigo para ação e IA, âmbar exclusivo para a voz e esmeralda para status offline/sync. Cada cor ensina um significado sem precisar de legenda.",
      { x: 72, y: 140, w: 720, size: 15, lh: "155%", color: C.ink2 },
    );

    const groups = [
      ["Papel", [["paper", "Fundo"], ["paper2", "Superfície"], ["card", "Página"], ["line", "Divisória"]]],
      ["Tinta", [["ink", "Texto"], ["ink2", "Texto 2"], ["ink3", "Apoio"]]],
      ["Índigo · IA & ação", [["indigo", "Primária"], ["indigoSoft", "Suave"], ["indigoInk", "Texto"]]],
      ["Âmbar · voz", [["amber", "Ativo"], ["amberSoft", "Destaque"], ["amberInk", "Texto"]]],
      ["Esmeralda · offline", [["green", "Offline/OK"], ["greenSoft", "Suave"]]],
      ["Noturno", [["night", "Fundo"], ["nightCard", "Superfície"], ["nightText", "Texto"]]],
    ];
    const sw = row(s, { x: 72, y: 230, gap: 22, cross: "min" });
    groups.forEach(([g, list]) => {
      const gc = col(sw, { gap: 10 });
      T(gc, g, { size: 12.5, weight: 600 });
      const r = row(gc, { gap: 6 });
      list.forEach(([k, label]) => {
        const it = col(r, { gap: 5, w: 58 });
        R(it, { w: 58, h: 58, r: 12, fill: C[k], stroke: C.line });
        T(it, label, { size: 11, weight: 600 });
        T(it, C[k], { size: 10.5, color: C.ink3 });
      });
    });

    // Tipografia
    T(s, "Tipografia", { x: 72, y: 416, serif: true, weight: 600, size: 26 });
    const ty = col(s, { x: 72, y: 462, w: 620, gap: 18, pad: 26, r: 20, fill: C.card, stroke: C.line });
    [
      ["Source Serif 4 · 42/112% · Semibold", "Óbito do autor", { serif: true, weight: 600, size: 42 }],
      ["Source Serif 4 · 20/172% · leitura (~68 caracteres)", "Algum tempo hesitei se devia abrir estas memórias pelo princípio ou pelo fim.", { serif: true, size: 20, lh: "172%" }],
      ["Inter · 15/155% · interface, chat e quiz", "Ele inverte a expressão de propósito: um morto que resolveu escrever.", { size: 15, lh: "155%" }],
      ["Inter · 12 · Bold · 14% · rótulos e capítulos", "CAPÍTULO I · CONTINUAR OUVINDO", { size: 12, weight: 700, ls: "14%", color: C.indigo }],
    ].forEach(([cap, sample, st]) => {
      const r = col(ty, { gap: 4, sizingH: "fill" });
      T(r, cap, { size: 11.5, color: C.ink3 });
      T(r, sample, { ...st, fillW: true });
    });

    // Componentes & Estados (Escuta + IA)
    T(s, "Componentes & Estados", { x: 724, y: 416, serif: true, weight: 600, size: 26 });
    const cp = col(s, { x: 724, y: 462, w: 644, gap: 16, pad: 26, r: 20, fill: C.card, stroke: C.line });

    const b1 = row(cp, { gap: 8, wrap: true, crossGap: 8, sizingH: "fill" });
    button(b1, "Perguntar à IA", { kind: "accent", icon: "sparkles", h: 40 });
    button(b1, "Continuar ouvindo", { kind: "amber", icon: "play", solidIcon: true, iconSize: 12, h: 40 });
    button(b1, "Adicionar", { kind: "primary", icon: "plus", h: 40 });
    button(b1, "Cancelar", { kind: "ghost", h: 40 });

    const b2 = row(cp, { gap: 8, wrap: true, crossGap: 8, sizingH: "fill" });
    chip(b2, "Ouvindo agora · Dora", { dot: C.amber, size: 12, fill: C.amberSoft, stroke: null, color: C.amberInk });
    chip(b2, "¶1 · “um defunto autor”", { icon: "quote", iconColor: C.indigo, color: C.indigo, fill: C.indigoSoft, stroke: null, size: 12 });
    inlineVoiceReply(b2, "0:22", { label: "Ouvir resposta" });
    chip(b2, "A2UI · Catálogo nativo", {
      icon: "zap",
      iconColor: C.indigo,
      color: C.indigoInk,
      fill: "#F7F6FE",
      stroke: C.indigoBorder,
      size: 12,
    });

    const b3 = row(cp, { gap: 8, wrap: true, crossGap: 8, sizingH: "fill" });
    [
      [C.green, C.greenSoft, C.greenInk, null, "Gemma 4 E4B · Offline"],
      [C.amber, C.amberSoft, C.amberInk, "headphones", "Kokoro 82M / Piper"],
      [C.indigo, C.indigoSoft, C.indigoInk, "cloud", "Gemini Nuvem BYOK"],
      [C.ink2, C.paper, C.ink2, "globe", "IA do Chrome"],
    ].forEach(([icColor, bg, txtCol, ic, lbl]) => {
      const eng = row(b3, { gap: 6, pad: [6, 10, 6, 10], r: 99, fill: bg });
      if (ic) I(eng, ic, { size: 13, color: icColor });
      else E(eng, { w: 7, fill: icColor });
      T(eng, lbl, { size: 12, weight: 600, color: txtCol });
    });

    currentSentence(cp, "a primeira é que eu não sou propriamente um autor defunto, mas um defunto autor;", {
      size: 17,
      activeWord: "defunto autor",
    });

    const msgRow = row(cp, { gap: 12, sizingH: "fill", main: "spaceBetween" });
    const ab = col(msgRow, { gap: 6, pad: 12, r: 14, fill: C.paper, w: 360 });
    T(ab, "Resposta da IA: texto corrido, com áudio inline e fontes clicáveis abaixo.", {
      size: 13,
      lh: "145%",
      fillW: true,
    });
    const qb = row(msgRow, { pad: [10, 14, 10, 14], r: 14, fill: C.ink });
    T(qb, "Por que “defunto autor”?", { size: 13, color: C.paper });

    // Regras de uso
    T(s, "Regras de uso & Acessibilidade", { x: 72, y: 1018, serif: true, weight: 600, size: 26 });
    const rules = row(s, { x: 72, y: 1064, gap: 16 });
    [
      "Âmbar é exclusivo para voz, áudio tocando e retomada da leitura.",
      "Índigo marca ação principal e toda experiência do chat de IA.",
      "Toda resposta da IA cita fontes clicáveis e pode ser ouvida inline.",
      "Mobile a partir de 370 px, alvos de 44 px, foco visível e safe-area.",
    ].forEach((t) => {
      const r = row(rules, { gap: 10, pad: 16, r: 14, fill: C.card, stroke: C.line, w: 312, cross: "min" });
      I(r, "check", { size: 16, color: C.green });
      T(r, t, { size: 13.5, lh: "145%", fillW: true });
    });
  }

  mobileLeitor();
  mobileAssistente();
  sistema();
}
