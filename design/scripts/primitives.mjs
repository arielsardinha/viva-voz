// Primitivas do FigCraft, ícones vetoriais e componentes reutilizáveis do VivaVoz v2.

import { C, FORMAT, SANS, SERIF, SHADOW_AMBER, SHADOW_FLOAT, SHADOW_SOFT, DOC } from "./tokens.mjs";

function clean(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

const K = 0.5523;
function circ(cx, cy, r) {
  const k = r * K;
  return `M${cx - r} ${cy} C${cx - r} ${cy - k} ${cx - k} ${cy - r} ${cx} ${cy - r} C${cx + k} ${cy - r} ${cx + r} ${cy - k} ${cx + r} ${cy} C${cx + r} ${cy + k} ${cx + k} ${cy + r} ${cx} ${cy + r} C${cx - k} ${cy + r} ${cx - r} ${cy + k} ${cx - r} ${cy} Z`;
}

export const ICONS = {
  sparkles: "M12 3 L13.9 8.6 L19.5 10.5 L13.9 12.4 L12 18 L10.1 12.4 L4.5 10.5 L10.1 8.6 Z M19 15 L19.8 17.2 L22 18 L19.8 18.8 L19 21 L18.2 18.8 L16 18 L18.2 17.2 Z",
  mic: "M9 5 C9 3.3 10.3 2 12 2 C13.7 2 15 3.3 15 5 L15 11 C15 12.7 13.7 14 12 14 C10.3 14 9 12.7 9 11 Z M5 10 L5 11 C5 14.9 8.1 18 12 18 C15.9 18 19 14.9 19 11 L19 10 M12 18 L12 22",
  play: "M7 4 L20 12 L7 20 Z",
  pause: "M7 4 L10 4 L10 20 L7 20 Z M14 4 L17 4 L17 20 L14 20 Z",
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
  volumeX: "M4 9 L8 9 L13 4 L13 20 L8 15 L4 15 Z M17 9 L22 15 M22 9 L17 15",
  cpu: "M6 6 L18 6 L18 18 L6 18 Z M9.5 9.5 L14.5 9.5 L14.5 14.5 L9.5 14.5 Z M9 2 L9 6 M15 2 L15 6 M9 18 L9 22 M15 18 L15 22 M2 9 L6 9 M2 15 L6 15 M18 9 L22 9 M18 15 L22 15",
  shield: "M12 2 L20 5 L20 11 C20 16 16.5 20 12 22 C7.5 20 4 16 4 11 L4 5 Z M8.5 12 L11 14.5 L15.5 9.5",
  globe: `${circ(12, 12, 10)} M2 12 L22 12 M12 2 C15 5 15 19 12 22 C9 19 9 5 12 2`,
  check: "M5 12.5 L10 17.5 L19 7",
  focus: "M3 8 L3 3 L8 3 M16 3 L21 3 L21 8 M21 16 L21 21 L16 21 M8 21 L3 21 L3 16",
  copy: "M8 8 L20 8 L20 20 L8 20 Z M16 8 L16 4 L4 4 L4 16 L8 16",
  note: "M4 4 L20 4 L20 15 L15 20 L4 20 Z M15 20 L15 15 L20 15 M8 9 L16 9 M8 13 L12 13",
  history: "M3 12 C3 7 7 3 12 3 C17 3 21 7 21 12 C21 17 17 21 12 21 C8.5 21 5.5 19 4 16 M3 5 L3 10 L8 10 M12 7 L12 12 L15.5 14",
  cloud: "M7 18 C4.2 18 2 15.8 2 13 C2 10.4 4 8.3 6.5 8 C7.4 5.1 10 3 13 3 C16.9 3 20 6.1 20 10 C21.7 10.5 23 12.1 23 14 C23 16.2 21.2 18 19 18 Z",
  heart: "M12 20 C12 20 3 14.5 3 8.5 C3 5.5 5.2 3.5 7.8 3.5 C9.6 3.5 11.2 4.5 12 6 C12.8 4.5 14.4 3.5 16.2 3.5 C18.8 3.5 21 5.5 21 8.5 C21 14.5 12 20 12 20 Z",
  rain: "M7 15 C4.2 15 2 12.8 2 10 C2 7.4 4 5.3 6.5 5 C7.4 2.1 10 1 13 1 C16.9 1 20 4.1 20 8 C21.7 8.5 23 9.6 23 11.5 C23 13.4 21.2 15 19 15 Z M8 18 L7 21 M13 18 L12 21 M18 18 L17 21",
  waves: "M2 8 C4 6 6 6 8 8 C10 10 12 10 14 8 C16 6 18 6 20 8 M2 14 C4 12 6 12 8 14 C10 16 12 16 14 14 C16 12 18 12 20 14",
  flame: "M12 2 C14 6 18 8 18 13 C18 16.9 15.3 20 12 20 C8.7 20 6 16.9 6 13 C6 10.5 7.5 8.5 9 7 C9 9 10 10 11 10 C10.5 7 11 4 12 2 Z",
  wind: "M3 8 L16 8 C18.2 8 19.5 6.8 19.5 5.2 C19.5 3.8 18.2 2.8 16.8 2.8 C15.4 2.8 14.5 3.7 14.5 4.8 M3 12 L19 12 C21 12 22 13.1 22 14.6 C22 16 20.9 17.2 19.2 17.2 C17.7 17.2 16.8 16.3 16.8 15.2 M3 16 L12 16 C13.5 16 14.5 17 14.5 18.4 C14.5 19.7 13.5 20.6 12 20.6",
  timer: `${circ(12, 13, 8)} M12 9 L12 13 L14.5 15 M9 2 L15 2`,
  wave: "M2 12 L4 12 M6 8 L6 16 M10 5 L10 19 M14 8 L14 16 M18 10 L18 14 M22 12 L20 12",
  headphones: "M4 15 L4 12 C4 7.6 7.6 4 12 4 C16.4 4 20 7.6 20 12 L20 15 M4 14 C4 13.4 4.4 13 5 13 L7 13 C7.6 13 8 13.4 8 14 L8 19 C8 19.6 7.6 20 7 20 L5 20 C4.4 20 4 19.6 4 19 Z M16 14 C16 13.4 16.4 13 17 13 L19 13 C19.6 13 20 13.4 20 14 L20 19 C20 19.6 19.6 20 19 20 L17 20 C16.4 20 16 19.6 16 19 Z",
  image: "M3 5 C3 3.9 3.9 3 5 3 L19 3 C20.1 3 21 3.9 21 5 L21 19 C21 20.1 20.1 21 19 21 L5 21 C3.9 21 3 20.1 3 19 Z M3 16 L8 11 L13 16 L16 13 L21 18",
  sliders: "M4 7 L10 7 M14 7 L20 7 M10 5 L10 9 M4 17 L14 17 M18 17 L20 17 M14 15 L14 19 M4 12 L7 12 M11 12 L20 12 M7 10 L7 14",
  zap: "M13 2 L4 14 L12 14 L11 22 L20 10 L12 10 Z",
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

export function createContext() {
  const steps = [];
  const links = [];
  const frames = {};
  let nextId = 2;
  let cursorX = 0;
  const layoutParents = new Set();

  function create(command, params) {
    steps.push({ command, params });
    return nextId++;
  }

  function addStep(command, params) {
    steps.push({ command, params });
  }

  function link(id, dest) {
    links.push([id, dest]);
  }

  function screen(key, name, w, h, o = {}) {
    const id = F(undefined, { x: cursorX, y: 0, w, h, fill: o.fill ?? C.paper, clip: true, name });
    frames[key] = id;
    cursorX += w + 160;
    return id;
  }

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

  function styleRange(nodeId, fullText, substring, styleProps) {
    const idx = fullText.indexOf(substring);
    if (idx < 0) return;
    const start = Array.from(fullText.slice(0, idx)).length;
    const end = start + Array.from(substring).length;
    addStep("text.style", { id: nodeId, start, end, ...styleProps });
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
        props: clean({
          fill: o.fill,
          fills: o.fills,
          stroke: o.stroke,
          strokeWeight: o.stroke ? o.sw ?? 1 : undefined,
          opacity: o.opacity,
          effects: o.fx,
          arcInner: o.arcInner,
          arcStart: o.arcStart,
          arcSweep: o.arcSweep,
        }),
      }),
    );
  }

  function I(parent, name, o = {}) {
    const size = o.size ?? 18;
    const s = size / 24;
    const path = ICONS[name];
    const b = bbox(path);
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

  /* ───────────── Componentes VivaVoz v2 ───────────── */

  function logo(p, o = {}) {
    const r = row(p, { gap: 10, name: "Logo", x: o.x, y: o.y });
    const mark = F(r, {
      w: 32,
      h: 32,
      r: 10,
      fill: o.dark ? C.nightText : C.ink,
      layout: "horizontal",
      main: "center",
      cross: "center",
      gap: 2.5,
    });
    [8, 14, 18, 11, 6].forEach((h, i) =>
      R(mark, { w: 2.5, h, r: 2, fill: i === 2 ? C.amber : o.dark ? C.night : C.paper }),
    );
    T(r, "VivaVoz", { serif: true, weight: 600, size: 20, color: o.dark ? C.nightText : C.ink });
    return r;
  }

  function button(p, label, o = {}) {
    const kind = o.kind ?? "primary";
    const look = {
      primary: { fill: C.ink, color: C.paper },
      accent: { fill: C.indigo, color: C.white },
      amber: { fill: C.amber, color: C.ink },
      amberSoft: { fill: C.amberSoft, color: C.amberInk },
      ghost: { fill: undefined, color: C.ink, stroke: C.line2 },
      soft: { fill: C.indigoSoft, color: C.indigoInk },
      night: { fill: C.nightCard, color: C.nightText, stroke: C.nightLine },
      nightAmber: { fill: "#E9A23B26", color: C.amberGlow, stroke: "#E9A23B55" },
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
      pad: o.pad ?? [7, 12, 7, o.icon ? 10 : 12],
      r: 999,
      fill: o.fill ?? C.card,
      stroke: o.stroke === null ? undefined : o.stroke ?? C.line,
      name: `Chip/${label}`,
    });
    if (o.dot) E(c, { w: 7, fill: o.dot });
    if (o.icon) I(c, o.icon, { size: o.iconSize ?? 14, color: o.iconColor ?? o.color ?? C.ink2, solid: o.solidIcon });
    T(c, label, { size: o.size ?? 13, weight: o.weight ?? 600, color: o.color ?? C.ink2 });
    if (o.iconR) I(c, o.iconR, { size: 12, color: o.color ?? C.ink2 });
    return c;
  }

  function waveform(p, o = {}) {
    const w = row(p, {
      gap: o.gap ?? 3,
      name: "Forma de onda",
      sizingH: o.fillW ? "fill" : undefined,
      main: o.fillW ? "spaceBetween" : undefined,
    });
    const n = o.n ?? 40;
    const prog = o.progress ?? 0.38;
    const cursorIdx = o.cursor ? Math.round(n * prog) : -1;
    for (let i = 0; i < n; i++) {
      const h = 4 + Math.round(Math.abs(Math.sin(i * 0.9) * 10 + Math.sin(i * 0.37) * 8 + Math.cos(i * 2.1) * 3));
      const played = i / n < prog;
      const isCursor = i === cursorIdx;
      R(w, {
        w: isCursor ? 3.5 : o.barW ?? 3,
        h: isCursor ? (o.max ?? 24) + 2 : Math.min(h, o.max ?? 24),
        r: 2,
        fill: isCursor ? o.cursorColor ?? C.ink : played ? o.played ?? C.amber : o.rest ?? C.line2,
      });
    }
    return w;
  }

  function progressBar(p, pct, o = {}) {
    const w = o.w ?? 200;
    const h = o.h ?? 6;
    const track = F(p, {
      w,
      h,
      r: 99,
      fill: o.track ?? C.paper2,
      name: "Progresso",
      sizingH: o.fillW ? "fill" : undefined,
      clip: true,
    });
    R(track, { x: 0, y: 0, w: Math.max(4, Math.round(w * pct)), h, r: 99, fill: o.color ?? C.amber });
    return track;
  }

  function cover(p, title, fmt, o = {}) {
    const w = o.w ?? 132;
    const h = o.h ?? 176;
    const c = F(p, { w, h, r: o.r ?? 10, fill: FORMAT[fmt] ?? C.indigo, clip: true, name: `Capa/${title}`, fx: o.fx });
    R(c, { x: 0, y: 0, w: 6, h, fill: "#00000022" });
    R(c, { x: w - 46, y: -30, w: 90, h: 90, r: 45, fill: "#FFFFFF14" });
    if (w < 60) return c;
    T(c, title, { x: 16, y: 18, w: w - 30, serif: true, weight: 600, size: o.titleSize ?? 15, color: "#FFF8EC", lh: "118%" });
    T(c, fmt, { x: 16, y: h - 28, size: 10, weight: 700, ls: "8%", color: "#FFF8ECAA" });
    return c;
  }

  function miniCover(p, fmt = "EPUB", o = {}) {
    const box = F(p, { w: 46, h: 54, name: "Mini capa" });
    const c = F(box, {
      x: 0,
      y: 2,
      w: 42,
      h: 50,
      r: 8,
      fill: FORMAT[fmt] ?? C.indigo,
      clip: true,
      layout: "vertical",
      main: "center",
      cross: "center",
      gap: 3,
    });
    I(c, "book", { size: 16, color: "#FFF8EC" });
    T(c, fmt, { size: 8.5, weight: 700, ls: "6%", color: "#FFF8ECCC" });
    if (o.playing) {
      const dot = row(box, { x: 32, y: 0, w: 14, h: 14, r: 7, fill: C.card, main: "center" });
      E(dot, { w: 8, fill: C.amber });
    }
    return box;
  }

  function topNav(p, o = {}) {
    const bar = row(p, {
      x: 0,
      y: 0,
      w: o.w ?? 1440,
      h: 72,
      sizingV: "fixed",
      pad: [0, 48, 0, 48],
      main: "spaceBetween",
      name: "Navegação",
    });
    logo(bar);
    const linksRow = row(bar, { gap: 32 });
    ["Como funciona", "Recursos", "Privacidade", "Apoiar o projeto"].forEach((l) =>
      T(linksRow, l, { size: 14, color: C.ink2, weight: 400 }),
    );
    const cta = button(bar, "Abrir minha biblioteca", { kind: "primary", h: 40, iconR: "arrowR" });
    return { bar, cta };
  }

  function readerTop(s, o = {}) {
    const bar = row(s, {
      x: 0,
      y: 0,
      w: 1440,
      h: 68,
      sizingV: "fixed",
      pad: [0, 24, 0, 20],
      main: "spaceBetween",
      name: "Barra do leitor",
    });
    const l = row(bar, { gap: 12 });
    const back = iconButton(l, "arrowL", { s: 40, stroke: C.line });
    link(back, "biblioteca");
    const lt = col(l, { gap: 1 });
    T(lt, DOC.title, { size: 14, weight: 600 });
    T(lt, `${DOC.author} · ${DOC.chapter} — ${DOC.chapterTitle}`, { size: 12, color: C.ink3 });

    const mid = row(bar, { gap: 10 });
    progressBar(mid, 0.34, { w: 160, h: 5, color: C.amber });
    T(mid, "34% · 2h10 a 1,25×", { size: 12, color: C.ink2 });

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
    return { bar, back, focus, ai };
  }

  function paragraph(p, text, o = {}) {
    return T(p, text, {
      serif: true,
      size: o.size ?? 20,
      lh: o.lh ?? "172%",
      color: o.color ?? C.ink,
      fillW: true,
      opacity: o.opacity,
    });
  }

  function marked(p, o = {}) {
    const h = col(p, { pad: o.pad ?? [10, 16, 10, 18], fill: o.fill, sizingH: "fill", name: o.name });
    addStep("node.set", { ids: [h], stroke: o.bar });
    addStep("node.set", {
      ids: [h],
      strokeTopWeight: 0,
      strokeRightWeight: 0,
      strokeBottomWeight: 0,
      strokeLeftWeight: 3,
    });
    return h;
  }

  function currentSentence(p, text, o = {}) {
    const h = marked(p, {
      fill: o.fill ?? C.amberSoft,
      bar: o.bar ?? C.amber,
      name: o.name ?? "Frase em leitura",
    });
    const tid = T(h, text, {
      serif: true,
      size: o.size ?? 20,
      lh: o.lh ?? "172%",
      color: o.color ?? C.ink,
      fillW: true,
    });
    if (o.activeWord) {
      styleRange(tid, text, o.activeWord, {
        fontStyle: "Semibold",
        textFills: [o.activeWordColor ?? C.amberInk],
        textDecoration: "underline",
      });
    }
    return h;
  }

  function inlineVoiceReply(p, duration = "0:22", o = {}) {
    const b = row(p, {
      gap: 8,
      pad: [6, 12, 6, 8],
      r: 999,
      fill: C.amberSoft,
      stroke: "#E9A23B66",
      name: "Ouvir resposta da IA",
    });
    const playCircle = row(b, { w: 24, h: 24, r: 12, fill: C.amber, main: "center" });
    I(playCircle, "play", { size: 11, color: C.ink, solid: true });
    T(b, o.label ?? "Ouvir explicação", { size: 12, weight: 600, color: C.amberInk });
    waveform(b, { n: 10, progress: 0.4, played: C.amberInk, rest: "#7A4B0644", max: 12, barW: 2, gap: 2 });
    T(b, duration, { size: 11.5, weight: 600, color: C.amberInk });
    return b;
  }

  function dock(p, x, y, w, o = {}) {
    const paused = o.mode === "pausedForChat";
    const d = row(p, {
      x,
      y,
      w,
      h: 76,
      sizingV: "fixed",
      pad: [0, 18, 0, 12],
      gap: o.compact ? 10 : 12,
      r: 38,
      fill: C.card,
      stroke: paused ? C.amber : C.line,
      sw: paused ? 1.5 : 1,
      fx: SHADOW_FLOAT,
      name: "Player flutuante",
    });
    miniCover(d, "EPUB", { playing: !paused });

    const meta = col(d, { gap: 2, w: o.compact ? 114 : 134 });
    T(meta, paused ? "Pausado p/ chat" : "Óbito do autor", {
      size: 13,
      weight: 600,
      color: paused ? C.amberInk : C.ink,
    });
    const voiceBtn = row(meta, { gap: 4, name: "Seletor de voz" });
    T(voiceBtn, "Dora · Offline", { size: 11.5, color: C.ink3 });
    I(voiceBtn, "chevD", { size: 12, color: C.ink3 });

    const ctr = row(d, { gap: 4 });
    iconButton(ctr, "back15", { s: 34, size: 17 });
    const playBtn = row(ctr, {
      w: 46,
      h: 46,
      r: 23,
      fill: C.amber,
      main: "center",
      fx: paused ? undefined : SHADOW_AMBER,
      name: paused ? "Retomar leitura" : "Pausar leitura",
    });
    I(playBtn, paused ? "play" : "pause", { size: 15, color: C.ink, solid: true });
    iconButton(ctr, "fwd15", { s: 34, size: 17 });

    waveform(d, {
      n: o.compact ? 22 : 34,
      progress: 0.38,
      played: paused ? "#E9A23B88" : C.amber,
      rest: C.line2,
      max: 24,
      fillW: true,
      cursor: !paused,
      cursorColor: C.ink,
    });

    T(d, o.compact ? "04:12" : "04:12 / 18:40", { size: 12, weight: 600, color: C.ink2 });
    const speedBtn = chip(d, "1,25×", {
      size: 12,
      fill: C.paper,
      stroke: null,
      color: C.ink,
      pad: [6, 10, 6, 10],
    });
    let ambientBtn = null;
    let timerBtn = null;
    if (!o.compact) {
      ambientBtn = iconButton(d, "rain", { s: 34, size: 16, fill: C.paper, color: C.ink });
      timerBtn = iconButton(d, "timer", { s: 34, size: 16, color: C.ink2 });
    }
    return { dockFrame: d, voiceBtn, playBtn, speedBtn, ambientBtn, timerBtn };
  }

  return {
    steps,
    links,
    frames,
    getLastId: () => nextId - 1,
    addStep,
    link,
    screen,
    F,
    row,
    col,
    T,
    styleRange,
    R,
    E,
    I,
    logo,
    button,
    iconButton,
    chip,
    waveform,
    progressBar,
    cover,
    miniCover,
    topNav,
    readerTop,
    paragraph,
    marked,
    currentSentence,
    inlineVoiceReply,
    dock,
  };
}
