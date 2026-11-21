// Telas 04 a 06: Leitor sincronizado, Estúdio de voz e Leitor + IA (com helpers compartilhados para A2UI).

import { AMBIENT_PRESETS, C, CHAPTERS, DOC, SHADOW_FLOAT, SHADOW_SOFT, VOICES } from "./tokens.mjs";

export function createAssistantHelpers(ctx) {
  const { link, F, row, col, T, R, E, I, iconButton, readerTop, paragraph, currentSentence, dock } = ctx;

  /* Helper compartilhado: coluna esquerda nas telas 06 e 07 */
  function renderReaderColumnForAssistant(s, o = {}) {
    const isEvidence = o.mode === "a2uiEvidence";
    readerTop(s, { aiOpen: true });

    const rail = col(s, { x: 16, y: 92, w: 48, gap: 8, cross: "center" });
    const tocBtn = iconButton(rail, "list", { s: 40, fill: C.card, stroke: C.line });
    link(tocBtn, "leitor");
    iconButton(rail, "highlighter", { s: 40 });
    iconButton(rail, "note", { s: 40 });
    iconButton(rail, "bookmark", { s: 40 });

    const page = F(s, {
      x: 80,
      y: 84,
      w: 748,
      h: 816,
      r: [24, 24, 0, 0],
      fill: C.card,
      stroke: C.line,
      clip: true,
      name: isEvidence ? "Página com evidência A2UI" : "Página com seleção",
    });
    const c = col(page, { x: 62, y: 24, w: 624, gap: 14 });

    // Banner sutil de simbiose (áudio pausado durante o chat ou vínculo com evidência A2UI)
    const syncBanner = row(c, {
      sizingH: "fill",
      pad: [8, 12, 8, 12],
      r: 12,
      fill: isEvidence ? C.indigoSoft : C.amberSoft,
      stroke: isEvidence ? C.indigoBorder : "#E9A23B55",
      main: "spaceBetween",
    });
    const sbLeft = row(syncBanner, { gap: 8 });
    if (isEvidence) I(sbLeft, "zap", { size: 13, color: C.indigo });
    else E(sbLeft, { w: 7, fill: C.amber });
    T(
      sbLeft,
      isEvidence
        ? "Superfície A2UI sincronizada · Evidência da Questão 2 (¶2)"
        : "Narração pausada em ¶1 (04:12) enquanto você conversa",
      { size: 12, weight: 600, color: isEvidence ? C.indigoInk : C.amberInk },
    );
    const resumeChip = row(syncBanner, { gap: 5, pad: [4, 10, 4, 8], r: 99, fill: C.amber });
    I(resumeChip, "play", { size: 10, color: C.ink, solid: true });
    T(resumeChip, isEvidence ? "Ouvir ¶2" : "Retomar", { size: 11.5, weight: 700, color: C.ink });
    link(resumeChip, "leitor");

    T(c, "CAPÍTULO I", { size: 12, weight: 700, ls: "16%", color: C.indigo });
    T(c, DOC.chapterTitle, { serif: true, weight: 600, size: 38, lh: "110%" });
    paragraph(c, DOC.p1a, { size: 18.5, lh: "166%", color: C.ink2 });

    if (isEvidence) {
      paragraph(c, `${DOC.p1b} ${DOC.p1c} ${DOC.p1d}`, { size: 18.5, lh: "166%", color: C.ink2 });
      const evLabel = row(c, { gap: 6, pad: [4, 10, 4, 8], r: 8, fill: C.greenSoft });
      I(evLabel, "check", { size: 12, color: C.green });
      T(evLabel, "Evidência citada na Questão 2 · ¶2", { size: 11.5, weight: 600, color: C.greenInk });
      currentSentence(c, DOC.p2, {
        size: 18.5,
        lh: "166%",
        fill: C.greenSoft,
        bar: C.green,
        activeWord: "no cabo",
        activeWordColor: C.greenInk,
        name: "Evidência A2UI",
      });
    } else {
      const menuSlot = row(c, { sizingH: "fill", main: "center" });
      const menu = row(menuSlot, {
        gap: 2,
        pad: 5,
        r: 14,
        fill: C.ink,
        fx: SHADOW_FLOAT,
        name: "Menu de seleção",
      });
      [
        ["sparkles", "Explicar"],
        ["play", "Ouvir daqui"],
        ["highlighter", "Destacar"],
        ["note", "Nota"],
      ].forEach(([ic, t], i) => {
        const b = row(menu, { gap: 6, pad: [7, 10, 7, 10], r: 10, fill: i === 0 ? C.indigo : undefined });
        I(b, ic, { size: 14, color: C.paper, solid: ic === "play" });
        T(b, t, { size: 12.5, weight: 600, color: C.paper });
      });

      currentSentence(c, `${DOC.p1b} ${DOC.p1c}`, {
        size: 18.5,
        lh: "166%",
        fill: C.indigoSoft,
        bar: C.indigo,
        name: "Trecho selecionado",
      });
      paragraph(c, DOC.p1d, { size: 18.5, lh: "166%" });
      paragraph(c, DOC.p2, { size: 18.5, lh: "166%" });
    }

    paragraph(c, DOC.p3, { size: 18.5, lh: "166%", color: isEvidence ? C.ink2 : C.ink });
    R(page, { x: 0, y: 610, w: 748, h: 206, fills: [{ type: "linearGradient", stops: ["#FFFDF800", "#FFFDF8"] }] });

    const d = dock(s, 96, 800, 716, { compact: true, mode: "pausedForChat" });
    link(d.playBtn, "leitor");
    link(d.voiceBtn, "estudioVoz");
    link(d.speedBtn, "estudioVoz");
  }

  function renderAssistantHeader(panel, activeTab) {
    const ph = row(panel, { sizingH: "fill", pad: [14, 16, 12, 18], main: "spaceBetween" });
    const pht = row(ph, { gap: 10 });
    const av = row(pht, { w: 34, h: 34, r: 10, fill: C.indigo, main: "center" });
    I(av, "sparkles", { size: 17, color: C.white });
    const phc = col(pht, { gap: 2 });
    T(phc, "Assistente de leitura", { size: 15, weight: 600 });
    const eng = row(phc, { gap: 6, pad: [2, 8, 2, 6], r: 99, fill: C.greenSoft });
    E(eng, { w: 6, fill: C.green });
    T(eng, "Gemma 4 E4B · Offline", { size: 11, weight: 600, color: C.greenInk });
    I(eng, "chevD", { size: 11, color: C.greenInk });

    const pha = row(ph, { gap: 4 });
    iconButton(pha, "history", { s: 34, size: 17 });
    const cl = iconButton(pha, "x", { s: 34, size: 17 });
    link(cl, "leitor");

    // Abas de modo do tutor IA
    const modeRow = row(panel, { gap: 6, pad: [0, 18, 12, 18], sizingH: "fill" });
    const tabs = {};
    [
      ["conversar", "Conversar"],
      ["simplificar", "Explicar simples"],
      ["quiz", "Quiz"],
      ["resumo", "Resumo"],
    ].forEach(([key, lbl]) => {
      const on = key === activeTab;
      const tb = row(modeRow, {
        h: 32,
        sizingV: "fixed",
        pad: [0, 12, 0, 12],
        r: 99,
        fill: on ? C.indigo : C.paper,
        stroke: on ? undefined : C.line,
        main: "center",
      });
      T(tb, lbl, { size: 12, weight: 600, color: on ? C.white : C.ink2 });
      tabs[key] = tb;
    });

    R(panel, { w: 564, h: 1, fill: C.line, sizingH: "fill" });
    return tabs;
  }

  return { renderReaderColumnForAssistant, renderAssistantHeader };
}

export function buildListeningAndAiScreens(ctx) {
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
    readerTop,
    paragraph,
    currentSentence,
    inlineVoiceReply,
    dock,
  } = ctx;
  const { renderReaderColumnForAssistant, renderAssistantHeader } = createAssistantHelpers(ctx);

  function renderLeitorBase(s) {
    readerTop(s);

    // Sumário à esquerda com duração estimada de áudio por capítulo
    const toc = col(s, { x: 20, y: 92, w: 244, gap: 2, name: "Sumário" });
    const th = row(toc, { gap: 8, pad: [0, 12, 10, 12] });
    I(th, "list", { size: 16, color: C.ink3 });
    T(th, "SUMÁRIO · ÁUDIO", { size: 11, weight: 700, ls: "12%", color: C.ink3 });
    CHAPTERS.forEach(([n, t, dur], i) => {
      const r = row(toc, {
        gap: 8,
        pad: [9, 12, 9, 12],
        r: 10,
        fill: i === 0 ? C.card : undefined,
        sizingH: "fill",
        cross: "min",
        fx: i === 0 ? SHADOW_SOFT : undefined,
      });
      T(r, n, { size: 12, weight: 700, color: i === 0 ? C.amberInk : C.ink3, w: 22 });
      T(r, t, { size: 13, weight: i === 0 ? 600 : 400, color: i === 0 ? C.ink : C.ink2, fillW: true, lh: "135%" });
      T(r, dur, { size: 11, weight: i === 0 ? 600 : 400, color: i === 0 ? C.amberInk : C.ink3 });
    });
    F(toc, { w: 10, h: 12 });
    const mk = row(toc, { gap: 6, pad: [0, 8, 0, 8], wrap: true, crossGap: 6, sizingH: "fill" });
    chip(mk, "3 destaques", { icon: "highlighter", size: 11.5, iconColor: C.amber, pad: [5, 10, 5, 8] });
    chip(mk, "2 notas", { icon: "note", size: 11.5, pad: [5, 10, 5, 8] });
    chip(mk, "4 marcadores", { icon: "bookmark", size: 11.5, iconColor: C.indigo, pad: [5, 10, 5, 8] });

    // Folha de leitura central
    const page = F(s, {
      x: 288,
      y: 84,
      w: 864,
      h: 816,
      r: [24, 24, 0, 0],
      fill: C.card,
      stroke: C.line,
      clip: true,
      name: "Página",
    });
    const c = col(page, { x: 104, y: 56, w: 656, gap: 20, name: "Coluna de leitura" });
    T(c, "CAPÍTULO I", { size: 12, weight: 700, ls: "16%", color: C.indigo });
    T(c, DOC.chapterTitle, { serif: true, weight: 600, size: 42, lh: "112%" });
    const meta = row(c, { gap: 10 });
    chip(meta, "≈ 6 min", { icon: "timer", size: 12, fill: C.paper, stroke: null });
    chip(meta, "Ouvindo agora · Dora", { dot: C.amber, size: 12, fill: C.amberSoft, stroke: null, color: C.amberInk });
    const ambBadge = chip(meta, "Chuva leve", {
      icon: "rain",
      iconColor: C.ink2,
      size: 12,
      fill: C.paper,
      stroke: C.line,
    });
    chip(meta, "Acompanhar voz", { icon: "check", iconColor: C.green, size: 11.5, fill: C.greenSoft, stroke: null, color: C.greenInk });

    paragraph(c, `${DOC.p1a} ${DOC.p1b}`, { color: C.ink2 });
    currentSentence(c, DOC.p1c, { activeWord: "defunto autor" });
    paragraph(c, `${DOC.p1d} ${DOC.p2}`);
    paragraph(c, DOC.p3);
    paragraph(c, DOC.p4);
    R(page, { x: 0, y: 600, w: 864, h: 216, fills: [{ type: "linearGradient", stops: ["#FFFDF800", "#FFFDF8"] }] });

    // Margem direita: notas + ponte rápida Escuta -> IA
    const mg = col(s, { x: 1176, y: 236, w: 244, gap: 12, name: "Margem" });
    const n1 = col(mg, { gap: 6, pad: 14, r: 14, fill: C.card, stroke: C.line, sizingH: "fill" });
    const n1h = row(n1, { gap: 6 });
    I(n1h, "note", { size: 14, color: C.amber });
    T(n1h, "Sua nota · ¶1", { size: 11.5, weight: 600, color: C.ink2 });
    T(n1, "Ironia logo na primeira frase — narrador morto e sem filtro.", { size: 13, lh: "145%", fillW: true });

    const ask = col(mg, { gap: 10, pad: 14, r: 14, fill: C.indigoSoft, stroke: C.indigoBorder, sizingH: "fill" });
    const askh = row(ask, { gap: 6 });
    I(askh, "sparkles", { size: 14, color: C.indigo });
    T(askh, "Dúvida no que ouviu?", { size: 12.5, weight: 600, color: C.indigoInk });
    T(ask, "A IA pausa o áudio automaticamente e cita o trecho exato.", {
      size: 12.5,
      lh: "145%",
      color: C.indigoInk,
      fillW: true,
    });
    const askb = chip(ask, "Explicar esta frase", {
      icon: "sparkles",
      iconColor: C.white,
      color: C.white,
      fill: C.indigo,
      stroke: null,
      size: 12,
    });
    const voiceAskBtn = chip(ask, "Perguntar por voz", {
      icon: "mic",
      iconColor: C.indigo,
      color: C.indigoInk,
      fill: C.white,
      stroke: null,
      size: 12,
    });

    const markBtn = chip(mg, "Marcar momento · 04:12", {
      icon: "bookmark",
      iconColor: C.amberInk,
      color: C.amberInk,
      fill: C.amberSoft,
      stroke: "#E9A23B55",
      size: 12,
    });

    const d = dock(s, 296, 800, 848, { mode: "playing" });
    return { ambBadge, askb, voiceAskBtn, markBtn, dock: d };
  }

  /* 04 · Leitor — Escuta sincronizada */
  function leitor() {
    const s = screen("leitor", "04 · Leitor — Escuta sincronizada", 1440, 900);
    const refs = renderLeitorBase(s);
    link(refs.askb, "assistente");
    link(refs.voiceAskBtn, "chatModos");
    link(refs.ambBadge, "estudioVoz");
    link(refs.dock.voiceBtn, "estudioVoz");
    link(refs.dock.speedBtn, "estudioVoz");
    link(refs.dock.ambientBtn, "estudioVoz");
    link(refs.dock.timerBtn, "estudioVoz");
  }

  /* 05 · Estúdio de voz e ambiência (sobreposto ao Leitor) */
  function estudioVoz() {
    const s = screen("estudioVoz", "05 · Estúdio de voz e ambiência", 1440, 900);
    renderLeitorBase(s);
    R(s, { x: 0, y: 0, w: 1440, h: 900, fill: "#1E2230", opacity: 0.28 });

    const pop = col(s, {
      x: 416,
      y: 164,
      w: 608,
      gap: 16,
      pad: 24,
      r: 24,
      fill: C.card,
      stroke: C.line,
      fx: SHADOW_FLOAT,
      name: "Estúdio de voz e ambiência",
    });

    // Cabeçalho
    const ph = row(pop, { sizingH: "fill", main: "spaceBetween" });
    const phl = row(ph, { gap: 10 });
    const hIcon = row(phl, { w: 38, h: 38, r: 12, fill: C.amberSoft, main: "center" });
    I(hIcon, "headphones", { size: 18, color: C.amberInk });
    const hTitle = col(phl, { gap: 1 });
    T(hTitle, "Estúdio de escuta", { serif: true, weight: 600, size: 20 });
    T(hTitle, "Ajuste voz, ritmo e ambiente sem sair da leitura", { size: 12, color: C.ink3 });
    const phr = row(ph, { gap: 8 });
    chip(phr, "Offline · zero latência", {
      dot: C.green,
      fill: C.greenSoft,
      color: C.greenInk,
      stroke: null,
      size: 11.5,
    });
    const cl = iconButton(phr, "x", { s: 34, fill: C.paper });
    link(cl, "leitor");

    // Seletor de motor TTS
    const engineTabs = row(pop, { gap: 4, pad: 4, r: 14, fill: C.paper, sizingH: "fill" });
    [
      ["IA Local (Offline)", true],
      ["Gemini (Nuvem BYOK)", false],
      ["Voz do Sistema", false],
    ].forEach(([label, on]) => {
      const tb = row(engineTabs, {
        h: 36,
        sizingV: "fixed",
        sizingH: "fill",
        main: "center",
        r: 10,
        fill: on ? C.card : undefined,
        fx: on ? SHADOW_SOFT : undefined,
      });
      T(tb, label, { size: 12.5, weight: 600, color: on ? C.ink : C.ink2 });
    });

    // Grade 2x2 de vozes locais reais (2 linhas explícitas para garantir simetria perfeita)
    const vSec = col(pop, { gap: 8, sizingH: "fill" });
    const vHead = row(vSec, { sizingH: "fill", main: "spaceBetween" });
    T(vHead, "VOZES EM PORTUGUÊS", { size: 11, weight: 700, ls: "12%", color: C.ink3 });
    T(vHead, "Kokoro 82M & Piper ONNX", { size: 11.5, color: C.ink3 });
    const vGrid = col(vSec, { gap: 10, sizingH: "fill" });
    for (let rIdx = 0; rIdx < VOICES.length; rIdx += 2) {
      const vRow = row(vGrid, { gap: 10, sizingH: "fill" });
      VOICES.slice(rIdx, rIdx + 2).forEach(([vName, engineSub, tone, active]) => {
        const vc = row(vRow, {
          gap: 10,
          pad: [11, 12, 11, 12],
          r: 14,
          fill: active ? C.amberSoft : C.paper,
          stroke: active ? C.amber : C.line,
          sw: active ? 2 : 1,
          sizingH: "fill",
          main: "spaceBetween",
        });
        const vLeft = col(vc, { gap: 2 });
        const vTitleRow = row(vLeft, { gap: 6 });
        T(vTitleRow, vName, { size: 14, weight: 700, color: active ? C.amberInk : C.ink });
        if (active) T(vTitleRow, "● Tocando", { size: 11, weight: 700, color: C.amberInk });
        T(vLeft, `${engineSub} · ${tone}`, { size: 11, color: active ? C.amberInk : C.ink2 });
        const preview = row(vc, {
          w: 30,
          h: 30,
          r: 15,
          fill: active ? C.amber : C.card,
          stroke: active ? undefined : C.line,
          main: "center",
        });
        I(preview, active ? "wave" : "play", { size: 13, color: active ? C.ink : C.ink2, solid: !active });
      });
    }

    // Ritmo de leitura
    const rSec = col(pop, { gap: 8, sizingH: "fill" });
    const rHead = row(rSec, { sizingH: "fill", main: "spaceBetween" });
    T(rHead, "RITMO DA NARRAÇÃO", { size: 11, weight: 700, ls: "12%", color: C.ink3 });
    T(rHead, "Restam 1h44 no livro (28 min mais rápido)", { size: 11.5, weight: 600, color: C.amberInk });
    const speeds = row(rSec, { gap: 8, sizingH: "fill" });
    ["0,8×", "1,0×", "1,25×", "1,5×", "2,0×"].forEach((sp) => {
      const on = sp === "1,25×";
      const sb = row(speeds, {
        h: 36,
        sizingV: "fixed",
        sizingH: "fill",
        main: "center",
        r: 10,
        fill: on ? C.ink : C.paper,
        stroke: on ? undefined : C.line,
      });
      T(sb, sp, { size: 13, weight: 600, color: on ? C.amber : C.ink2 });
    });

    // Som ambiente + Mixer
    const aSec = col(pop, { gap: 10, sizingH: "fill" });
    T(aSec, "SOM AMBIENTE & MIXAGEM", { size: 11, weight: 700, ls: "12%", color: C.ink3 });
    const ambRow = row(aSec, { gap: 8, sizingH: "fill" });
    AMBIENT_PRESETS.forEach(([ic, lbl, on]) => {
      const ab = row(ambRow, {
        gap: 6,
        h: 36,
        sizingV: "fixed",
        sizingH: "fill",
        main: "center",
        r: 10,
        fill: on ? C.ink : C.paper,
        stroke: on ? undefined : C.line,
      });
      I(ab, ic, { size: 14, color: on ? C.amber : C.ink2 });
      T(ab, lbl, { size: 12, weight: 600, color: on ? C.paper : C.ink2 });
    });
    const sliders = row(aSec, { gap: 16, sizingH: "fill" });
    [
      ["Voz", "100%", 0.92, C.amber],
      ["Chuva", "25%", 0.25, C.ink2],
    ].forEach(([lbl, pctTxt, pct, fillCol]) => {
      const sl = row(sliders, { gap: 8, sizingH: "fill" });
      T(sl, lbl, { size: 12, weight: 600, color: C.ink2, w: 54 });
      const track = F(sl, { h: 6, r: 99, fill: C.paper2, sizingH: "fill", clip: true });
      R(track, { x: 0, y: 0, w: Math.round(160 * pct), h: 6, r: 99, fill: fillCol });
      T(sl, pctTxt, { size: 11.5, weight: 600, color: C.ink3, w: 34 });
    });

    // Rodapé: Timer + Simbiose Áudio-IA
    R(pop, { w: 560, h: 1, fill: C.line, sizingH: "fill" });
    const foot = row(pop, { sizingH: "fill", main: "spaceBetween" });
    const timerRow = row(foot, { gap: 6 });
    I(timerRow, "timer", { size: 15, color: C.ink3 });
    ["Off", "15m", "Fim cap."].forEach((tm) => {
      const on = tm === "Fim cap.";
      chip(timerRow, tm, {
        size: 11.5,
        fill: on ? C.ink : C.paper,
        color: on ? C.paper : C.ink2,
        stroke: on ? null : C.line,
        pad: [5, 10, 5, 10],
      });
    });
    const autoPause = row(foot, { gap: 6, pad: [6, 12, 6, 10], r: 99, fill: C.indigoSoft });
    I(autoPause, "sparkles", { size: 13, color: C.indigo });
    T(autoPause, "Pausa auto ao perguntar à IA: ON", { size: 11.5, weight: 600, color: C.indigoInk });
    const applyBtn = button(foot, "Pronto", { kind: "amber", h: 34, px: 16, size: 12.5 });
    link(applyBtn, "leitor");
  }

  /* 06 · Leitor + Assistente de IA (Simbiose Áudio <-> IA + A2UI) */
  function assistente() {
    const s = screen("assistente", "06 · Leitor + Assistente de IA", 1440, 900);
    renderReaderColumnForAssistant(s);

    const panel = col(s, {
      x: 852,
      y: 84,
      w: 564,
      h: 800,
      sizingV: "fixed",
      r: 24,
      fill: C.card,
      stroke: C.line,
      fx: SHADOW_SOFT,
      clip: true,
      name: "Assistente de leitura",
    });
    const tabs = renderAssistantHeader(panel, "conversar");
    link(tabs.quiz, "chatModos");

    // Escopo de contexto clicável
    const ctxBar = row(panel, { gap: 6, pad: [8, 18, 8, 18], sizingH: "fill", fill: C.paper });
    T(ctxBar, "Contexto:", { size: 11.5, weight: 600, color: C.ink3 });
    [
      ["Frase atual", false],
      ["Cap. I + seleção", true],
      ["Livro todo", false],
    ].forEach(([lbl, on]) => {
      chip(ctxBar, lbl, {
        size: 11,
        fill: on ? C.indigoSoft : C.card,
        color: on ? C.indigoInk : C.ink2,
        stroke: on ? C.indigoBorder : C.line,
        pad: [4, 9, 4, 9],
      });
    });

    const msgs = col(panel, { gap: 12, pad: [14, 18, 10, 18], sizingH: "fill", sizingV: "fill", name: "Mensagens" });

    // Pergunta do usuário
    const q = col(msgs, { gap: 6, sizingH: "fill", cross: "max" });
    const qq = row(q, { gap: 6, pad: [5, 10, 5, 8], r: 8, fill: C.indigoSoft });
    I(qq, "quote", { size: 11, color: C.indigo });
    T(qq, "“…não sou propriamente um autor defunto, mas um defunto autor…”", { size: 11, italic: true, color: C.indigoInk });
    const qb = row(q, { pad: [10, 14, 10, 14], r: 16, fill: C.ink, w: 368 });
    T(qb, "Por que ele se chama de “defunto autor” e não “autor defunto”?", {
      size: 13.5,
      lh: "145%",
      color: C.paper,
      fillW: true,
    });

    // Resposta estruturada da IA + áudio da resposta + fontes clicáveis
    const a = col(msgs, { gap: 9, sizingH: "fill" });
    T(a, "Ele inverte a expressão de propósito:", { size: 14, lh: "152%", fillW: true });
    const li = col(a, { gap: 6, sizingH: "fill", pad: [0, 0, 0, 4] });
    [
      ["Autor defunto:", "um escritor que já morreu."],
      ["Defunto autor:", "um morto que resolveu escrever — o caso de Brás Cubas."],
    ].forEach(([b, t]) => {
      const full = `${b} ${t}`;
      const r = row(li, { gap: 8, sizingH: "fill", cross: "min" });
      const dot = row(r, { w: 6, h: 21, main: "center" });
      R(dot, { w: 6, h: 6, r: 3, fill: C.indigo });
      const tid = T(r, full, { size: 13.5, lh: "152%", fillW: true });
      styleRange(tid, full, b, { fontStyle: "SemiBold", textFills: [C.indigoInk] });
    });
    T(a, "Como já está morto, ele narra sem medo de julgamento — o que explica o tom irônico do livro.", {
      size: 13.5,
      lh: "152%",
      fillW: true,
    });

    // Mini-player âmbar da resposta + Fontes clicáveis
    const audioAndSrc = row(a, { gap: 8, wrap: true, crossGap: 6, sizingH: "fill" });
    inlineVoiceReply(audioAndSrc, "0:22");
    const src1 = chip(audioAndSrc, "¶1 · “um defunto autor”", {
      icon: "quote",
      iconColor: C.indigo,
      color: C.indigo,
      fill: C.indigoSoft,
      stroke: null,
      size: 11.5,
      pad: [5, 10, 5, 8],
    });
    chip(audioAndSrc, "¶1 · “a campa foi outro berço”", {
      icon: "quote",
      iconColor: C.indigo,
      color: C.indigo,
      fill: C.indigoSoft,
      stroke: null,
      size: 11.5,
      pad: [5, 10, 5, 8],
    });
    link(src1, "leitor");

    // Ações pós-resposta ligando de volta à escuta e notas
    const acts = row(a, { gap: 6 });
    const resumeAct = row(acts, { gap: 6, pad: [5, 10, 5, 8], r: 8, fill: C.paper });
    I(resumeAct, "play", { size: 12, color: C.amberInk, solid: true });
    T(resumeAct, "Retomar livro em ¶1", { size: 11.5, weight: 600, color: C.amberInk });
    link(resumeAct, "leitor");
    [
      ["note", "Salvar nota"],
      ["copy", "Copiar"],
    ].forEach(([ic, t]) => {
      const b = row(acts, { gap: 5, pad: [5, 9, 5, 8], r: 8 });
      I(b, ic, { size: 13, color: C.ink2 });
      T(b, t, { size: 11.5, weight: 600, color: C.ink2 });
    });

    // Mini-Card A2UI sugerido pelo agente (preenche a superfície com widget declarativo acionável)
    const a2uiCard = col(msgs, {
      gap: 8,
      pad: 12,
      r: 16,
      fill: "#F7F6FE",
      stroke: C.indigoBorder,
      sizingH: "fill",
      name: "Mini-Card A2UI sugerido",
    });
    const a2Top = row(a2uiCard, { sizingH: "fill", main: "spaceBetween" });
    const a2Badge = row(a2Top, { gap: 5, pad: [3, 8, 3, 7], r: 99, fill: C.indigoSoft });
    I(a2Badge, "zap", { size: 11, color: C.indigo });
    T(a2Badge, "A2UI · Widget nativo", { size: 11, weight: 700, color: C.indigoInk });
    T(a2Top, "3 questões · ~1 min", { size: 11, color: C.ink3 });
    T(a2uiCard, "Quer fixar a ironia do “defunto autor” no texto?", {
      size: 13,
      weight: 600,
      color: C.ink,
      fillW: true,
    });
    const a2Foot = row(a2uiCard, { sizingH: "fill", main: "spaceBetween" });
    T(a2Foot, "Múltipla escolha + áudio + citação", { size: 11.5, color: C.ink2 });
    const startQuizBtn = button(a2Foot, "Gerar Quiz interativo", {
      kind: "accent",
      iconR: "arrowR",
      h: 34,
      px: 13,
      size: 12,
    });
    link(startQuizBtn, "chatModos");

    // Sugestões contextuais
    const sug = row(panel, { gap: 6, pad: [0, 18, 10, 18], sizingH: "fill", wrap: true, crossGap: 6 });
    chip(sug, "Resumir até onde ouvi", { icon: "sparkles", iconColor: C.indigo, size: 12, pad: [6, 10, 6, 8] });
    const quizSug = chip(sug, "Testar entendimento", { icon: "sparkles", iconColor: C.indigo, size: 12, pad: [6, 10, 6, 8] });
    chip(sug, "Explicar mais simples", { icon: "sparkles", iconColor: C.indigo, size: 12, pad: [6, 10, 6, 8] });
    link(quizSug, "chatModos");

    // Composer multimodal
    const inWrap = col(panel, { pad: [0, 18, 18, 18], sizingH: "fill" });
    const inp = col(inWrap, {
      gap: 8,
      pad: 12,
      r: 18,
      fill: C.card,
      stroke: C.line2,
      sizingH: "fill",
      fx: SHADOW_SOFT,
      name: "Campo de pergunta multimodal",
    });
    const tag = row(inp, { gap: 6, pad: [4, 8, 4, 8], r: 8, fill: C.indigoSoft });
    I(tag, "quote", { size: 11, color: C.indigo });
    T(tag, "Trecho selecionado · ¶1", { size: 11.5, weight: 600, color: C.indigoInk });
    I(tag, "x", { size: 11, color: C.indigoInk });
    T(inp, "Pergunte, fale ou anexe uma foto do caderno…", { size: 14, color: C.ink3 });
    const ia = row(inp, { sizingH: "fill", main: "spaceBetween" });
    const ial = row(ia, { gap: 4 });
    iconButton(ial, "image", { s: 34, size: 17 });
    const micBtn = iconButton(ial, "mic", { s: 34, size: 17, fill: C.indigoSoft, color: C.indigo });
    link(micBtn, "chatModos");
    iconButton(ial, "plus", { s: 34, size: 17 });
    const send = row(ia, { w: 36, h: 36, r: 18, fill: C.indigo, main: "center" });
    I(send, "arrowUp", { size: 17, color: C.white, sw: 2.2 });
  }

  leitor();
  estudioVoz();
  assistente();
}
