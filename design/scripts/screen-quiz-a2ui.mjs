// Tela 07: Chat IA — Quiz Interativo via protocolo A2UI (Agent-to-User Interface).

import { C, SHADOW_SOFT } from "./tokens.mjs";
import { createAssistantHelpers } from "./screens-listening-ai.mjs";

export function buildQuizA2uiScreen(ctx) {
  const { screen, link, row, col, T, styleRange, R, E, I, button, iconButton, chip, waveform, inlineVoiceReply } = ctx;
  const { renderReaderColumnForAssistant, renderAssistantHeader } = createAssistantHelpers(ctx);

  const s = screen("chatModos", "07 · Chat IA — Quiz Interativo A2UI", 1440, 900);
  renderReaderColumnForAssistant(s, { mode: "a2uiEvidence" });

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
    name: "Assistente · Superfície A2UI",
  });
  const tabs = renderAssistantHeader(panel, "quiz");
  link(tabs.conversar, "assistente");

  // Barra de protocolo e estado do modelo A2UI
  const a2Bar = row(panel, {
    gap: 8,
    pad: [7, 18, 7, 18],
    sizingH: "fill",
    fill: C.paper,
    main: "spaceBetween",
  });
  const a2Left = row(a2Bar, { gap: 6 });
  I(a2Left, "zap", { size: 12, color: C.indigo });
  T(a2Left, "A2UI Surface · Catálogo nativo", { size: 11.5, weight: 700, color: C.indigoInk });
  const a2Right = row(a2Bar, { gap: 8 });
  T(a2Right, "Sequência: 2", { size: 11, weight: 600, color: C.amberInk });
  T(a2Right, "·", { size: 11, color: C.ink3 });
  T(a2Right, "120 XP", { size: 11, weight: 700, color: C.greenInk });
  T(a2Right, "·", { size: 11, color: C.ink3 });
  T(a2Right, "2 de 3", { size: 11, weight: 600, color: C.ink2 });
  R(panel, { w: 564, h: 1, fill: C.line, sizingH: "fill" });

  // Trilha segmentada de progresso (3 passos)
  const stepTrack = row(panel, { gap: 6, pad: [10, 18, 4, 18], sizingH: "fill" });
  [
    ["✓ Q1 · Defunto autor", C.greenSoft, C.greenInk, null],
    ["● Q2 · Moisés vs. Brás", C.indigoSoft, C.indigoInk, C.indigoBorder],
    ["○ Q3 · Causa e tom", C.paper, C.ink3, C.line],
  ].forEach(([lbl, bg, fg, st]) => {
    const pill = row(stepTrack, {
      h: 26,
      sizingV: "fixed",
      sizingH: "fill",
      main: "center",
      r: 8,
      fill: bg,
      stroke: st ?? undefined,
    });
    T(pill, lbl, { size: 11, weight: 600, color: fg });
  });

  // Área principal com o QuizQuestionCard declarativo A2UI
  const body = col(panel, { gap: 10, pad: [6, 18, 10, 18], sizingH: "fill", sizingV: "fill" });

  const quizCard = col(body, {
    gap: 9,
    pad: 14,
    r: 18,
    fill: C.paper,
    stroke: C.indigoBorder,
    sizingH: "fill",
    name: "A2UI QuizQuestionCard",
  });

  // Cabeçalho do widget: tópico + botão de escuta da pergunta
  const qHead = row(quizCard, { sizingH: "fill", main: "spaceBetween" });
  chip(qHead, "Compreensão & Ironia · ¶2", {
    icon: "sparkles",
    iconColor: C.indigo,
    color: C.indigoInk,
    fill: C.indigoSoft,
    stroke: null,
    size: 11,
    pad: [4, 9, 4, 7],
  });
  const listenQ = row(qHead, {
    gap: 5,
    pad: [4, 10, 4, 8],
    r: 99,
    fill: C.amberSoft,
    stroke: "#E9A23B66",
  });
  I(listenQ, "play", { size: 10, color: C.amberInk, solid: true });
  T(listenQ, "Ouvir pergunta · 0:08", { size: 11, weight: 700, color: C.amberInk });

  // Enunciado
  T(quizCard, "Qual diferença radical Brás Cubas aponta entre o seu livro e o Pentateuco de Moisés?", {
    size: 13.5,
    weight: 600,
    lh: "138%",
    fillW: true,
  });

  // ChoiceGroup A2UI
  const choices = col(quizCard, { gap: 6, sizingH: "fill", name: "A2UI ChoiceGroup" });
  [
    ["A", "Moisés escreveu suas memórias em terceira pessoa.", false],
    ["B", "Moisés pôs a própria morte no fim (no cabo), e não no princípio.", true],
    ["C", "Moisés recusou-se a narrar o próprio nascimento.", false],
  ].forEach(([letter, txt, correct]) => {
    const opt = row(choices, {
      gap: 8,
      pad: [7, 10, 7, 10],
      r: 10,
      fill: correct ? C.greenSoft : C.card,
      stroke: correct ? C.green : C.line,
      sw: correct ? 1.5 : 1,
      sizingH: "fill",
      main: "spaceBetween",
    });
    const left = row(opt, { gap: 8, sizingH: "fill" });
    T(left, `${letter})`, { size: 12, weight: 700, color: correct ? C.greenInk : C.ink3 });
    T(left, txt, { size: 12, weight: correct ? 600 : 400, color: correct ? C.greenInk : C.ink2, fillW: true });
    if (correct) {
      const xpTag = row(opt, { gap: 4, pad: [2, 7, 2, 6], r: 99, fill: C.green });
      I(xpTag, "check", { size: 10, color: C.white });
      T(xpTag, "+60 XP", { size: 10, weight: 700, color: C.white });
    }
  });

  // ConfidenceBar A2UI (metacognição sem digitar)
  const confRow = row(quizCard, { sizingH: "fill", main: "spaceBetween", name: "A2UI ConfidenceBar" });
  T(confRow, "Seu nível de certeza:", { size: 11.5, weight: 600, color: C.ink2 });
  const confPills = row(confRow, { gap: 5 });
  [
    ["Chutei", false],
    ["Com dúvida", false],
    ["✓ Certeza", true],
  ].forEach(([lbl, on]) => {
    chip(confPills, lbl, {
      size: 11,
      fill: on ? C.ink : C.card,
      color: on ? C.paper : C.ink2,
      stroke: on ? null : C.line,
      pad: [4, 9, 4, 9],
    });
  });

  // Sub-superfície ExplanationCard atualizada via dataModelUpdate
  const expCard = col(quizCard, {
    gap: 7,
    pad: 10,
    r: 12,
    fill: C.indigoSoft,
    stroke: C.indigoBorder,
    sizingH: "fill",
    name: "A2UI ExplanationCard",
  });
  const expText =
    "No intróito vs. no cabo: Moisés narra sua morte no encerramento, enquanto Brás Cubas abre a narrativa pelo próprio óbito.";
  const expId = T(expCard, expText, {
    size: 12,
    lh: "144%",
    color: C.indigoInk,
    fillW: true,
  });
  styleRange(expId, expText, "No intróito vs. no cabo:", { fontStyle: "SemiBold" });

  const expActs = row(expCard, { gap: 6, wrap: true, crossGap: 5, sizingH: "fill" });
  inlineVoiceReply(expActs, "0:14", { label: "Ouvir" });
  const evChip = chip(expActs, "Destacar ¶2 no texto", {
    icon: "quote",
    iconColor: C.white,
    color: C.white,
    fill: C.indigo,
    stroke: null,
    size: 11,
    pad: [5, 9, 5, 8],
  });
  link(evChip, "leitor");
  chip(expActs, "Salvar card", {
    icon: "note",
    iconColor: C.indigoInk,
    color: C.indigoInk,
    fill: C.white,
    stroke: null,
    size: 11,
    pad: [5, 9, 5, 8],
  });

  // Controles de userAction do A2UI
  const uaRow = row(quizCard, { sizingH: "fill", main: "spaceBetween", name: "A2UI userActions" });
  const uaLeft = row(uaRow, { gap: 6 });
  chip(uaLeft, "Dica por voz", { icon: "mic", iconColor: C.indigo, size: 11, pad: [5, 9, 5, 7] });
  chip(uaLeft, "Mais difícil", { icon: "sliders", iconColor: C.ink2, size: 11, pad: [5, 9, 5, 7] });
  const nextBtn = button(uaRow, "Próxima (3/3)", {
    kind: "accent",
    iconR: "arrowR",
    h: 34,
    px: 13,
    size: 12,
  });
  link(nextBtn, "assistente");

  // Rodapé híbrido A2UI + Voz/Chat
  const inWrap = col(panel, { pad: [0, 18, 16, 18], sizingH: "fill" });
  const voiceBar = row(inWrap, {
    gap: 8,
    pad: [7, 8, 7, 10],
    r: 18,
    fill: "#F7F6FE",
    stroke: C.indigo,
    sw: 1.5,
    sizingH: "fill",
    main: "spaceBetween",
    name: "Controle híbrido voz e A2UI",
  });
  const vbLeft = row(voiceBar, { gap: 8, sizingH: "fill" });
  const micIcon = iconButton(vbLeft, "mic", { s: 32, size: 15, fill: C.indigo, color: C.white });
  link(micIcon, "assistente");
  E(vbLeft, { w: 6, fill: C.indigo });
  T(vbLeft, "Fale “letra B”, “outra dica” ou digite…", { size: 12.5, color: C.indigoInk });
  const vbRight = row(voiceBar, { gap: 8 });
  waveform(vbRight, { n: 12, progress: 0.6, played: C.indigo, rest: C.indigoBorder, max: 16, barW: 2.5, gap: 2 });
  const send = row(vbRight, { w: 32, h: 32, r: 16, fill: C.indigo, main: "center" });
  I(send, "arrowUp", { size: 15, color: C.white, sw: 2.2 });
}
