// Telas 00 a 03: Capa da jornada, Início, Biblioteca e Adicionar leitura.

import { C, DOC, SHADOW_FLOAT, SHADOW_SOFT, SHELF } from "./tokens.mjs";

export function buildJourneyScreens(ctx) {
  const { screen, link, F, row, col, T, R, E, I, logo, button, iconButton, chip, waveform, progressBar, cover, topNav, currentSentence, inlineVoiceReply, addStep } = ctx;

  /* 00 · Capa da jornada */
  function capa() {
    const s = screen("capa", "00 · Capa da jornada", 1440, 900, { fill: C.night });
    logo(s, { x: 72, y: 56, dark: true });
    T(s, "REPAGINAÇÃO V2 · ESCUTA & CHAT DE IA", { x: 72, y: 138, size: 12, weight: 700, ls: "14%", color: C.amber });
    T(s, "Ouça com prazer.\nConverse sem sair do texto.", {
      x: 72,
      y: 168,
      w: 710,
      serif: true,
      weight: 600,
      size: 52,
      lh: "110%",
      color: C.paper,
    });
    T(
      s,
      "Estúdio de escuta offline (Kokoro e Piper), destaque sincronizado palavra a palavra e um assistente de IA multimodal que pausa o áudio automaticamente, responde com fontes clicáveis e pode ser ouvido.",
      { x: 72, y: 312, w: 640, size: 17, lh: "155%", color: C.nightText2 },
    );

    // Composição visual à direita (sem encostar nos cards de y=474)
    const art = F(s, { x: 840, y: 56, w: 528, h: 304, r: 24, fill: C.paper, clip: true, name: "Arte editorial" });
    R(art, { x: 32, y: 36, w: 180, h: 10, r: 5, fill: C.line2 });
    R(art, { x: 32, y: 60, w: 380, h: 8, r: 4, fill: C.line });
    R(art, { x: 32, y: 78, w: 340, h: 8, r: 4, fill: C.line });
    R(art, { x: 24, y: 100, w: 480, h: 66, r: 12, fill: C.amberSoft });
    R(art, { x: 24, y: 100, w: 4, h: 66, r: 2, fill: C.amber });
    R(art, { x: 40, y: 118, w: 390, h: 8, r: 4, fill: "#D9B46A" });
    R(art, { x: 40, y: 138, w: 140, h: 8, r: 4, fill: C.amberInk });
    R(art, { x: 188, y: 138, w: 160, h: 8, r: 4, fill: "#D9B46A" });
    R(art, { x: 32, y: 184, w: 220, h: 8, r: 4, fill: C.line });

    const bub = F(art, { x: 204, y: 186, w: 298, h: 96, r: 18, fill: C.indigo, fx: SHADOW_FLOAT });
    I(bub, "sparkles", { x: 16, y: 16, size: 17, color: C.white });
    R(bub, { x: 42, y: 20, w: 214, h: 7, r: 4, fill: "#FFFFFF99" });
    R(bub, { x: 42, y: 36, w: 170, h: 7, r: 4, fill: "#FFFFFF66" });
    const qRow = row(bub, { x: 42, y: 56, gap: 6 });
    const qc = row(qRow, { gap: 4, pad: [4, 9, 4, 8], r: 99, fill: "#FFFFFF26" });
    I(qc, "quote", { size: 10, color: C.white });
    T(qc, "¶1", { size: 10.5, weight: 700, color: C.white });
    const vc = row(qRow, { gap: 5, pad: [4, 9, 4, 8], r: 99, fill: C.amber });
    I(vc, "play", { size: 9, color: C.ink, solid: true });
    T(vc, "0:18", { size: 10.5, weight: 700, color: C.ink });

    const pl = row(s, {
      x: 840,
      y: 374,
      w: 528,
      h: 68,
      sizingV: "fixed",
      pad: [0, 18, 0, 12],
      gap: 14,
      r: 34,
      fill: C.nightCard,
      stroke: C.nightLine,
      name: "Player decorativo",
    });
    const pb = row(pl, { w: 44, h: 44, r: 22, fill: C.amber, main: "center" });
    I(pb, "pause", { size: 16, color: C.ink, solid: true });
    waveform(pl, { n: 38, progress: 0.42, played: C.amber, rest: C.nightLine, max: 22, fillW: true });
    T(pl, "04:12", { size: 12, weight: 600, color: C.nightText });
    chip(pl, "1,25×", { size: 12, fill: "#FFFFFF12", stroke: null, color: C.amberGlow, pad: [5, 10, 5, 10] });

    // 4 Princípios sem nenhuma sobreposição
    const princ = row(s, { x: 72, y: 474, gap: 16, name: "Princípios" });
    [
      ["book", C.amber, "#E9A23B22", "Leitura primeiro", "Coluna de 68 caracteres, serifa confortável e zero ruído em volta do texto."],
      ["headphones", C.amber, "#E9A23B22", "Estúdio de escuta", "Vozes neurais offline (Kokoro e Piper), ritmo 0,8×–2,0× e som ambiente."],
      ["sparkles", C.indigoBorder, "#4B44D633", "Simbiose Áudio ↔ IA", "Pausa automática ao perguntar, respostas narradas e fontes clicáveis."],
      ["shield", C.green, "#2E8B5728", "Privado e multimodal", "Gemma 4 no dispositivo com texto, voz e imagem — funcionando offline."],
    ].forEach(([icon, icColor, icBg, t, d]) => {
      const c = col(princ, { w: 312, h: 176, sizingV: "fixed", gap: 10, pad: 22, r: 18, fill: C.nightCard, stroke: C.nightLine });
      const ic = row(c, { w: 36, h: 36, r: 10, fill: icBg, main: "center" });
      I(ic, icon, { size: 18, color: icColor });
      T(c, t, { size: 16, weight: 600, color: C.paper });
      T(c, d, { size: 13, lh: "150%", color: C.nightText2, fillW: true });
    });

    T(s, "A JORNADA · 9 ETAPAS INTERATIVAS", { x: 72, y: 692, size: 12, weight: 700, ls: "14%", color: C.nightText2 });
    const j = row(s, { x: 72, y: 722, gap: 5, name: "Mapa da jornada" });
    const stepsList = [
      ["01", "Início", "inicio"],
      ["02", "Biblioteca", "biblioteca"],
      ["03", "Adicionar", "adicionar"],
      ["04", "Leitor", "leitor"],
      ["05", "Estúdio", "estudioVoz"],
      ["06", "Leitor + IA", "assistente"],
      ["07", "Quiz & Voz", "chatModos"],
      ["08", "Foco", "foco"],
      ["09", "Celular", "mobileLeitor"],
    ];
    stepsList.forEach(([n, t, key], i) => {
      const c = row(j, {
        gap: 6,
        pad: [10, 11, 10, 10],
        r: 12,
        fill: i === 0 ? C.amber : C.nightCard,
        stroke: i === 0 ? undefined : C.nightLine,
        name: `Etapa ${n}`,
      });
      T(c, n, { size: 11.5, weight: 700, color: i === 0 ? C.ink : C.amber });
      T(c, t, { size: 12.5, weight: 600, color: i === 0 ? C.ink : C.paper });
      link(c, key);
      if (i < stepsList.length - 1) I(j, "arrowR", { size: 12, color: C.nightText2 });
    });
    T(s, "Dica: aperte Shift+Espaço no FigCraft para navegar pelo protótipo. Clique nas etapas acima para pular direto.", {
      x: 72,
      y: 794,
      size: 13,
      color: C.nightText2,
    });
  }

  /* 01 · Início */
  function inicio() {
    const s = screen("inicio", "01 · Início", 1440, 1200);
    R(s, { x: 820, y: -120, w: 760, h: 760, r: 380, fill: C.paper2, opacity: 0.8 });
    const { cta } = topNav(s);
    link(cta, "biblioteca");

    const eyebrow = chip(s, "Leitor com voz neural e IA · direto no navegador", {
      icon: "sparkles",
      iconColor: C.indigo,
      color: C.indigoInk,
      fill: C.indigoSoft,
      stroke: null,
    });
    addStep("node.set", { ids: [eyebrow], x: 72, y: 142 });

    T(s, "Ouça qualquer texto.\nConverse com ele.", {
      x: 72,
      y: 192,
      w: 620,
      serif: true,
      weight: 600,
      size: 62,
      lh: "106%",
      color: C.ink,
    });
    T(
      s,
      "Solte um PDF, livro ou artigo e ouça com vozes naturais offline em português, acompanhando a leitura palavra por palavra. Ficou com dúvida? Pergunte por texto, voz ou imagem.",
      { x: 72, y: 348, w: 540, size: 18, lh: "155%", color: C.ink2 },
    );

    const ctas = row(s, { x: 72, y: 472, gap: 12 });
    const c1 = button(ctas, "Começar a ouvir — é grátis", {
      kind: "accent",
      h: 52,
      px: 24,
      icon: "play",
      solidIcon: true,
      iconSize: 14,
      size: 15,
    });
    const c2 = button(ctas, "Explorar o leitor", { kind: "ghost", h: 52, px: 22, size: 15 });
    link(c1, "biblioteca");
    link(c2, "leitor");

    const trust = row(s, { x: 72, y: 552, gap: 20 });
    [
      ["check", "Sem cadastro"],
      ["cpu", "Voz e IA 100% offline"],
      ["cloud", "Sync opcional no Drive"],
    ].forEach(([ic, t]) => {
      const r = row(trust, { gap: 6 });
      I(r, ic, { size: 15, color: C.green });
      T(r, t, { size: 13, color: C.ink2 });
    });

    // Mock do produto à direita
    const mock = F(s, {
      x: 696,
      y: 128,
      w: 672,
      h: 528,
      r: 24,
      fill: C.card,
      stroke: C.line,
      fx: SHADOW_FLOAT,
      clip: true,
      name: "Mock do produto",
    });
    const mtop = row(mock, { x: 0, y: 0, w: 672, h: 52, sizingV: "fixed", pad: [0, 20, 0, 20], main: "spaceBetween" });
    const mt = row(mtop, { gap: 8 });
    I(mt, "book", { size: 16, color: C.ink2 });
    T(mt, "Brás Cubas · Cap. I", { size: 13, weight: 600 });
    const mtr = row(mtop, { gap: 8 });
    chip(mtr, "Gemma 4 · Offline", { dot: C.green, fill: C.greenSoft, color: C.greenInk, stroke: null, size: 11.5 });
    chip(mtr, "Assistente", { icon: "sparkles", iconColor: C.white, color: C.white, fill: C.indigo, stroke: null, size: 12 });
    R(mock, { x: 0, y: 52, w: 672, h: 1, fill: C.line });

    const mcol = col(mock, { x: 28, y: 74, w: 356, gap: 12 });
    T(mcol, "Óbito do autor", { serif: true, weight: 600, size: 24, fillW: true });
    T(mcol, DOC.p1a, { serif: true, size: 14, lh: "165%", color: C.ink2, fillW: true });
    currentSentence(mcol, DOC.p1c, { size: 14, activeWord: "defunto autor" });
    T(mcol, DOC.p1d, { serif: true, size: 14, lh: "165%", color: C.ink2, fillW: true });

    const mchat = col(mock, { x: 404, y: 72, w: 240, gap: 10 });
    const mq = row(mchat, { pad: [10, 12, 10, 12], r: 14, fill: C.paper, sizingH: "fill" });
    T(mq, "Por que “defunto autor”?", { size: 12.5, weight: 600, fillW: true });
    const ma = col(mchat, { pad: 12, gap: 8, r: 14, fill: C.indigoSoft, sizingH: "fill" });
    T(
      ma,
      "Ele inverte a expressão: não é um escritor que morreu, é um morto que resolveu escrever — daí o tom irônico.",
      { size: 12.5, lh: "150%", color: C.indigoInk, fillW: true },
    );
    inlineVoiceReply(ma, "0:16", { label: "Ouvir" });
    chip(ma, "¶1 · “um defunto autor”", {
      icon: "quote",
      iconColor: C.indigo,
      color: C.indigo,
      fill: C.white,
      stroke: null,
      size: 11,
    });

    const mdock = row(mock, {
      x: 28,
      y: 446,
      w: 616,
      h: 58,
      sizingV: "fixed",
      pad: [0, 14, 0, 8],
      gap: 12,
      r: 29,
      fill: C.ink,
    });
    const mpb = row(mdock, { w: 42, h: 42, r: 21, fill: C.amber, main: "center" });
    I(mpb, "pause", { size: 14, color: C.ink, solid: true });
    waveform(mdock, { n: 40, progress: 0.38, played: C.amber, rest: "#FFFFFF33", max: 20, fillW: true });
    T(mdock, "04:12", { size: 12, weight: 600, color: C.paper });
    chip(mdock, "Dora · 1,25×", { size: 11.5, fill: "#FFFFFF1A", stroke: null, color: C.amberGlow, pad: [5, 10, 5, 10] });

    // Como funciona
    T(s, "COMO FUNCIONA", { x: 72, y: 734, size: 12, weight: 700, ls: "14%", color: C.indigo });
    T(s, "Do arquivo à conversa em três passos", { x: 72, y: 760, serif: true, weight: 600, size: 36, color: C.ink });
    const how = row(s, { x: 72, y: 834, gap: 20, cross: "min" });
    [
      ["upload", C.indigo, C.indigoSoft, "1. Solte o arquivo", "PDF, EPUB, DOCX, ODT, PPTX, TXT, Markdown ou o link de um artigo. Texto em imagem? Lemos com OCR."],
      ["headphones", C.amberInk, C.amberSoft, "2. Ouça no seu ritmo", "Vozes neurais offline (Kokoro e Piper), destaque palavra a palavra, som ambiente e retomada exata."],
      ["sparkles", C.indigo, C.indigoSoft, "3. Converse com a IA", "Pergunte por texto, voz ou foto do caderno. A IA pausa a leitura, cita os trechos e pode responder em áudio."],
    ].forEach(([ic, icColor, icBg, t, d]) => {
      const c = col(how, { w: 418, gap: 12, pad: 28, r: 20, fill: C.card, stroke: C.line });
      const icb = row(c, { w: 44, h: 44, r: 12, fill: icBg, main: "center" });
      I(icb, ic, { size: 20, color: icColor });
      T(c, t, { size: 18, weight: 600 });
      T(c, d, { size: 14, lh: "155%", color: C.ink2, fillW: true });
    });

    const fmts = row(s, { x: 72, y: 1082, gap: 8 });
    T(fmts, "Formatos:", { size: 13, color: C.ink3 });
    ["PDF", "EPUB", "DOCX", "ODT", "PPTX", "TXT", "MD", "Link da web", "Texto colado"].forEach((f) => chip(fmts, f, { size: 12 }));
  }

  /* 02 · Biblioteca (reutilizada como fundo do 03) */
  function biblioteca(key, name) {
    const s = screen(key, name, 1440, 900);
    const side = col(s, {
      x: 0,
      y: 0,
      w: 248,
      h: 900,
      sizingV: "fixed",
      pad: [28, 20, 28, 20],
      gap: 4,
      fill: C.paper2,
      name: "Barra lateral",
    });
    logo(side);
    F(side, { w: 10, h: 24 });
    [
      ["library", "Biblioteca", true],
      ["highlighter", "Destaques e notas", false],
      ["cpu", "Modelos de IA", false],
      ["settings", "Preferências", false],
      ["heart", "Apoiar o projeto", false],
    ].forEach(([ic, t, on]) => {
      const r = row(side, { gap: 12, pad: [10, 12, 10, 12], r: 10, fill: on ? C.card : undefined, sizingH: "fill", fx: on ? SHADOW_SOFT : undefined });
      I(r, ic, { size: 18, color: on ? C.indigo : C.ink2 });
      T(r, t, { size: 14, weight: on ? 600 : 400, color: on ? C.ink : C.ink2 });
    });
    F(side, { w: 10, h: 10, sizingV: "fill" });

    // Card de sync aderente às regras (textos offline LRU + áudios/API Key na nuvem)
    const st = col(side, { gap: 8, pad: 16, r: 14, fill: C.card, stroke: C.line, sizingH: "fill" });
    const st1 = row(st, { gap: 8 });
    I(st1, "cloud", { size: 16, color: C.green });
    T(st1, "Sincronizado no Drive", { size: 12, weight: 600 });
    T(st, "12 leituras recentes offline", { size: 12, color: C.ink2 });
    T(st, "Áudios e chave IA na nuvem", { size: 11, color: C.ink3 });
    progressBar(st, 0.38, { w: 176, color: C.green });

    const head = row(s, { x: 296, y: 32, w: 1096, main: "spaceBetween" });
    const hl = col(head, { gap: 4 });
    T(hl, "Boa noite", { size: 14, color: C.ink2 });
    T(hl, "Sua biblioteca", { serif: true, weight: 600, size: 34 });
    const hr = row(head, { gap: 10 });
    const search = row(hr, { w: 320, h: 44, sizingV: "fixed", pad: [0, 14, 0, 14], gap: 10, r: 22, fill: C.card, stroke: C.line });
    I(search, "search", { size: 16, color: C.ink3 });
    T(search, "Buscar leituras, trechos, conversas…", { size: 13, color: C.ink3 });
    const addBtn = button(hr, "Adicionar", { kind: "primary", icon: "plus", h: 44 });
    link(addBtn, "adicionar");

    // Continuar ouvindo
    const cont = row(s, {
      x: 296,
      y: 128,
      w: 700,
      h: 256,
      sizingV: "fixed",
      pad: 24,
      gap: 24,
      r: 24,
      fill: C.ink,
      name: "Continuar ouvindo",
      fx: SHADOW_FLOAT,
    });
    cover(cont, "Memórias Póstumas de Brás Cubas", "EPUB", { w: 140, h: 188, titleSize: 16 });
    const cc = col(cont, { gap: 8, sizingH: "fill" });
    T(cc, "CONTINUAR OUVINDO · DORA (OFFLINE)", { size: 11, weight: 700, ls: "12%", color: C.amber });
    T(cc, DOC.title, { serif: true, weight: 600, size: 24, color: C.paper, fillW: true, lh: "120%" });
    T(cc, "Machado de Assis · Cap. I — Óbito do autor", { size: 13, color: C.nightText2 });
    T(cc, "“...mas um defunto autor, para quem a campa foi outro berço...”", { size: 12.5, italic: true, color: "#D6D8E0", fillW: true });
    const pr = row(cc, { gap: 12, sizingH: "fill" });
    progressBar(pr, 0.34, { w: 290, color: C.amber, track: "#FFFFFF22" });
    T(pr, "34% · 2h10 a 1,25×", { size: 12, color: C.nightText2 });
    const ca = row(cc, { gap: 10 });
    const play = button(ca, "Continuar de onde parei", { kind: "amber", icon: "play", solidIcon: true, iconSize: 13, h: 42 });
    const chatBtn = button(ca, "Retomar chat (4)", { kind: "night", icon: "sparkles", h: 42, px: 16 });
    link(play, "leitor");
    link(chatBtn, "assistente");

    // Adicionar leitura
    const add = col(s, {
      x: 1016,
      y: 128,
      w: 376,
      h: 256,
      sizingV: "fixed",
      pad: 22,
      gap: 8,
      r: 24,
      fill: C.card,
      stroke: C.line2,
      dashes: [6, 5],
      name: "Adicionar leitura",
    });
    T(add, "Adicionar leitura", { size: 16, weight: 600 });
    T(add, "Arraste um arquivo para cá ou escolha uma origem:", { size: 13, color: C.ink2, fillW: true });
    [
      ["upload", "Arquivo do aparelho", "PDF, EPUB, DOCX, PPTX…"],
      ["link", "Link de um artigo", "Extraímos só o texto"],
      ["clipboard", "Colar texto", "Ouça na hora"],
    ].forEach(([ic, t, d]) => {
      const r = row(add, { gap: 12, pad: [6, 10, 6, 6], r: 12, fill: C.paper, sizingH: "fill" });
      const ib = row(r, { w: 32, h: 32, r: 8, fill: C.card, main: "center" });
      I(ib, ic, { size: 16, color: C.indigo });
      const tt = col(r, { gap: 1, sizingH: "fill" });
      T(tt, t, { size: 13, weight: 600 });
      T(tt, d, { size: 11.5, color: C.ink3 });
      I(r, "chevR", { size: 16, color: C.ink3 });
      link(r, "adicionar");
    });

    // Estante
    const sh = row(s, { x: 296, y: 420, w: 1096, main: "spaceBetween" });
    T(sh, "Estante", { serif: true, weight: 600, size: 22 });
    const filters = row(sh, { gap: 8 });
    ["Tudo", "Ouvindo", "Com chat IA", "Livros", "PDFs", "Artigos", "Concluídos"].forEach((f, i) =>
      chip(filters, f, { fill: i === 0 ? C.ink : C.card, color: i === 0 ? C.paper : C.ink2, stroke: i === 0 ? null : C.line, size: 12.5 }),
    );
    const grid = row(s, { x: 296, y: 468, w: 1096, gap: 20, cross: "min", name: "Estante" });
    SHELF.forEach(([t, f, m, p, status, aiCount]) => {
      const c = col(grid, { w: 166, gap: 7 });
      cover(c, t, f, { w: 166, h: 212, fx: SHADOW_SOFT });
      T(c, t, { size: 13, weight: 600, fillW: true, lh: "130%" });
      T(c, m, { size: 12, color: C.ink3 });
      if (p > 0 && p < 1) progressBar(c, p, { w: 166, h: 4, color: C.amber });
      const stt = row(c, { gap: 6, sizingH: "fill", main: "spaceBetween" });
      const leftSt = row(stt, { gap: 4 });
      if (p === 1) I(leftSt, "check", { size: 12, color: C.green });
      T(leftSt, status, { size: 11, color: p === 1 ? C.green : C.ink2 });
      if (aiCount > 0) {
        const aiTag = row(stt, { gap: 3, pad: [2, 6, 2, 5], r: 99, fill: C.indigoSoft });
        I(aiTag, "sparkles", { size: 10, color: C.indigo });
        T(aiTag, String(aiCount), { size: 10.5, weight: 700, color: C.indigoInk });
      }
    });
    return s;
  }

  /* 03 · Adicionar (modal sobre a biblioteca) */
  function adicionar() {
    const s = biblioteca("adicionar", "03 · Adicionar leitura");
    R(s, { x: 0, y: 0, w: 1440, h: 900, fill: "#1E2230", opacity: 0.42 });
    const m = col(s, { x: 420, y: 96, w: 600, gap: 20, pad: 28, r: 28, fill: C.card, fx: SHADOW_FLOAT, name: "Modal adicionar" });
    const mh = row(m, { sizingH: "fill", main: "spaceBetween" });
    const mht = col(mh, { gap: 4 });
    T(mht, "Adicionar à biblioteca", { serif: true, weight: 600, size: 24 });
    T(mht, "Tudo é processado no seu aparelho. Nada sai daqui sem você pedir.", { size: 13, color: C.ink2 });
    const close = iconButton(mh, "x", { s: 36, fill: C.paper });
    link(close, "biblioteca");

    const tabs = row(m, { gap: 4, pad: 4, r: 14, fill: C.paper, sizingH: "fill" });
    [
      ["upload", "Arquivo", true],
      ["link", "Link da web", false],
      ["clipboard", "Colar texto", false],
    ].forEach(([ic, t, on]) => {
      const tb = row(tabs, {
        gap: 8,
        h: 40,
        sizingV: "fixed",
        sizingH: "fill",
        main: "center",
        r: 10,
        fill: on ? C.card : undefined,
        fx: on ? SHADOW_SOFT : undefined,
      });
      I(tb, ic, { size: 16, color: on ? C.indigo : C.ink2 });
      T(tb, t, { size: 13, weight: 600, color: on ? C.ink : C.ink2 });
    });

    const dz = col(m, {
      gap: 10,
      pad: [30, 24, 30, 24],
      r: 18,
      fill: C.indigoSoft,
      stroke: C.indigoBorder,
      dashes: [7, 6],
      sizingH: "fill",
      cross: "center",
    });
    const dzi = row(dz, { w: 52, h: 52, r: 26, fill: C.card, main: "center" });
    I(dzi, "upload", { size: 22, color: C.indigo });
    T(dz, "Solte seus arquivos aqui", { size: 16, weight: 600, color: C.indigoInk });
    T(dz, "ou clique para escolher · até 200 MB · vários de uma vez", { size: 13, color: C.indigoInk, opacity: 0.75 });

    const up = row(m, { gap: 14, pad: 14, r: 14, stroke: C.line, sizingH: "fill" });
    cover(up, "Relatório 2025", "PDF", { w: 40, h: 52, r: 6, titleSize: 7 });
    const upc = col(up, { gap: 6, sizingH: "fill" });
    const upr = row(upc, { sizingH: "fill", main: "spaceBetween" });
    T(upr, "relatorio-sustentabilidade-2025.pdf", { size: 13, weight: 600 });
    T(upr, "68%", { size: 12, weight: 600, color: C.indigo });
    progressBar(upc, 0.68, { w: 446, h: 5, color: C.indigo });
    T(upc, "Lendo páginas escaneadas com OCR · 33 de 48", { size: 11.5, color: C.ink3 });

    const opts = row(m, { gap: 12, sizingH: "fill" });
    [
      ["volume", C.amberInk, "Voz inicial", "Dora · Kokoro 82M (Offline)"],
      ["sparkles", C.indigo, "Assistente IA", "Gemma 4 E4B (Offline)"],
    ].forEach(([ic, icColor, t, v]) => {
      const o = row(opts, { gap: 10, pad: 12, r: 12, fill: C.paper, sizingH: "fill" });
      I(o, ic, { size: 16, color: icColor });
      const oc = col(o, { gap: 1, sizingH: "fill" });
      T(oc, t, { size: 11.5, color: C.ink3 });
      T(oc, v, { size: 13, weight: 600 });
      I(o, "chevD", { size: 16, color: C.ink3 });
    });

    const foot = row(m, { sizingH: "fill", main: "max" });
    const fb = row(foot, { gap: 10 });
    const cancel = button(fb, "Cancelar", { kind: "ghost", h: 44 });
    const open = button(fb, "Abrir e começar a ouvir", { kind: "accent", icon: "play", solidIcon: true, iconSize: 13, h: 44 });
    link(cancel, "biblioteca");
    link(open, "leitor");
  }

  capa();
  inicio();
  biblioteca("biblioteca", "02 · Biblioteca");
  adicionar();
}
