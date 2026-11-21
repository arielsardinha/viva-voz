// Gera a jornada repaginada do VivaVoz como script do FigCraft.
//
//   node design/scripts/gerar-jornada.mjs
//   figcraft-cli run design/build/jornada.json --out design/vivavoz-repaginada.figcraft
//   figcraft-cli export design/vivavoz-repaginada.figcraft -o design/jornada --format png
//
// O FigCraft numera as camadas em sequência (a página é 1), então o script
// prevê o id de cada camada criada e usa esses ids para montar a hierarquia
// e as interações do protótipo.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "build", "jornada.json");

/* ───────────────────────── tokens ───────────────────────── */

const C = {
  paper: "#F5F0E6",
  paper2: "#EDE5D6",
  card: "#FFFDF8",
  ink: "#1E2230",
  ink2: "#545A69",
  ink3: "#8A8F9C",
  line: "#E5DDCD",
  line2: "#D9CFBC",
  indigo: "#4B44D6",
  indigoSoft: "#ECEAFE",
  indigoInk: "#2E2A8F",
  amber: "#E9A23B",
  amberSoft: "#FCEFCF",
  amberInk: "#7A4B06",
  green: "#2E8B57",
  greenSoft: "#DDF2E6",
  night: "#11131A",
  nightCard: "#191C25",
  nightLine: "#2A2E3B",
  nightText: "#E8E4DA",
  nightText2: "#9A9FAD",
  white: "#FFFFFF",
};

const FORMAT = {
  PDF: "#B9543D",
  EPUB: "#4B44D6",
  WEB: "#2B7A9B",
  DOCX: "#3D6E4E",
  MD: "#7A5AA8",
  TXT: "#6B6F7B",
};

const SERIF = "Source Serif 4";
const SANS = "Inter";
const SHADOW_SOFT = [{ type: "dropShadow", color: "#1E223012", offset: [0, 4], radius: 18, spread: 0 }];
const SHADOW_FLOAT = [
  { type: "dropShadow", color: "#1E22301A", offset: [0, 18], radius: 48, spread: -6 },
  { type: "dropShadow", color: "#1E22300D", offset: [0, 2], radius: 6, spread: 0 },
];

/* ───────────────────────── núcleo ───────────────────────── */

const steps = [];
const links = [];
const frames = {};
let nextId = 2;
const layoutParents = new Set();

function create(command, params) {
  steps.push({ command, params });
  return nextId++;
}

function clean(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

/** Frame. Com `layout`, vira auto layout e abraça o conteúdo por padrão. */
function F(parent, o = {}) {
  const inLayout = parent !== undefined && layoutParents.has(parent);
  const props = clean({
    fills: o.fill ? undefined : o.fills ?? [],
    fill: o.fill,
    cornerRadius: o.r,
    stroke: o.stroke,
    strokeWeight: o.stroke ? o.sw ?? 1 : undefined,
    strokeAlign: o.stroke ? "inside" : undefined,
    dashes: o.dashes,
    effects: o.fx,
    clip: o.clip,
    opacity: o.opacity,
    layout: o.layout,
    gap: o.gap,
    padding: o.pad,
    mainAlign: o.main,
    crossAlign: o.cross,
    wrap: o.wrap,
    crossGap: o.crossGap,
    sizingH: o.sizingH ?? (o.layout && o.w === undefined ? "hug" : inLayout && o.w !== undefined ? "fixed" : undefined),
    sizingV: o.sizingV ?? (o.layout && o.h === undefined ? "hug" : inLayout && o.h !== undefined ? "fixed" : undefined),
    absolute: o.absolute,
  });
  const id = create(
    "frame.create",
    clean({
      parent,
      x: o.x ?? 0,
      y: o.y ?? 0,
      width: o.w ?? 10,
      height: o.h ?? 10,
      name: o.name,
      props,
    }),
  );
  if (o.layout) layoutParents.add(id);
  return id;
}

const row = (p, o = {}) => F(p, { layout: "horizontal", cross: "center", ...o });
const col = (p, o = {}) => F(p, { layout: "vertical", ...o });

/** Texto. `fillW` estica na largura do pai em auto layout e quebra linhas. */
function T(parent, text, o = {}) {
  const serif = o.serif ?? false;
  const style =
    o.style ??
    (serif
      ? { 400: "Regular", 600: "Semibold", 700: "Bold" }[o.weight ?? 400]
      : { 400: "Regular", 600: "SemiBold", 700: "Bold" }[o.weight ?? 400]);
  const props = clean({
    fontFamily: serif ? SERIF : SANS,
    fontStyle: o.italic ? "Italic" : style,
    fontSize: o.size ?? 14,
    fill: o.color ?? C.ink,
    lineHeight: o.lh,
    letterSpacing: o.ls,
    textAlign: o.align,
    textCase: o.case,
    opacity: o.opacity,
    sizingH: o.fillW ? "fill" : undefined,
    textAutoResize: o.fillW || o.w ? "height" : undefined,
    absolute: o.absolute,
  });
  return create(
    "text.create",
    clean({ text, x: o.x ?? 0, y: o.y ?? 0, parent, width: o.w, name: o.name, props }),
  );
}

function R(parent, o = {}) {
  return create(
    "shape.rectangle",
    clean({
      parent,
      x: o.x ?? 0,
      y: o.y ?? 0,
      width: o.w,
      height: o.h,
      props: clean({
        fill: o.fill,
        fills: o.fills,
        cornerRadius: o.r,
        opacity: o.opacity,
        effects: o.fx,
        stroke: o.stroke,
        strokeWeight: o.stroke ? o.sw ?? 1 : undefined,
        sizingH: o.sizingH,
        sizingV: o.sizingV,
        name: o.name,
      }),
    }),
  );
}

function E(parent, o = {}) {
  return create(
    "shape.ellipse",
    clean({
      parent,
      x: o.x ?? 0,
      y: o.y ?? 0,
      width: o.w,
      height: o.h ?? o.w,
      props: clean({ fill: o.fill, fills: o.fills, stroke: o.stroke, strokeWeight: o.stroke ? o.sw ?? 1 : undefined, opacity: o.opacity, effects: o.fx }),
    }),
  );
}

/* ───────────────────────── ícones (grade 24) ───────────────────────── */

const K = 0.5523;
function circ(cx, cy, r) {
  const k = r * K;
  return `M${cx - r} ${cy} C${cx - r} ${cy - k} ${cx - k} ${cy - r} ${cx} ${cy - r} C${cx + k} ${cy - r} ${cx + r} ${cy - k} ${cx + r} ${cy} C${cx + r} ${cy + k} ${cx + k} ${cy + r} ${cx} ${cy + r} C${cx - k} ${cy + r} ${cx - r} ${cy + k} ${cx - r} ${cy} Z`;
}

const ICONS = {
  sparkles: "M12 3 L13.9 8.6 L19.5 10.5 L13.9 12.4 L12 18 L10.1 12.4 L4.5 10.5 L10.1 8.6 Z M19 15 L19.8 17.2 L22 18 L19.8 18.8 L19 21 L18.2 18.8 L16 18 L18.2 17.2 Z",
  mic: "M9 5 C9 3.3 10.3 2 12 2 C13.7 2 15 3.3 15 5 L15 11 C15 12.7 13.7 14 12 14 C10.3 14 9 12.7 9 11 Z M5 10 L5 11 C5 14.9 8.1 18 12 18 C15.9 18 19 14.9 19 11 L19 10 M12 18 L12 22",
  play: "M7 4 L20 12 L7 20 Z",
  pause: "M7 4 L10 4 L10 20 L7 20 Z M14 4 L17 4 L17 20 L14 20 Z",
  skipBack: "M19 20 L9 12 L19 4 Z M5 19 L5 5",
  skipFwd: "M5 4 L15 12 L5 20 Z M19 5 L19 19",
  back15: "M3 12 C3 7 7 3 12 3 C17 3 21 7 21 12 C21 17 17 21 12 21 C8.5 21 5.5 19 4 16 M3 5 L3 10 L8 10",
  fwd15: "M21 12 C21 7 17 3 12 3 C7 3 3 7 3 12 C3 17 7 21 12 21 C15.5 21 18.5 19 20 16 M21 5 L21 10 L16 10",
  book: "M2 4 L8 4 C10.2 4 12 5.8 12 8 L12 21 C12 19.3 10.7 18 9 18 L2 18 Z M22 4 L16 4 C13.8 4 12 5.8 12 8 L12 21 C12 19.3 13.3 18 15 18 L22 18 Z",
  library: "M4 4 L8 4 L8 20 L4 20 Z M10 4 L14 4 L14 20 L10 20 Z M16.5 5 L20.3 4 L23 19 L19.2 20 Z",
  plus: "M12 5 L12 19 M5 12 L19 12",
  upload: "M12 15 L12 3 M7 8 L12 3 L17 8 M21 15 L21 19 C21 20.1 20.1 21 19 21 L5 21 C3.9 21 3 20.1 3 19 L3 15",
  link: "M10 13 C11.5 15 14.5 15 16 13.5 L19 10.5 C20.6 8.9 20.6 6.4 19 4.9 C17.4 3.3 14.9 3.3 13.4 4.9 L12 6.3 M14 11 C12.5 9 9.5 9 8 10.5 L5 13.5 C3.4 15.1 3.4 17.6 5 19.1 C6.6 20.7 9.1 20.7 10.6 19.1 L12 17.7",
  clipboard: "M9 3 L15 3 L15 6 L9 6 Z M15 4.5 L18 4.5 C19.1 4.5 20 5.4 20 6.5 L20 20 C20 21.1 19.1 22 18 22 L6 22 C4.9 22 4 21.1 4 20 L4 6.5 C4 5.4 4.9 4.5 6 4.5 L9 4.5 M8 12 L16 12 M8 16 L13 16",
  search: `${circ(11, 11, 7)} M21 21 L16 16`,
  x: "M6 6 L18 18 M18 6 L6 18",
  send: "M4 12 L20 4 L14 20 L11 13 Z M11 13 L20 4",
  arrowUp: "M12 19 L12 5 M6 11 L12 5 L18 11",
  settings: `${circ(12, 12, 3)} M12 2 L12 5 M12 19 L12 22 M2 12 L5 12 M19 12 L22 12 M4.9 4.9 L7 7 M17 17 L19.1 19.1 M4.9 19.1 L7 17 M17 7 L19.1 4.9`,
  moon: "M20 14.5 C18.8 15.1 17.4 15.5 16 15.5 C11.3 15.5 7.5 11.7 7.5 7 C7.5 5.6 7.9 4.2 8.5 3 C5.2 4.4 3 7.6 3 11.5 C3 16.7 7.3 21 12.5 21 C16.4 21 19.6 18.8 20 14.5 Z",
  sun: `${circ(12, 12, 4)} M12 2 L12 4 M12 20 L12 22 M2 12 L4 12 M20 12 L22 12 M4.9 4.9 L6.3 6.3 M17.7 17.7 L19.1 19.1 M4.9 19.1 L6.3 17.7 M17.7 6.3 L19.1 4.9`,
  type: "M4 7 L4 4 L20 4 L20 7 M12 4 L12 20 M9 20 L15 20",
  bookmark: "M6 3 L18 3 L18 21 L12 17 L6 21 Z",
  highlighter: "M9 11 L15 5 L19 9 L13 15 Z M9 11 L6 14 L6 17 L9 17 L13 15 M4 21 L20 21",
  list: "M8 6 L21 6 M8 12 L21 12 M8 18 L21 18 M3 6 L3.5 6 M3 12 L3.5 12 M3 18 L3.5 18",
  chevL: "M15 6 L9 12 L15 18",
  chevR: "M9 6 L15 12 L9 18",
  chevD: "M6 9 L12 15 L18 9",
  arrowR: "M5 12 L19 12 M13 6 L19 12 L13 18",
  arrowL: "M19 12 L5 12 M11 6 L5 12 L11 18",
  quote: "M4 11 L9 11 L9 18 L4 18 Z M4 11 C4 7 5.5 5 9 5 M14 11 L19 11 L19 18 L14 18 Z M14 11 C14 7 15.5 5 19 5",
  volume: "M4 9 L8 9 L13 4 L13 20 L8 15 L4 15 Z M16.5 8.5 C18.5 10.5 18.5 13.5 16.5 15.5 M19 6 C22.3 9.3 22.3 14.7 19 18",
  cpu: "M6 6 L18 6 L18 18 L6 18 Z M9.5 9.5 L14.5 9.5 L14.5 14.5 L9.5 14.5 Z M9 2 L9 6 M15 2 L15 6 M9 18 L9 22 M15 18 L15 22 M2 9 L6 9 M2 15 L6 15 M18 9 L22 9 M18 15 L22 15",
  shield: "M12 2 L20 5 L20 11 C20 16 16.5 20 12 22 C7.5 20 4 16 4 11 L4 5 Z M8.5 12 L11 14.5 L15.5 9.5",
  file: "M6 2 L14 2 L20 8 L20 22 L6 22 Z M14 2 L14 8 L20 8 M9 13 L17 13 M9 17 L15 17",
  globe: `${circ(12, 12, 10)} M2 12 L22 12 M12 2 C15 5 15 19 12 22 C9 19 9 5 12 2`,
  check: "M5 12.5 L10 17.5 L19 7",
  focus: "M3 8 L3 3 L8 3 M16 3 L21 3 L21 8 M21 16 L21 21 L16 21 M8 21 L3 21 L3 16",
  copy: "M8 8 L20 8 L20 20 L8 20 Z M16 8 L16 4 L4 4 L4 16 L8 16",
  note: "M4 4 L20 4 L20 15 L15 20 L4 20 Z M15 20 L15 15 L20 15 M8 9 L16 9 M8 13 L12 13",
  history: "M3 12 C3 7 7 3 12 3 C17 3 21 7 21 12 C21 17 17 21 12 21 C8.5 21 5.5 19 4 16 M3 5 L3 10 L8 10 M12 7 L12 12 L15.5 14",
  cloud: "M7 18 C4.2 18 2 15.8 2 13 C2 10.4 4 8.3 6.5 8 C7.4 5.1 10 3 13 3 C16.9 3 20 6.1 20 10 C21.7 10.5 23 12.1 23 14 C23 16.2 21.2 18 19 18 Z",
  heart: "M12 20 C12 20 3 14.5 3 8.5 C3 5.5 5.2 3.5 7.8 3.5 C9.6 3.5 11.2 4.5 12 6 C12.8 4.5 14.4 3.5 16.2 3.5 C18.8 3.5 21 5.5 21 8.5 C21 14.5 12 20 12 20 Z",
  rain: "M7 15 C4.2 15 2 12.8 2 10 C2 7.4 4 5.3 6.5 5 C7.4 2.1 10 1 13 1 C16.9 1 20 4.1 20 8 C21.7 8.5 23 9.6 23 11.5 C23 13.4 21.2 15 19 15 Z M8 18 L7 21 M13 18 L12 21 M18 18 L17 21",
  timer: `${circ(12, 13, 8)} M12 9 L12 13 L14.5 15 M9 2 L15 2`,
  layers: "M12 3 L22 8 L12 13 L2 8 Z M2 13 L12 18 L22 13 M2 17.5 L12 22.5 L22 17.5",
  dots: `${circ(5, 12, 1)} ${circ(12, 12, 1)} ${circ(19, 12, 1)}`,
  menu: "M4 7 L20 7 M4 12 L20 12 M4 17 L20 17",
  wave: "M2 12 L4 12 M6 8 L6 16 M10 5 L10 19 M14 8 L14 16 M18 10 L18 14 M22 12 L20 12",
};

function bbox(path) {
  const nums = path.match(/-?\d*\.?\d+/g).map(Number);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    minX = Math.min(minX, nums[i]);
    maxX = Math.max(maxX, nums[i]);
    minY = Math.min(minY, nums[i + 1]);
    maxY = Math.max(maxY, nums[i + 1]);
  }
  return { minX, minY, w: Math.max(maxX - minX, 0.5), h: Math.max(maxY - minY, 0.5) };
}

/** Ícone de traço numa caixa de `size`×`size` (escala da grade 24). */
function I(parent, name, o = {}) {
  const size = o.size ?? 18;
  const s = size / 24;
  const path = ICONS[name];
  const b = bbox(path);
  // O FigCraft posiciona o vetor em (x + menor x do caminho), então o caminho
  // vai normalizado para a origem e já escalado.
  let k = 0;
  const scaled = path.replace(/-?\d*\.?\d+/g, (n) => {
    const v = (Number(n) - (k++ % 2 === 0 ? b.minX : b.minY)) * s;
    return String(+v.toFixed(3));
  });
  const box = F(parent, { w: size, h: size, name: `ícone/${name}`, x: o.x, y: o.y });
  create("vector.create", {
    path: scaled,
    parent: box,
    x: +(b.minX * s).toFixed(2),
    y: +(b.minY * s).toFixed(2),
    props: clean({
      fills: o.solid ? undefined : [],
      fill: o.solid ? o.color ?? C.ink : undefined,
      stroke: o.solid ? undefined : o.color ?? C.ink,
      strokeWeight: o.solid ? undefined : o.sw ?? 1.75,
      strokeCap: "round",
      strokeJoin: "round",
    }),
  });
  return box;
}

/* ───────────────────────── componentes ───────────────────────── */

function logo(p, o = {}) {
  const r = row(p, { gap: 10, name: "Logo", x: o.x, y: o.y });
  const mark = F(r, { w: 32, h: 32, r: 10, fill: o.dark ? C.nightText : C.ink, layout: "horizontal", main: "center", cross: "center", gap: 2.5 });
  [8, 14, 18, 11, 6].forEach((h, i) => R(mark, { w: 2.5, h, r: 2, fill: i === 2 ? C.amber : o.dark ? C.night : C.paper }));
  T(r, "VivaVoz", { serif: true, weight: 600, size: 20, color: o.dark ? C.nightText : C.ink });
  return r;
}

function button(p, label, o = {}) {
  const kind = o.kind ?? "primary";
  const look = {
    primary: { fill: C.ink, color: C.paper },
    accent: { fill: C.indigo, color: C.white },
    ghost: { fill: undefined, color: C.ink, stroke: C.line2 },
    soft: { fill: C.indigoSoft, color: C.indigoInk },
    night: { fill: C.nightCard, color: C.nightText, stroke: C.nightLine },
  }[kind];
  const h = o.h ?? 44;
  const b = row(p, {
    gap: 8,
    pad: [0, o.px ?? 18, 0, o.px ?? 18],
    h,
    sizingV: "fixed",
    r: o.r ?? h / 2,
    fill: look.fill,
    stroke: look.stroke,
    main: "center",
    name: `Botão/${label || o.icon}`,
    fx: o.fx,
  });
  if (o.icon) I(b, o.icon, { size: o.iconSize ?? 18, color: look.color, solid: o.solidIcon });
  if (label) T(b, label, { size: o.size ?? 14, weight: 600, color: look.color });
  if (o.iconR) I(b, o.iconR, { size: 16, color: look.color });
  return b;
}

function iconButton(p, icon, o = {}) {
  const s = o.s ?? 40;
  const b = row(p, {
    w: s,
    h: s,
    r: o.r ?? s / 2,
    main: "center",
    fill: o.fill,
    stroke: o.stroke,
    name: `Botão ícone/${icon}`,
    fx: o.fx,
  });
  I(b, icon, { size: o.size ?? 18, color: o.color ?? C.ink2, solid: o.solid });
  return b;
}

function chip(p, label, o = {}) {
  const c = row(p, {
    gap: 6,
    pad: [7, 12, 7, o.icon ? 10 : 12],
    r: 999,
    fill: o.fill ?? C.card,
    stroke: o.stroke === null ? undefined : o.stroke ?? C.line,
    name: `Chip/${label}`,
  });
  if (o.dot) E(c, { w: 7, fill: o.dot });
  if (o.icon) I(c, o.icon, { size: 14, color: o.iconColor ?? o.color ?? C.ink2 });
  T(c, label, { size: o.size ?? 13, weight: o.weight ?? 600, color: o.color ?? C.ink2 });
  return c;
}

function waveform(p, o = {}) {
  const w = row(p, { gap: 3, name: "Forma de onda", sizingH: o.fillW ? "fill" : undefined, main: o.fillW ? "spaceBetween" : undefined });
  const n = o.n ?? 48;
  for (let i = 0; i < n; i++) {
    const h = 4 + Math.round(Math.abs(Math.sin(i * 0.9) * 10 + Math.sin(i * 0.37) * 8 + Math.cos(i * 2.1) * 3));
    const played = i / n < (o.progress ?? 0.35);
    R(w, { w: 3, h: Math.min(h, o.max ?? 26), r: 2, fill: played ? o.played ?? C.indigo : o.rest ?? C.line2 });
  }
  return w;
}

function progressBar(p, pct, o = {}) {
  const track = F(p, { w: o.w ?? 200, h: o.h ?? 6, r: 99, fill: o.track ?? C.paper2, name: "Progresso", sizingH: o.fillW ? "fill" : undefined, clip: true });
  R(track, { x: 0, y: 0, w: Math.round((o.w ?? 200) * pct), h: o.h ?? 6, r: 99, fill: o.color ?? C.indigo });
  return track;
}

function cover(p, title, fmt, o = {}) {
  const w = o.w ?? 132;
  const h = o.h ?? 176;
  const c = F(p, { w, h, r: o.r ?? 10, fill: FORMAT[fmt], clip: true, name: `Capa/${title}`, fx: o.fx });
  R(c, { x: 0, y: 0, w: 6, h, fill: "#00000022" });
  R(c, { x: w - 46, y: -30, w: 90, h: 90, r: 45, fill: "#FFFFFF14" });
  if (w < 60) return c;
  T(c, title, { x: 16, y: 18, w: w - 30, serif: true, weight: 600, size: o.titleSize ?? 15, color: "#FFF8EC", lh: "118%" });
  T(c, fmt, { x: 16, y: h - 28, size: 10, weight: 700, ls: "8%", color: "#FFF8ECAA" });
  return c;
}

function link(id, dest) {
  links.push([id, dest]);
}

/* ───────────────────────── conteúdo ───────────────────────── */

const DOC = {
  title: "Memórias Póstumas de Brás Cubas",
  author: "Machado de Assis",
  chapter: "Capítulo I",
  chapterTitle: "Óbito do autor",
  p1a: "Algum tempo hesitei se devia abrir estas memórias pelo princípio ou pelo fim, isto é, se poria em primeiro lugar o meu nascimento ou a minha morte.",
  p1b: "Suposto o uso vulgar seja começar pelo nascimento, duas considerações me levaram a adotar diferente método:",
  p1c: "a primeira é que eu não sou propriamente um autor defunto, mas um defunto autor, para quem a campa foi outro berço;",
  p1d: "a segunda é que o escrito ficaria assim mais galante e mais novo.",
  p2: "Moisés, que também contou a sua morte, não a pôs no intróito, mas no cabo: diferença radical entre este livro e o Pentateuco.",
  p3: "Dito isto, expirei às duas horas da tarde de uma sexta-feira do mês de agosto de 1869, na minha bela chácara de Catumbi. Tinha uns sessenta e quatro anos, rijos e prósperos, era solteiro, possuía cerca de trezentos contos e fui acompanhado ao cemitério por onze amigos.",
  p4: "Onze amigos! Verdade é que não houve cartas nem anúncios. Acresce que chovia — peneirava — uma chuvinha miúda, triste e constante, tão constante e tão triste, que levou um daqueles fiéis da última hora a intercalar esta engenhosa ideia no discurso que proferiu à beira de minha cova.",
};

const CHAPTERS = [
  ["I", "Óbito do autor"],
  ["II", "O emplasto"],
  ["III", "Genealogia"],
  ["IV", "A ideia fixa"],
  ["V", "Em que aparece a orelha de uma senhora"],
  ["VI", "Chimène, qui l'eût dit?"],
  ["VII", "O delírio"],
  ["VIII", "Razão contra sandice"],
];

const SHELF = [
  ["Memórias Póstumas de Brás Cubas", "EPUB", "Machado de Assis", 0.34, "Cap. I · 2h10 restantes"],
  ["Relatório Anual de Sustentabilidade 2025", "PDF", "48 páginas", 0.72, "Pág. 35 de 48"],
  ["Como o cérebro consolida memórias", "WEB", "nexojornal.com.br", 0.1, "12 min de áudio"],
  ["Anotações · Biologia celular", "DOCX", "Aula 07", 1, "Concluído"],
  ["Dom Casmurro", "PDF", "Machado de Assis", 0, "Novo · 6h40 de áudio"],
  ["Guia de estudo: Atenção é tudo que você precisa", "MD", "Resumo do paper", 0.55, "Seção 3 de 6"],
];

/* ───────────────────────── telas ───────────────────────── */

let cursorX = 0;
function screen(key, name, w, h, o = {}) {
  const id = F(undefined, { x: cursorX, y: 0, w, h, fill: o.fill ?? C.paper, clip: true, name });
  frames[key] = id;
  cursorX += w + 160;
  return id;
}

function topNav(p, o = {}) {
  const bar = row(p, { x: 0, y: 0, w: o.w ?? 1440, h: 72, sizingV: "fixed", pad: [0, 48, 0, 48], main: "spaceBetween", name: "Navegação" });
  logo(bar);
  const links_ = row(bar, { gap: 32 });
  ["Como funciona", "Recursos", "Privacidade", "Apoiar o projeto"].forEach((l) => T(links_, l, { size: 14, color: C.ink2, weight: 400 }));
  const cta = button(bar, "Abrir minha biblioteca", { kind: "primary", h: 40, iconR: "arrowR" });
  return { bar, cta };
}

/* 00 · Capa da jornada */
function capa() {
  const s = screen("capa", "00 · Capa da jornada", 1440, 900, { fill: C.ink });
  logo(s, { x: 72, y: 64, dark: true });
  T(s, "REPAGINAÇÃO · NOV 2026", { x: 72, y: 168, size: 12, weight: 700, ls: "14%", color: C.amber });
  T(s, "Ler, ouvir e conversar\ncom o texto — sem atrito.", { x: 72, y: 196, w: 760, serif: true, weight: 600, size: 56, lh: "112%", color: C.paper });
  T(s, "Uma proposta de UI que coloca a leitura no centro, usa a voz para guiar o olhar e traz um assistente de IA que sempre mostra de onde tirou cada resposta.", { x: 72, y: 352, w: 620, size: 18, lh: "155%", color: C.nightText2 });

  const princ = row(s, { x: 72, y: 470, gap: 16, name: "Princípios" });
  [
    ["book", "Leitura primeiro", "Coluna de 68 caracteres, serifa confortável e zero ruído em volta do texto."],
    ["wave", "A voz guia o olhar", "A frase narrada ganha um marcador âmbar e a página rola sozinha."],
    ["quote", "IA com fontes", "Cada resposta cita o trecho exato e leva você até ele com um toque."],
    ["shield", "Privado por padrão", "Arquivos e modelos de IA ficam no seu dispositivo, funcionando offline."],
  ].forEach(([icon, t, d]) => {
    const c = col(princ, { w: 302, gap: 10, pad: 22, r: 18, fill: C.nightCard, stroke: C.nightLine });
    const ic = row(c, { w: 36, h: 36, r: 10, fill: "#E9A23B22", main: "center" });
    I(ic, icon, { size: 18, color: C.amber });
    T(c, t, { size: 16, weight: 600, color: C.paper });
    T(c, d, { size: 13, lh: "150%", color: C.nightText2, fillW: true });
  });

  T(s, "A JORNADA", { x: 72, y: 690, size: 12, weight: 700, ls: "14%", color: C.nightText2 });
  const j = row(s, { x: 72, y: 718, gap: 10, name: "Mapa da jornada" });
  const stepsList = [
    ["01", "Início", "inicio"],
    ["02", "Biblioteca", "biblioteca"],
    ["03", "Adicionar", "adicionar"],
    ["04", "Leitor", "leitor"],
    ["05", "Assistente", "assistente"],
    ["06", "Modo foco", "foco"],
    ["07", "Celular", "mobileLeitor"],
  ];
  stepsList.forEach(([n, t, key], i) => {
    const c = row(j, { gap: 10, pad: [12, 16, 12, 12], r: 14, fill: i === 0 ? C.amber : C.nightCard, stroke: i === 0 ? undefined : C.nightLine, name: `Etapa ${n}` });
    T(c, n, { size: 12, weight: 700, color: i === 0 ? C.ink : C.amber });
    T(c, t, { size: 14, weight: 600, color: i === 0 ? C.ink : C.paper });
    link(c, key);
    if (i < stepsList.length - 1) I(j, "arrowR", { size: 16, color: C.nightText2 });
  });
  T(s, "Dica: aperte Shift+Espaço no FigCraft para navegar pelo protótipo. Clique nas etapas acima para pular direto.", { x: 72, y: 800, size: 13, color: C.nightText2 });

  // composição decorativa à direita
  const art = F(s, { x: 900, y: 64, w: 468, h: 380, r: 28, fill: C.paper, clip: true, name: "Arte" });
  R(art, { x: 40, y: 48, w: 220, h: 12, r: 6, fill: C.line2 });
  R(art, { x: 40, y: 76, w: 380, h: 8, r: 4, fill: C.line });
  R(art, { x: 40, y: 96, w: 350, h: 8, r: 4, fill: C.line });
  R(art, { x: 32, y: 116, w: 404, h: 64, r: 12, fill: C.amberSoft });
  R(art, { x: 32, y: 116, w: 4, h: 64, r: 2, fill: C.amber });
  R(art, { x: 48, y: 134, w: 360, h: 8, r: 4, fill: "#D9B46A" });
  R(art, { x: 48, y: 154, w: 280, h: 8, r: 4, fill: "#D9B46A" });
  R(art, { x: 40, y: 204, w: 370, h: 8, r: 4, fill: C.line });
  R(art, { x: 40, y: 224, w: 330, h: 8, r: 4, fill: C.line });
  const bub = F(art, { x: 180, y: 252, w: 260, h: 84, r: 18, fill: C.indigo, fx: SHADOW_FLOAT });
  I(bub, "sparkles", { x: 16, y: 16, size: 18, color: C.white });
  R(bub, { x: 44, y: 22, w: 180, h: 7, r: 4, fill: "#FFFFFF88" });
  R(bub, { x: 44, y: 38, w: 150, h: 7, r: 4, fill: "#FFFFFF66" });
  const qc = row(bub, { x: 44, y: 54, gap: 4, pad: [4, 8, 4, 8], r: 99, fill: "#FFFFFF26" });
  I(qc, "quote", { size: 10, color: C.white });
  T(qc, "¶1", { size: 10, weight: 700, color: C.white });
  const pl = F(s, { x: 960, y: 470, w: 408, h: 72, r: 36, fill: C.nightCard, stroke: C.nightLine, name: "Player decorativo" });
  const pb = row(pl, { x: 12, y: 12, w: 48, h: 48, r: 24, fill: C.amber, main: "center" });
  I(pb, "pause", { size: 18, color: C.ink, solid: true });
  const wv = waveform(pl, { n: 40, progress: 0.4, played: C.amber, rest: C.nightLine, max: 24 });
  steps.push({ command: "node.set", params: { ids: [wv], x: 76, y: 24 } });
}

/* 01 · Início */
function inicio() {
  const s = screen("inicio", "01 · Início", 1440, 1180);
  R(s, { x: 820, y: -120, w: 760, h: 760, r: 380, fill: C.paper2, opacity: 0.8 });
  const { cta } = topNav(s);
  link(cta, "biblioteca");

  const eyebrow = chip(s, "Leitor com voz e IA · direto no navegador", { icon: "sparkles", iconColor: C.indigo, color: C.indigoInk, fill: C.indigoSoft, stroke: null });
  steps.push({ command: "node.set", params: { ids: [eyebrow], x: 72, y: 148 } });
  T(s, "Ouça qualquer texto.\nConverse com ele.", { x: 72, y: 196, w: 640, serif: true, weight: 600, size: 64, lh: "106%", color: C.ink });
  T(s, "Solte um PDF, livro ou artigo e ouça com vozes naturais em português, acompanhando a frase lida. Ficou com dúvida? Pergunte — a IA responde citando o trecho.", { x: 72, y: 352, w: 540, size: 18, lh: "155%", color: C.ink2 });
  const ctas = row(s, { x: 72, y: 470, gap: 12 });
  const c1 = button(ctas, "Começar a ouvir — é grátis", { kind: "accent", h: 52, px: 24, icon: "play", solidIcon: true, iconSize: 14, size: 15 });
  button(ctas, "Ver em 40 segundos", { kind: "ghost", h: 52, px: 22, size: 15 });
  link(c1, "biblioteca");
  const trust = row(s, { x: 72, y: 548, gap: 20 });
  [
    ["check", "Sem cadastro"],
    ["cloud", "Funciona offline"],
    ["shield", "Arquivos ficam no seu aparelho"],
  ].forEach(([ic, t]) => {
    const r = row(trust, { gap: 6 });
    I(r, ic, { size: 15, color: C.green });
    T(r, t, { size: 13, color: C.ink2 });
  });

  // mock do produto
  const mock = F(s, { x: 700, y: 136, w: 668, h: 500, r: 24, fill: C.card, stroke: C.line, fx: SHADOW_FLOAT, clip: true, name: "Mock do produto" });
  const mtop = row(mock, { x: 0, y: 0, w: 668, h: 52, sizingV: "fixed", pad: [0, 20, 0, 20], main: "spaceBetween" });
  const mt = row(mtop, { gap: 8 });
  I(mt, "book", { size: 16, color: C.ink2 });
  T(mt, "Brás Cubas · Cap. I", { size: 13, weight: 600 });
  chip(mtop, "Assistente", { icon: "sparkles", iconColor: C.white, color: C.white, fill: C.indigo, stroke: null, size: 12 });
  R(mock, { x: 0, y: 52, w: 668, h: 1, fill: C.line });
  const mcol = col(mock, { x: 32, y: 76, w: 360, gap: 12 });
  T(mcol, "Óbito do autor", { serif: true, weight: 600, size: 24, fillW: true });
  T(mcol, DOC.p1a, { serif: true, size: 14, lh: "165%", color: C.ink2, fillW: true });
  currentSentence(mcol, DOC.p1c, { size: 14 });
  T(mcol, DOC.p1d, { serif: true, size: 14, lh: "165%", color: C.ink2, fillW: true });
  const mchat = col(mock, { x: 412, y: 72, w: 236, gap: 10 });
  const mq = row(mchat, { pad: [10, 12, 10, 12], r: 14, fill: C.paper, sizingH: "fill" });
  T(mq, "Por que “defunto autor”?", { size: 12.5, fillW: true });
  const ma = col(mchat, { pad: 12, gap: 8, r: 14, fill: C.indigoSoft, sizingH: "fill" });
  T(ma, "Ele inverte a expressão: não é um escritor que morreu, é um morto que resolveu escrever — daí o tom livre e irônico.", { size: 12.5, lh: "150%", color: C.indigoInk, fillW: true });
  chip(ma, "¶1 · “um defunto autor”", { icon: "quote", iconColor: C.indigo, color: C.indigo, fill: C.white, stroke: null, size: 11 });
  const mdock = row(mock, { x: 32, y: 420, w: 604, h: 56, sizingV: "fixed", pad: [0, 16, 0, 8], gap: 14, r: 28, fill: C.ink });
  const mpb = row(mdock, { w: 40, h: 40, r: 20, fill: C.amber, main: "center" });
  I(mpb, "pause", { size: 14, color: C.ink, solid: true });
  waveform(mdock, { n: 52, progress: 0.38, played: C.amber, rest: "#FFFFFF33", max: 22, fillW: true });
  T(mdock, "04:12", { size: 12, weight: 600, color: C.paper });

  // como funciona
  T(s, "COMO FUNCIONA", { x: 72, y: 720, size: 12, weight: 700, ls: "14%", color: C.indigo });
  T(s, "Do arquivo à conversa em três passos", { x: 72, y: 746, serif: true, weight: 600, size: 36, color: C.ink });
  const how = row(s, { x: 72, y: 820, gap: 20, cross: "min" });
  [
    ["upload", "1. Solte o arquivo", "PDF, EPUB, DOCX, ODT, PPTX, TXT, Markdown ou o link de um artigo. Texto em imagem? A gente lê com OCR."],
    ["wave", "2. Ouça acompanhando", "Vozes naturais em PT-BR, a frase lida destacada e velocidade de 0,5× a 3×. Retome de onde parou."],
    ["sparkles", "3. Pergunte à IA", "Resumos, explicações e perguntas de revisão — sempre com o trecho de origem a um toque de distância."],
  ].forEach(([ic, t, d]) => {
    const c = col(how, { w: 418, gap: 12, pad: 28, r: 20, fill: C.card, stroke: C.line });
    const icb = row(c, { w: 44, h: 44, r: 12, fill: C.indigoSoft, main: "center" });
    I(icb, ic, { size: 20, color: C.indigo });
    T(c, t, { size: 18, weight: 600 });
    T(c, d, { size: 14, lh: "155%", color: C.ink2, fillW: true });
  });
  const fmts = row(s, { x: 72, y: 1060, gap: 8 });
  T(fmts, "Formatos:", { size: 13, color: C.ink3 });
  ["PDF", "EPUB", "DOCX", "ODT", "PPTX", "TXT", "MD", "Link da web", "Texto colado"].forEach((f) => chip(fmts, f, { size: 12 }));
}

/* 02 · Biblioteca (reutilizada como fundo do 03) */
function biblioteca(key, name) {
  const s = screen(key, name, 1440, 900);
  // barra lateral
  const side = col(s, { x: 0, y: 0, w: 248, h: 900, sizingV: "fixed", pad: [28, 20, 28, 20], gap: 4, fill: C.paper2, name: "Barra lateral" });
  logo(side);
  F(side, { w: 10, h: 24 });
  const nav = [
    ["library", "Biblioteca", true],
    ["highlighter", "Destaques e notas", false],
    ["cpu", "Modelos de IA", false],
    ["settings", "Preferências", false],
    ["heart", "Apoiar o projeto", false],
  ];
  nav.forEach(([ic, t, on]) => {
    const r = row(side, { gap: 12, pad: [10, 12, 10, 12], r: 10, fill: on ? C.card : undefined, sizingH: "fill", fx: on ? SHADOW_SOFT : undefined });
    I(r, ic, { size: 18, color: on ? C.indigo : C.ink2 });
    T(r, t, { size: 14, weight: on ? 600 : 400, color: on ? C.ink : C.ink2 });
  });
  F(side, { w: 10, h: 10, sizingV: "fill" });
  const st = col(side, { gap: 10, pad: 16, r: 14, fill: C.card, stroke: C.line, sizingH: "fill" });
  const st1 = row(st, { gap: 8 });
  I(st1, "cloud", { size: 16, color: C.green });
  T(st1, "Sincronizado com o Drive", { size: 12, weight: 600 });
  T(st, "1,2 GB de 4 GB no aparelho", { size: 12, color: C.ink2 });
  progressBar(st, 0.3, { w: 176, color: C.green });

  // conteúdo
  const head = row(s, { x: 296, y: 32, w: 1096, main: "spaceBetween" });
  const hl = col(head, { gap: 4 });
  T(hl, "Boa noite 👋", { size: 14, color: C.ink2 });
  T(hl, "Sua biblioteca", { serif: true, weight: 600, size: 34 });
  const hr = row(head, { gap: 10 });
  const search = row(hr, { w: 320, h: 44, sizingV: "fixed", pad: [0, 14, 0, 14], gap: 10, r: 22, fill: C.card, stroke: C.line });
  I(search, "search", { size: 16, color: C.ink3 });
  T(search, "Buscar leituras, trechos, notas…", { size: 13, color: C.ink3 });
  const addBtn = button(hr, "Adicionar", { kind: "primary", icon: "plus", h: 44 });
  link(addBtn, "adicionar");

  // continuar ouvindo
  const cont = row(s, { x: 296, y: 128, w: 700, h: 256, sizingV: "fixed", pad: 24, gap: 24, r: 24, fill: C.ink, name: "Continuar ouvindo", fx: SHADOW_FLOAT });
  cover(cont, "Memórias Póstumas de Brás Cubas", "EPUB", { w: 140, h: 188, titleSize: 16 });
  const cc = col(cont, { gap: 10, sizingH: "fill" });
  T(cc, "CONTINUAR OUVINDO", { size: 11, weight: 700, ls: "14%", color: C.amber });
  T(cc, DOC.title, { serif: true, weight: 600, size: 24, color: C.paper, fillW: true, lh: "120%" });
  T(cc, "Machado de Assis · Capítulo I — Óbito do autor", { size: 13, color: C.nightText2 });
  F(cc, { w: 10, h: 8 });
  const pr = row(cc, { gap: 12, sizingH: "fill" });
  progressBar(pr, 0.34, { w: 300, color: C.amber, track: "#FFFFFF22" });
  T(pr, "34% · faltam 2h10", { size: 12, color: C.nightText2 });
  const ca = row(cc, { gap: 10 });
  const play = button(ca, "Continuar de onde parei", { kind: "accent", icon: "play", solidIcon: true, iconSize: 13, h: 44 });
  button(ca, "", { kind: "night", icon: "sparkles", h: 44, px: 14 });
  link(play, "leitor");
  link(cont, "leitor");

  // adicionar
  const add = col(s, { x: 1016, y: 128, w: 376, h: 256, sizingV: "fixed", pad: 22, gap: 8, r: 24, fill: C.card, stroke: C.line2, dashes: [6, 5], name: "Adicionar leitura" });
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

  // estante
  const sh = row(s, { x: 296, y: 420, w: 1096, main: "spaceBetween" });
  T(sh, "Estante", { serif: true, weight: 600, size: 22 });
  const filters = row(sh, { gap: 8 });
  ["Tudo", "Ouvindo", "Livros", "PDFs", "Artigos", "Concluídos"].forEach((f, i) =>
    chip(filters, f, { fill: i === 0 ? C.ink : C.card, color: i === 0 ? C.paper : C.ink2, stroke: i === 0 ? null : C.line, size: 12.5 }),
  );
  const grid = row(s, { x: 296, y: 468, w: 1096, gap: 20, cross: "min", name: "Estante" });
  SHELF.forEach(([t, f, m, p, status]) => {
    const c = col(grid, { w: 166, gap: 8 });
    cover(c, t, f, { w: 166, h: 220, fx: SHADOW_SOFT });
    T(c, t, { size: 13, weight: 600, fillW: true, lh: "130%" });
    T(c, m, { size: 12, color: C.ink3 });
    if (p > 0 && p < 1) progressBar(c, p, { w: 166, h: 4 });
    const stt = row(c, { gap: 5 });
    if (p === 1) I(stt, "check", { size: 13, color: C.green });
    T(stt, status, { size: 11.5, color: p === 1 ? C.green : C.ink2 });
  });
  return s;
}

/* 03 · Adicionar (modal sobre a biblioteca) */
function adicionar() {
  const s = biblioteca("adicionar", "03 · Adicionar leitura");
  R(s, { x: 0, y: 0, w: 1440, h: 900, fill: "#1E2230", opacity: 0.42 });
  const m = col(s, { x: 420, y: 110, w: 600, gap: 20, pad: 28, r: 28, fill: C.card, fx: SHADOW_FLOAT, name: "Modal adicionar" });
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
    const tb = row(tabs, { gap: 8, h: 40, sizingV: "fixed", sizingH: "fill", main: "center", r: 10, fill: on ? C.card : undefined, fx: on ? SHADOW_SOFT : undefined });
    I(tb, ic, { size: 16, color: on ? C.indigo : C.ink2 });
    T(tb, t, { size: 13, weight: 600, color: on ? C.ink : C.ink2 });
  });
  const dz = col(m, { gap: 10, pad: [32, 24, 32, 24], r: 18, fill: C.indigoSoft, stroke: "#B9B4F5", dashes: [7, 6], sizingH: "fill", cross: "center" });
  const dzi = row(dz, { w: 52, h: 52, r: 26, fill: C.card, main: "center" });
  I(dzi, "upload", { size: 22, color: C.indigo });
  T(dz, "Solte seus arquivos aqui", { size: 16, weight: 600, color: C.indigoInk });
  T(dz, "ou clique para escolher · até 200 MB · vários de uma vez", { size: 13, color: C.indigoInk, opacity: 0.75 });
  // arquivo em processamento
  const up = row(m, { gap: 14, pad: 14, r: 14, stroke: C.line, sizingH: "fill" });
  cover(up, "Relatório 2025", "PDF", { w: 40, h: 52, r: 6, titleSize: 7 });
  const upc = col(up, { gap: 6, sizingH: "fill" });
  const upr = row(upc, { sizingH: "fill", main: "spaceBetween" });
  T(upr, "relatorio-sustentabilidade-2025.pdf", { size: 13, weight: 600 });
  T(upr, "68%", { size: 12, weight: 600, color: C.indigo });
  progressBar(upc, 0.68, { w: 446, h: 5 });
  T(upc, "Lendo páginas escaneadas com OCR · 33 de 48", { size: 11.5, color: C.ink3 });
  // opções
  const opts = row(m, { gap: 12, sizingH: "fill" });
  [
    ["volume", "Voz", "Faber · PT-BR"],
    ["sparkles", "Assistente", "IA local (Gemma)"],
  ].forEach(([ic, t, v]) => {
    const o = row(opts, { gap: 10, pad: 12, r: 12, fill: C.paper, sizingH: "fill" });
    I(o, ic, { size: 16, color: C.ink2 });
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

/* barra do leitor */
function readerTop(s, o = {}) {
  const bar = row(s, { x: 0, y: 0, w: 1440, h: 68, sizingV: "fixed", pad: [0, 24, 0, 20], main: "spaceBetween", name: "Barra do leitor" });
  const l = row(bar, { gap: 12 });
  const back = iconButton(l, "arrowL", { s: 40, stroke: C.line });
  link(back, "biblioteca");
  const lt = col(l, { gap: 1 });
  T(lt, DOC.title, { size: 14, weight: 600 });
  T(lt, `${DOC.author} · ${DOC.chapter} — ${DOC.chapterTitle}`, { size: 12, color: C.ink3 });
  const mid = row(bar, { gap: 10 });
  progressBar(mid, 0.34, { w: 160, h: 4 });
  T(mid, "34% · 2h10 restantes", { size: 12, color: C.ink2 });
  const r = row(bar, { gap: 8 });
  const seg = row(r, { gap: 2, pad: 3, r: 22, fill: C.paper2 });
  iconButton(seg, "type", { s: 36, fill: C.card, color: C.ink });
  iconButton(seg, "sun", { s: 36 });
  const focus = iconButton(seg, "focus", { s: 36 });
  link(focus, "foco");
  iconButton(r, "bookmark", { s: 40, stroke: C.line });
  const ai = button(r, o.aiOpen ? "Assistente aberto" : "Perguntar à IA", {
    kind: o.aiOpen ? "soft" : "accent",
    icon: "sparkles",
    h: 42,
  });
  link(ai, o.aiOpen ? "leitor" : "assistente");
  return bar;
}

function paragraph(p, text, o = {}) {
  return T(p, text, { serif: true, size: o.size ?? 20, lh: "172%", color: o.color ?? C.ink, fillW: true, opacity: o.opacity });
}

/** Bloco com fundo suave e borda só à esquerda (frase em leitura, trecho citado). */
function marked(p, o = {}) {
  const h = col(p, { pad: o.pad ?? [10, 16, 10, 18], fill: o.fill, sizingH: "fill", name: o.name });
  steps.push({ command: "node.set", params: { ids: [h], stroke: o.bar } });
  steps.push({ command: "node.set", params: { ids: [h], strokeTopWeight: 0, strokeRightWeight: 0, strokeBottomWeight: 0, strokeLeftWeight: 3 } });
  return h;
}

function currentSentence(p, text, o = {}) {
  const h = marked(p, { fill: o.fill ?? C.amberSoft, bar: o.bar ?? C.amber, name: o.name ?? "Frase em leitura" });
  T(h, text, { serif: true, size: o.size ?? 20, lh: "172%", color: o.color ?? C.ink, fillW: true });
  return h;
}

function dock(p, x, y, w, o = {}) {
  const d = row(p, { x, y, w, h: 76, sizingV: "fixed", pad: [0, 20, 0, 12], gap: 14, r: 38, fill: C.card, stroke: C.line, fx: SHADOW_FLOAT, name: "Player" });
  cover(d, "Brás Cubas", "EPUB", { w: 44, h: 54, r: 6, titleSize: 7 });
  const meta = col(d, { gap: 2, w: o.compact ? 110 : 150 });
  T(meta, "Óbito do autor", { size: 13, weight: 600 });
  const v = row(meta, { gap: 4 });
  T(v, "Voz Faber · PT-BR", { size: 11.5, color: C.ink3 });
  I(v, "chevD", { size: 12, color: C.ink3 });
  const ctr = row(d, { gap: 6 });
  iconButton(ctr, "back15", { s: 36, size: 18 });
  const pb = row(ctr, { w: 48, h: 48, r: 24, fill: C.ink, main: "center" });
  I(pb, "pause", { size: 16, color: C.paper, solid: true });
  iconButton(ctr, "fwd15", { s: 36, size: 18 });
  waveform(d, { n: o.compact ? 26 : 40, progress: 0.38, max: 24, fillW: true });
  T(d, "04:12 / 18:40", { size: 12, weight: 600, color: C.ink2 });
  chip(d, "1,2×", { size: 12, fill: C.paper, stroke: null, color: C.ink });
  if (!o.compact) iconButton(d, "timer", { s: 36, size: 18 });
  return d;
}

/* 04 · Leitor */
function leitor() {
  const s = screen("leitor", "04 · Leitor — modo leitura", 1440, 900);
  readerTop(s);
  // sumário
  const toc = col(s, { x: 20, y: 92, w: 236, gap: 2, name: "Sumário" });
  const th = row(toc, { gap: 8, pad: [0, 12, 10, 12] });
  I(th, "list", { size: 16, color: C.ink3 });
  T(th, "SUMÁRIO", { size: 11, weight: 700, ls: "12%", color: C.ink3 });
  CHAPTERS.forEach(([n, t], i) => {
    const r = row(toc, { gap: 10, pad: [9, 12, 9, 12], r: 10, fill: i === 0 ? C.card : undefined, sizingH: "fill", cross: "min", fx: i === 0 ? SHADOW_SOFT : undefined });
    T(r, n, { size: 12, weight: 700, color: i === 0 ? C.indigo : C.ink3, w: 24 });
    T(r, t, { size: 13, weight: i === 0 ? 600 : 400, color: i === 0 ? C.ink : C.ink2, fillW: true, lh: "135%" });
  });
  F(toc, { w: 10, h: 14 });
  const mk = row(toc, { gap: 8, pad: [0, 12, 0, 12] });
  chip(mk, "3 destaques", { icon: "highlighter", size: 12, iconColor: C.amber });
  chip(mk, "2 notas", { icon: "note", size: 12 });

  // página
  const page = F(s, { x: 288, y: 84, w: 864, h: 816, r: [24, 24, 0, 0], fill: C.card, stroke: C.line, clip: true, name: "Página" });
  const c = col(page, { x: 104, y: 64, w: 656, gap: 22, name: "Coluna de leitura" });
  T(c, "CAPÍTULO I", { size: 12, weight: 700, ls: "16%", color: C.indigo });
  T(c, DOC.chapterTitle, { serif: true, weight: 600, size: 44, lh: "112%" });
  const meta = row(c, { gap: 14 });
  chip(meta, "≈ 6 min", { icon: "timer", size: 12, fill: C.paper, stroke: null });
  chip(meta, "Ouvindo agora", { dot: C.amber, size: 12, fill: C.amberSoft, stroke: null, color: C.amberInk });
  F(c, { w: 10, h: 2 });
  paragraph(c, `${DOC.p1a} ${DOC.p1b}`, { color: C.ink2 });
  currentSentence(c, DOC.p1c);
  paragraph(c, `${DOC.p1d} ${DOC.p2}`);
  paragraph(c, DOC.p3);
  paragraph(c, DOC.p4);
  R(page, { x: 0, y: 600, w: 864, h: 216, fills: [{ type: "linearGradient", stops: ["#FFFDF800", "#FFFDF8"] }] });

  // margem direita
  const mg = col(s, { x: 1176, y: 300, w: 244, gap: 12, name: "Margem" });
  const n1 = col(mg, { gap: 6, pad: 14, r: 14, fill: C.card, stroke: C.line, sizingH: "fill" });
  const n1h = row(n1, { gap: 6 });
  I(n1h, "note", { size: 14, color: C.amber });
  T(n1h, "Sua nota · ¶1", { size: 11.5, weight: 600, color: C.ink2 });
  T(n1, "Ironia logo na primeira frase — narrador morto e sem filtro.", { size: 13, lh: "145%", fillW: true });
  const ask = col(mg, { gap: 10, pad: 14, r: 14, fill: C.indigoSoft, sizingH: "fill" });
  const askh = row(ask, { gap: 6 });
  I(askh, "sparkles", { size: 14, color: C.indigo });
  T(askh, "Ficou com dúvida?", { size: 12, weight: 600, color: C.indigoInk });
  T(ask, "Selecione um trecho ou pergunte sobre a frase em leitura.", { size: 12.5, lh: "145%", color: C.indigoInk, fillW: true });
  const askb = chip(ask, "Explicar esta frase", { icon: "arrowR", iconColor: C.indigo, color: C.indigo, fill: C.white, stroke: null, size: 12 });
  link(askb, "assistente");

  dock(s, 300, 800, 840);
}

/* 05 · Leitor + Assistente */
function assistente() {
  const s = screen("assistente", "05 · Leitor + Assistente de IA", 1440, 900);
  readerTop(s, { aiOpen: true });
  // trilho recolhido
  const rail = col(s, { x: 16, y: 92, w: 48, gap: 8, cross: "center" });
  iconButton(rail, "list", { s: 40, fill: C.card, stroke: C.line });
  iconButton(rail, "highlighter", { s: 40 });
  iconButton(rail, "note", { s: 40 });

  const page = F(s, { x: 80, y: 84, w: 768, h: 816, r: [24, 24, 0, 0], fill: C.card, stroke: C.line, clip: true, name: "Página" });
  const c = col(page, { x: 72, y: 56, w: 624, gap: 20 });
  T(c, "CAPÍTULO I", { size: 12, weight: 700, ls: "16%", color: C.indigo });
  T(c, DOC.chapterTitle, { serif: true, weight: 600, size: 40, lh: "112%" });
  F(c, { w: 10, h: 2 });
  paragraph(c, DOC.p1a, { size: 19, color: C.ink2 });
  currentSentence(c, `${DOC.p1b} ${DOC.p1c}`, { size: 19, fill: C.indigoSoft, bar: C.indigo, name: "Trecho selecionado" });
  paragraph(c, DOC.p1d, { size: 19 });
  paragraph(c, DOC.p2, { size: 19 });
  paragraph(c, DOC.p3, { size: 19 });
  R(page, { x: 0, y: 600, w: 768, h: 216, fills: [{ type: "linearGradient", stops: ["#FFFDF800", "#FFFDF8"] }] });
  // menu de seleção
  const menu = row(page, { x: 210, y: 242, gap: 2, pad: 5, r: 14, fill: C.ink, fx: SHADOW_FLOAT, name: "Menu de seleção" });
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

  dock(s, 96, 800, 736, { compact: true });

  // painel do assistente
  const panel = col(s, { x: 872, y: 84, w: 548, h: 800, sizingV: "fixed", r: 24, fill: C.card, stroke: C.line, fx: SHADOW_SOFT, clip: true, name: "Assistente" });
  const ph = row(panel, { sizingH: "fill", pad: [16, 16, 16, 20], main: "spaceBetween" });
  const pht = row(ph, { gap: 10 });
  const av = row(pht, { w: 34, h: 34, r: 10, fill: C.indigo, main: "center" });
  I(av, "sparkles", { size: 17, color: C.white });
  const phc = col(pht, { gap: 2 });
  T(phc, "Assistente de leitura", { size: 15, weight: 600 });
  const eng = row(phc, { gap: 6 });
  E(eng, { w: 7, fill: C.green });
  T(eng, "IA local · Gemma 3n · funciona offline", { size: 11.5, color: C.ink3 });
  const pha = row(ph, { gap: 4 });
  iconButton(pha, "history", { s: 34, size: 17 });
  const cl = iconButton(pha, "x", { s: 34, size: 17 });
  link(cl, "leitor");
  R(panel, { w: 548, h: 1, fill: C.line, sizingH: "fill" });

  const ctx = row(panel, { gap: 8, pad: [10, 20, 10, 20], sizingH: "fill", fill: C.paper });
  I(ctx, "book", { size: 14, color: C.ink3 });
  T(ctx, "Contexto: Capítulo I inteiro + trecho selecionado", { size: 12, color: C.ink2 });

  const msgs = col(panel, { gap: 16, pad: [20, 20, 12, 20], sizingH: "fill", sizingV: "fill", name: "Mensagens" });
  // pergunta
  const q = col(msgs, { gap: 8, sizingH: "fill", cross: "max" });
  const qq = row(q, { gap: 6, pad: [6, 10, 6, 8], r: 8, fill: C.indigoSoft });
  I(qq, "quote", { size: 12, color: C.indigo });
  T(qq, "“…não sou propriamente um autor defunto, mas um defunto autor…”", { size: 11.5, italic: true, color: C.indigoInk });
  const qb = row(q, { pad: [12, 16, 12, 16], r: 18, fill: C.ink, w: 360 });
  T(qb, "Por que ele se chama de “defunto autor” e não “autor defunto”?", { size: 14, lh: "150%", color: C.paper, fillW: true });
  // resposta
  const a = col(msgs, { gap: 12, sizingH: "fill" });
  T(a, "Ele inverte a expressão de propósito:", { size: 14.5, lh: "160%", fillW: true });
  const li = col(a, { gap: 8, sizingH: "fill", pad: [0, 0, 0, 4] });
  [
    ["Autor defunto", "um escritor que já morreu."],
    ["Defunto autor", "um morto que resolveu escrever — é o caso de Brás Cubas."],
  ].forEach(([b, t]) => {
    const r = row(li, { gap: 10, sizingH: "fill", cross: "min" });
    const dot = row(r, { w: 6, h: 23, main: "center" });
    R(dot, { w: 6, h: 6, r: 3, fill: C.indigo });
    T(r, `${b}: ${t}`, { size: 14.5, lh: "160%", fillW: true });
  });
  T(a, "Como já está morto, ele narra sem medo de julgamento. Isso explica o tom irônico e livre do livro inteiro.", { size: 14.5, lh: "160%", fillW: true });
  const srcs = row(a, { gap: 8 });
  T(srcs, "Fontes", { size: 11.5, weight: 600, color: C.ink3 });
  const src1 = chip(srcs, "¶1 · “um defunto autor”", { icon: "quote", iconColor: C.indigo, color: C.indigo, fill: C.indigoSoft, stroke: null, size: 12 });
  chip(srcs, "¶1 · “a campa foi outro berço”", { icon: "quote", iconColor: C.indigo, color: C.indigo, fill: C.indigoSoft, stroke: null, size: 12 });
  link(src1, "leitor");
  const acts = row(a, { gap: 4 });
  [
    ["volume", "Ouvir"],
    ["copy", "Copiar"],
    ["note", "Salvar como nota"],
  ].forEach(([ic, t]) => {
    const b = row(acts, { gap: 6, pad: [6, 10, 6, 8], r: 8 });
    I(b, ic, { size: 14, color: C.ink2 });
    T(b, t, { size: 12, weight: 600, color: C.ink2 });
  });

  // sugestões + entrada
  const sug = row(panel, { gap: 8, pad: [4, 20, 12, 20], sizingH: "fill", wrap: true, crossGap: 8 });
  ["Resumir o capítulo", "Quem é Brás Cubas?", "3 perguntas de revisão", "Explicar mais simples"].forEach((t) =>
    chip(sug, t, { icon: "sparkles", iconColor: C.indigo, size: 12.5 }),
  );
  const inWrap = col(panel, { pad: [0, 20, 20, 20], sizingH: "fill" });
  const inp = col(inWrap, { gap: 10, pad: 14, r: 18, fill: C.card, stroke: C.line2, sizingH: "fill", fx: SHADOW_SOFT, name: "Campo de pergunta" });
  const tag = row(inp, { gap: 6, pad: [5, 8, 5, 8], r: 8, fill: C.indigoSoft });
  I(tag, "quote", { size: 12, color: C.indigo });
  T(tag, "Trecho selecionado · ¶1", { size: 11.5, weight: 600, color: C.indigoInk });
  I(tag, "x", { size: 12, color: C.indigoInk });
  T(inp, "Pergunte sobre o capítulo…", { size: 14.5, color: C.ink3 });
  const ia = row(inp, { sizingH: "fill", main: "spaceBetween" });
  const ial = row(ia, { gap: 4 });
  iconButton(ial, "mic", { s: 34, size: 17 });
  iconButton(ial, "plus", { s: 34, size: 17 });
  const send = row(ia, { w: 38, h: 38, r: 19, fill: C.indigo, main: "center" });
  I(send, "arrowUp", { size: 18, color: C.white, sw: 2.2 });
}

/* 06 · Modo foco (noturno) */
function foco() {
  const s = screen("foco", "06 · Modo foco — noturno", 1440, 900, { fill: C.night });
  const top = row(s, { x: 0, y: 0, w: 1440, h: 64, sizingV: "fixed", pad: [0, 32, 0, 32], main: "spaceBetween" });
  const tl = row(top, { gap: 10 });
  T(tl, "Capítulo I · Óbito do autor", { size: 13, color: C.nightText2 });
  const tr = row(top, { gap: 10 });
  T(tr, "12 min restantes", { size: 13, color: C.nightText2 });
  const ex = button(tr, "Sair do foco", { kind: "night", icon: "x", h: 36, size: 12.5, iconSize: 14 });
  link(ex, "leitor");
  const c = col(s, { x: 370, y: 120, w: 700, gap: 28 });
  paragraph(c, `${DOC.p1a} ${DOC.p1b}`, { size: 24, color: C.nightText, opacity: 0.32 });
  currentSentence(c, DOC.p1c, { size: 24, color: C.nightText, fill: "#E9A23B1F", bar: C.amber });
  paragraph(c, DOC.p1d, { size: 24, color: C.nightText, opacity: 0.32 });
  paragraph(c, DOC.p2, { size: 24, color: C.nightText, opacity: 0.32 });
  R(s, { x: 0, y: 620, w: 1440, h: 280, fills: [{ type: "linearGradient", stops: ["#11131A00", "#11131A"] }] });
  // controles flutuantes
  const fl = row(s, { x: 520, y: 792, gap: 6, pad: 8, r: 32, fill: C.nightCard, stroke: C.nightLine, fx: SHADOW_FLOAT, name: "Controles do foco" });
  const pb = row(fl, { w: 48, h: 48, r: 24, fill: C.amber, main: "center" });
  I(pb, "pause", { size: 16, color: C.night, solid: true });
  iconButton(fl, "type", { s: 44, color: C.nightText2 });
  iconButton(fl, "moon", { s: 44, color: C.amber, fill: "#E9A23B1F" });
  const amb = row(fl, { gap: 8, pad: [0, 14, 0, 12], h: 44, sizingV: "fixed", r: 22, fill: "#FFFFFF0D" });
  I(amb, "rain", { size: 16, color: C.nightText2 });
  T(amb, "Chuva leve", { size: 12.5, weight: 600, color: C.nightText });
  iconButton(fl, "timer", { s: 44, color: C.nightText2 });
  const fa = iconButton(fl, "sparkles", { s: 44, color: C.nightText2 });
  link(fa, "assistente");
  // anel de progresso
  const ring = F(s, { x: 1328, y: 800, w: 64, h: 64, name: "Progresso do capítulo" });
  create("shape.ellipse", { parent: ring, x: 0, y: 0, width: 64, height: 64, props: { fill: C.nightLine, arcInner: 0.86 } });
  create("shape.ellipse", { parent: ring, x: 0, y: 0, width: 64, height: 64, props: { fill: C.amber, arcInner: 0.86, arcStart: -90, arcSweep: 122 } });
  T(ring, "34%", { x: 0, y: 24, w: 64, align: "center", size: 12, weight: 600, color: C.nightText });
}

/* 07 · Celular — leitor */
function mobileTop(s) {
  const bar = row(s, { x: 0, y: 44, w: 390, h: 52, sizingV: "fixed", pad: [0, 12, 0, 8], main: "spaceBetween" });
  const back = iconButton(bar, "chevL", { s: 40, size: 20 });
  link(back, "biblioteca");
  const t = col(bar, { gap: 0, cross: "center" });
  T(t, "Brás Cubas", { size: 14, weight: 600 });
  T(t, "Cap. I · 34%", { size: 11, color: C.ink3 });
  iconButton(bar, "type", { s: 40, size: 18 });
  return bar;
}

function statusBar(s, dark) {
  const sb = row(s, { x: 0, y: 0, w: 390, h: 44, sizingV: "fixed", pad: [0, 28, 0, 32], main: "spaceBetween" });
  T(sb, "21:47", { size: 15, weight: 600, color: dark ? C.paper : C.ink });
  const ic = row(sb, { gap: 6 });
  R(ic, { w: 18, h: 10, r: 2, fill: dark ? C.paper : C.ink });
  R(ic, { w: 24, h: 11, r: 3, fill: dark ? C.paper : C.ink });
}

function mobileLeitor() {
  const s = screen("mobileLeitor", "07 · Celular — leitor", 390, 844, { fill: C.card });
  statusBar(s);
  mobileTop(s);
  progressBar(s, 0.34, { w: 390, h: 2 });
  steps.push({ command: "node.set", params: { ids: [nextId - 2], x: 0, y: 96 } });
  const c = col(s, { x: 24, y: 120, w: 342, gap: 16 });
  T(c, "CAPÍTULO I", { size: 11, weight: 700, ls: "16%", color: C.indigo });
  T(c, DOC.chapterTitle, { serif: true, weight: 600, size: 30, lh: "115%" });
  paragraph(c, DOC.p1a, { size: 18, color: C.ink2 });
  currentSentence(c, DOC.p1c, { size: 18 });
  paragraph(c, `${DOC.p1d} ${DOC.p2}`, { size: 18 });
  R(s, { x: 0, y: 560, w: 390, h: 140, fills: [{ type: "linearGradient", stops: ["#FFFDF800", "#FFFDF8"] }] });
  // player + atalho IA
  const ai = button(s, "Perguntar sobre esta frase", { kind: "soft", icon: "sparkles", h: 40, size: 13 });
  steps.push({ command: "node.set", params: { ids: [ai], x: 82, y: 640 } });
  link(ai, "mobileAssistente");
  const pl = col(s, { x: 12, y: 696, w: 366, gap: 10, pad: [14, 16, 14, 16], r: 24, fill: C.ink, fx: SHADOW_FLOAT, name: "Player" });
  const top = row(pl, { sizingH: "fill", gap: 10 });
  waveform(top, { n: 34, progress: 0.38, played: C.amber, rest: "#FFFFFF2E", max: 20, fillW: true });
  T(top, "04:12", { size: 11.5, weight: 600, color: C.nightText2 });
  const ctr = row(pl, { sizingH: "fill", main: "spaceBetween" });
  chip(ctr, "1,2×", { size: 12, fill: "#FFFFFF14", stroke: null, color: C.paper });
  const mid = row(ctr, { gap: 10 });
  iconButton(mid, "back15", { s: 40, color: C.paper });
  const pb = row(mid, { w: 52, h: 52, r: 26, fill: C.amber, main: "center" });
  I(pb, "pause", { size: 18, color: C.ink, solid: true });
  iconButton(mid, "fwd15", { s: 40, color: C.paper });
  iconButton(ctr, "moon", { s: 36, color: C.paper });
  R(s, { x: 128, y: 830, w: 134, h: 5, r: 3, fill: C.ink });
}

/* 08 · Celular — assistente (bottom sheet) */
function mobileAssistente() {
  const s = screen("mobileAssistente", "08 · Celular — assistente", 390, 844, { fill: C.card });
  statusBar(s);
  mobileTop(s);
  const c = col(s, { x: 24, y: 120, w: 342, gap: 16, opacity: 0.6 });
  T(c, DOC.chapterTitle, { serif: true, weight: 600, size: 30, lh: "115%" });
  paragraph(c, DOC.p1a, { size: 18, color: C.ink2 });
  R(s, { x: 0, y: 0, w: 390, h: 844, fill: "#1E2230", opacity: 0.35 });
  const sh = col(s, { x: 0, y: 214, w: 390, h: 630, sizingV: "fixed", r: [28, 28, 0, 0], fill: C.card, fx: SHADOW_FLOAT, gap: 14, pad: [10, 20, 28, 20], name: "Folha do assistente" });
  const handle = row(sh, { sizingH: "fill", main: "center" });
  R(handle, { w: 40, h: 5, r: 3, fill: C.line2 });
  const hh = row(sh, { sizingH: "fill", main: "spaceBetween" });
  const hl = row(hh, { gap: 8 });
  const av = row(hl, { w: 28, h: 28, r: 8, fill: C.indigo, main: "center" });
  I(av, "sparkles", { size: 14, color: C.white });
  const hc = col(hl, { gap: 0 });
  T(hc, "Assistente", { size: 14, weight: 600 });
  T(hc, "IA local · offline", { size: 11, color: C.green });
  const cl = iconButton(hh, "x", { s: 32, size: 16, fill: C.paper });
  link(cl, "mobileLeitor");
  const q = row(sh, { sizingH: "fill", main: "max" });
  const qb = row(q, { pad: [10, 14, 10, 14], r: 16, fill: C.ink, w: 260 });
  T(qb, "Explique essa frase de um jeito simples", { size: 13.5, lh: "145%", color: C.paper, fillW: true });
  const a = col(sh, { gap: 10, sizingH: "fill" });
  T(a, "Brás Cubas brinca com a ordem das palavras: ele não é um escritor que morreu, e sim um morto que virou escritor. Por isso conta tudo sem vergonha nenhuma.", { size: 14, lh: "158%", fillW: true });
  chip(a, "¶1 · “um defunto autor”", { icon: "quote", iconColor: C.indigo, color: C.indigo, fill: C.indigoSoft, stroke: null, size: 12 });
  const acts = row(a, { gap: 4 });
  [
    ["volume", "Ouvir"],
    ["note", "Salvar"],
  ].forEach(([ic, t]) => {
    const b = row(acts, { gap: 6, pad: [6, 10, 6, 8], r: 8, fill: C.paper });
    I(b, ic, { size: 14, color: C.ink2 });
    T(b, t, { size: 12, weight: 600, color: C.ink2 });
  });
  F(sh, { w: 10, h: 10, sizingV: "fill" });
  const sug = row(sh, { gap: 8, sizingH: "fill" });
  chip(sug, "Resumir capítulo", { icon: "sparkles", iconColor: C.indigo, size: 12 });
  chip(sug, "Me teste", { icon: "sparkles", iconColor: C.indigo, size: 12 });
  const inp = row(sh, { gap: 8, pad: [6, 6, 6, 16], h: 52, sizingV: "fixed", r: 26, stroke: C.line2, sizingH: "fill" });
  T(inp, "Pergunte algo…", { size: 14, color: C.ink3 });
  F(inp, { w: 10, h: 10, sizingH: "fill" });
  iconButton(inp, "mic", { s: 40, size: 18 });
  const send = row(inp, { w: 40, h: 40, r: 20, fill: C.indigo, main: "center" });
  I(send, "arrowUp", { size: 18, color: C.white, sw: 2.2 });
}

/* 09 · Sistema visual */
function sistema() {
  const s = screen("sistema", "09 · Sistema visual", 1440, 1100);
  T(s, "SISTEMA VISUAL", { x: 72, y: 64, size: 12, weight: 700, ls: "14%", color: C.indigo });
  T(s, "Papel & Tinta", { x: 72, y: 88, serif: true, weight: 600, size: 44 });
  T(s, "Fundo quente de papel para leitura longa, tinta índigo para ação e IA, âmbar exclusivo para a voz. Três cores, três papéis — o usuário aprende o significado sem legenda.", { x: 72, y: 150, w: 640, size: 15, lh: "155%", color: C.ink2 });

  const groups = [
    ["Papel", [["paper", "Fundo"], ["paper2", "Superfície"], ["card", "Página"], ["line", "Divisória"]]],
    ["Tinta", [["ink", "Texto"], ["ink2", "Texto 2"], ["ink3", "Apoio"]]],
    ["Índigo · ação e IA", [["indigo", "Primária"], ["indigoSoft", "Suave"], ["indigoInk", "Texto"]]],
    ["Âmbar · voz", [["amber", "Em leitura"], ["amberSoft", "Destaque"], ["amberInk", "Texto"]]],
    ["Noturno", [["night", "Fundo"], ["nightCard", "Superfície"], ["nightText", "Texto"]]],
  ];
  const sw = row(s, { x: 72, y: 240, gap: 22, cross: "min" });
  groups.forEach(([g, list]) => {
    const gc = col(sw, { gap: 10 });
    T(gc, g, { size: 13, weight: 600 });
    const r = row(gc, { gap: 8 });
    list.forEach(([k, label]) => {
      const it = col(r, { gap: 6, w: 64 });
      R(it, { w: 64, h: 64, r: 14, fill: C[k], stroke: C.line });
      T(it, label, { size: 11.5, weight: 600 });
      T(it, C[k], { size: 11, color: C.ink3 });
    });
  });

  // tipografia
  T(s, "Tipografia", { x: 72, y: 430, serif: true, weight: 600, size: 26 });
  const ty = col(s, { x: 72, y: 476, w: 640, gap: 18, pad: 28, r: 20, fill: C.card, stroke: C.line });
  [
    ["Source Serif 4 · 44/112% · Semibold", "Óbito do autor", { serif: true, weight: 600, size: 44 }],
    ["Source Serif 4 · 20/172% · leitura (≈68 caracteres por linha)", "Algum tempo hesitei se devia abrir estas memórias pelo princípio ou pelo fim.", { serif: true, size: 20, lh: "172%" }],
    ["Inter · 15/155% · interface e chat", "Ele inverte a expressão de propósito: um morto que resolveu escrever.", { size: 15, lh: "155%" }],
    ["Inter · 12 · Bold · 14% · rótulos", "CAPÍTULO I · CONTINUAR OUVINDO", { size: 12, weight: 700, ls: "14%", color: C.indigo }],
  ].forEach(([cap, sample, st]) => {
    const r = col(ty, { gap: 4, sizingH: "fill" });
    T(r, cap, { size: 11.5, color: C.ink3 });
    T(r, sample, { ...st, fillW: true });
  });

  // componentes
  T(s, "Componentes", { x: 760, y: 430, serif: true, weight: 600, size: 26 });
  const cp = col(s, { x: 760, y: 476, w: 608, gap: 20, pad: 28, r: 20, fill: C.card, stroke: C.line });
  const b1 = row(cp, { gap: 10 });
  button(b1, "Começar a ouvir", { kind: "accent", icon: "play", solidIcon: true, iconSize: 13 });
  button(b1, "Adicionar", { kind: "primary", icon: "plus" });
  button(b1, "Cancelar", { kind: "ghost" });
  const b2 = row(cp, { gap: 8 });
  chip(b2, "Resumir o capítulo", { icon: "sparkles", iconColor: C.indigo, size: 12.5 });
  chip(b2, "¶1 · “um defunto autor”", { icon: "quote", iconColor: C.indigo, color: C.indigo, fill: C.indigoSoft, stroke: null, size: 12 });
  chip(b2, "Ouvindo agora", { dot: C.amber, size: 12, fill: C.amberSoft, stroke: null, color: C.amberInk });
  const b3 = row(cp, { gap: 8 });
  const eng = row(b3, { gap: 6, pad: [6, 10, 6, 10], r: 99, fill: C.greenSoft });
  E(eng, { w: 7, fill: C.green });
  T(eng, "IA local · offline", { size: 12, weight: 600, color: C.green });
  const eng2 = row(b3, { gap: 6, pad: [6, 10, 6, 10], r: 99, fill: C.indigoSoft });
  I(eng2, "cloud", { size: 13, color: C.indigo });
  T(eng2, "Gemini · nuvem", { size: 12, weight: 600, color: C.indigoInk });
  const eng3 = row(b3, { gap: 6, pad: [6, 10, 6, 10], r: 99, fill: C.paper });
  I(eng3, "globe", { size: 13, color: C.ink2 });
  T(eng3, "IA do Chrome", { size: 12, weight: 600, color: C.ink2 });
  currentSentence(cp, "a primeira é que eu não sou propriamente um autor defunto, mas um defunto autor;", { size: 17 });
  const msg = row(cp, { gap: 12, sizingH: "fill", main: "max" });
  const qb = row(msg, { pad: [10, 14, 10, 14], r: 16, fill: C.ink });
  T(qb, "Por que “defunto autor”?", { size: 13.5, color: C.paper });
  const ab = col(cp, { gap: 8, pad: 14, r: 16, fill: C.paper, sizingH: "fill" });
  T(ab, "Resposta da IA: texto corrido, sem balão pesado, com as fontes logo abaixo.", { size: 13.5, lh: "150%", fillW: true });

  // regras
  T(s, "Regras de uso", { x: 72, y: 900, serif: true, weight: 600, size: 26 });
  const rules = row(s, { x: 72, y: 946, gap: 16 });
  [
    "Âmbar só aparece quando há áudio tocando.",
    "Índigo marca ação principal e tudo que é IA.",
    "Toda resposta da IA cita pelo menos um trecho.",
    "Toque mínimo de 44 px e foco visível em tudo.",
  ].forEach((t) => {
    const r = row(rules, { gap: 10, pad: 16, r: 14, fill: C.card, stroke: C.line, w: 308, cross: "min" });
    I(r, "check", { size: 16, color: C.green });
    T(r, t, { size: 13.5, lh: "145%", fillW: true });
  });
}

/* ───────────────────────── montagem ───────────────────────── */

capa();
inicio();
biblioteca("biblioteca", "02 · Biblioteca");
adicionar();
leitor();
assistente();
foco();
mobileLeitor();
mobileAssistente();
sistema();

for (const [id, key] of links) {
  steps.push({
    command: "proto.interaction.add",
    params: {
      id,
      trigger: { type: "onClick" },
      action: { type: "navigate", dest: frames[key] },
      transition: { type: "dissolve" },
      durationMs: 220,
      easing: "easeOut",
    },
  });
}
steps.push({ command: "proto.flow.add", params: { start: frames.capa, name: "Jornada do leitor" } });
steps.push({ command: "proto.flow.add", params: { start: frames.mobileLeitor, name: "Jornada no celular" } });
steps.push({ command: "page.rename", params: { name: "Jornada repaginada" } });
steps.push({ command: "file.rename", params: { name: "VivaVoz — Repaginação" } });

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(steps, null, 0).replace(/\},\{"command"/g, '},\n{"command"'));
console.log(`${steps.length} passos, última camada prevista #${nextId - 1} → ${OUT}`);
