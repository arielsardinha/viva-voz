import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// SVG vetorial de alta definição para VivaVoz
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%">
  <defs>
    <!-- Gradiente de Fundo Vibrante VivaVoz -->
    <linearGradient id="vvBg" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#3B82F6" />
      <stop offset="45%" stop-color="#6366F1" />
      <stop offset="100%" stop-color="#8B5CF6" />
    </linearGradient>

    <!-- Gradiente das Barras Sonoras -->
    <linearGradient id="vvWave" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="#F1F5F9" />
    </linearGradient>

    <!-- Gradiente do Sparkle IA -->
    <linearGradient id="vvSparkle" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#A5F3FC" />
      <stop offset="100%" stop-color="#38BDF8" />
    </linearGradient>

    <!-- Sombra suave interna / inferior -->
    <filter id="vvShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="#1E1B4B" flood-opacity="0.30"/>
    </filter>
  </defs>

  <!-- Fundo Squircle Arredondado com Estilo App Moderno -->
  <rect width="64" height="64" rx="15" fill="url(#vvBg)" />

  <!-- Borda Interna Sutil Glassmorphism -->
  <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="14.25" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.2" />

  <!-- Barras de Espectro de Voz e Áudio (AudioLines VivaVoz) -->
  <g fill="url(#vvWave)" filter="url(#vvShadow)">
    <rect x="10" y="24" width="4.5" height="16" rx="2.25" />
    <rect x="17.5" y="16" width="4.5" height="32" rx="2.25" />
    <rect x="25" y="10" width="4.5" height="44" rx="2.25" />
    <rect x="32.5" y="18" width="4.5" height="28" rx="2.25" />
    <rect x="40" y="14" width="4.5" height="36" rx="2.25" />
    <rect x="47.5" y="25" width="4.5" height="14" rx="2.25" />
  </g>

  <!-- Indicador Inteligente / Centelha IA -->
  <path d="M49 8 C49 11, 52 11, 52 11 C52 11, 49 11, 49 14 C49 11, 46 11, 46 11 C46 11, 49 11, 49 8 Z" fill="url(#vvSparkle)" />
</svg>`;

// Função para gerar um PNG RGBA com compressão DEFLATE padrão
function createPng(width, height, renderPixel) {
  const rawData = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width * 4 + 1);
    rawData[rowOffset] = 0; // Filter 0
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = renderPixel(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcData = Buffer.concat([typeBuf, data]);
    const crc = crc32(crcData);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc >>> 0, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return c ^ 0xffffffff;
}

// Signed Distance Function para retângulos arredondados
function sdRoundedBox(px, py, bx, by, bw, bh, r) {
  const halfW = bw / 2;
  const halfH = bh / 2;
  const cx = bx + halfW;
  const cy = by + halfH;
  const qx = Math.abs(px - cx) - (halfW - r);
  const qy = Math.abs(py - cy) - (halfH - r);
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  const insideDist = Math.min(Math.max(qx, qy), 0);
  return Math.hypot(ox, oy) + insideDist - r;
}

// Renderizador com SDF nítido e antialiasing cirúrgico de 1 pixel
function renderVivaVozPixel(px, py, w, _h) {
  const scale = 64 / w;
  const x = (px + 0.5) * scale;
  const y = (py + 0.5) * scale;
  const pixelSize = scale;

  // 1. Fundo Squircle (64x64 com rx = 15)
  const dBg = sdRoundedBox(x, y, 0, 0, 64, 64, 15);
  const bgAlpha = Math.max(0, Math.min(1, 0.5 - dBg / pixelSize));

  if (bgAlpha <= 0) {
    return [0, 0, 0, 0];
  }

  // Gradiente de Fundo (3B82F6 -> 6366F1 -> 8B5CF6)
  const t = (x / 64 + (1 - y / 64)) / 2;
  let bgR = 59 + (139 - 59) * t;
  let bgG = 130 + (92 - 130) * t;
  let bgB = 246 + (246 - 246) * t;
  if (t > 0.5) {
    const t2 = (t - 0.5) * 2;
    bgR = 99 + (139 - 99) * t2;
    bgG = 102 + (92 - 102) * t2;
    bgB = 241 + (246 - 241) * t2;
  }

  // Borda interna de realce (glass highlight)
  const dBorder = Math.abs(dBg + 0.6) - 0.6;
  const borderAlpha = Math.max(0, Math.min(0.35, (0.5 - dBorder / pixelSize) * 0.35));
  bgR = bgR * (1 - borderAlpha) + 255 * borderAlpha;
  bgG = bgG * (1 - borderAlpha) + 255 * borderAlpha;
  bgB = bgB * (1 - borderAlpha) + 255 * borderAlpha;

  // 2. Barras sonoras (6 barras)
  const bars = [
    { x: 10, y: 24, w: 4.5, h: 16, r: 2.25 },
    { x: 17.5, y: 16, w: 4.5, h: 32, r: 2.25 },
    { x: 25, y: 10, w: 4.5, h: 44, r: 2.25 },
    { x: 32.5, y: 18, w: 4.5, h: 28, r: 2.25 },
    { x: 40, y: 14, w: 4.5, h: 36, r: 2.25 },
    { x: 47.5, y: 25, w: 4.5, h: 14, r: 2.25 }
  ];

  let minDBar = 999;
  let minDShadow = 999;
  for (const b of bars) {
    const d = sdRoundedBox(x, y, b.x, b.y, b.w, b.h, b.r);
    const ds = sdRoundedBox(x, y - 1.2, b.x, b.y, b.w, b.h, b.r);
    if (d < minDBar) minDBar = d;
    if (ds < minDShadow) minDShadow = ds;
  }

  // 3. Sparkle no canto superior direito
  // Distância ao sparkle de 4 pontas centrado em (49, 11)
  const spX = Math.abs(x - 49);
  const spY = Math.abs(y - 11);
  const dSparkle = (spX + spY + Math.max(spX, spY)) / 2 - 2.8;

  // Renderização da Sombra das Barras
  const shadowAlpha = Math.max(0, Math.min(0.32, (1 - minDShadow / (pixelSize * 2.5)) * 0.32));
  let curR = bgR * (1 - shadowAlpha) + 20 * shadowAlpha;
  let curG = bgG * (1 - shadowAlpha) + 15 * shadowAlpha;
  let curB = bgB * (1 - shadowAlpha) + 50 * shadowAlpha;

  // Renderização das Barras Sonoras
  const barAlpha = Math.max(0, Math.min(1, 0.5 - minDBar / pixelSize));
  if (barAlpha > 0) {
    const barYProgress = Math.max(0, Math.min(1, (y - 10) / 44));
    const barR = 255;
    const barG = 255 - barYProgress * 15;
    const barB = 255 - barYProgress * 5;

    curR = curR * (1 - barAlpha) + barR * barAlpha;
    curG = curG * (1 - barAlpha) + barG * barAlpha;
    curB = curB * (1 - barAlpha) + barB * barAlpha;
  }

  // Renderização do Sparkle
  const sparkleAlpha = Math.max(0, Math.min(1, 0.5 - dSparkle / pixelSize));
  if (sparkleAlpha > 0) {
    const spR = 103;
    const spG = 232;
    const spB = 249;
    curR = curR * (1 - sparkleAlpha) + spR * sparkleAlpha;
    curG = curG * (1 - sparkleAlpha) + spG * sparkleAlpha;
    curB = curB * (1 - sparkleAlpha) + spB * sparkleAlpha;
  }

  return [
    Math.round(curR),
    Math.round(curG),
    Math.round(curB),
    Math.round(bgAlpha * 255)
  ];
}

// Criação de ICO multi-resolução
function createIco(pngBuffers) {
  const numImages = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(numImages, 4);

  let offset = 6 + numImages * 16;
  const directoryEntries = [];
  const imageBodies = [];

  for (const { size, buffer } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry[0] = size >= 256 ? 0 : size;
    entry[1] = size >= 256 ? 0 : size;
    entry[2] = 0;
    entry[3] = 0;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(buffer.length, 8);
    entry.writeUInt32LE(offset, 12);

    directoryEntries.push(entry);
    imageBodies.push(buffer);
    offset += buffer.length;
  }

  return Buffer.concat([header, ...directoryEntries, ...imageBodies]);
}

const projectRoot = path.resolve(process.cwd());

const png16 = createPng(16, 16, renderVivaVozPixel);
const png32 = createPng(32, 32, renderVivaVozPixel);
const png48 = createPng(48, 48, renderVivaVozPixel);
const png180 = createPng(180, 180, renderVivaVozPixel);
const png192 = createPng(192, 192, renderVivaVozPixel);
const png512 = createPng(512, 512, renderVivaVozPixel);

const icoBuffer = createIco([
  { size: 16, buffer: png16 },
  { size: 32, buffer: png32 },
  { size: 48, buffer: png48 }
]);

// 1. Grava SVGs
fs.writeFileSync(path.join(projectRoot, 'src/app/icon.svg'), svgContent, 'utf8');
fs.writeFileSync(path.join(projectRoot, 'public/icon.svg'), svgContent, 'utf8');

// 2. Grava ICOs
fs.writeFileSync(path.join(projectRoot, 'src/app/favicon.ico'), icoBuffer);
fs.writeFileSync(path.join(projectRoot, 'public/favicon.ico'), icoBuffer);

// 3. Grava Apple Touch Icons e PNGs
fs.writeFileSync(path.join(projectRoot, 'src/app/apple-icon.png'), png180);
fs.writeFileSync(path.join(projectRoot, 'public/apple-touch-icon.png'), png180);
fs.writeFileSync(path.join(projectRoot, 'public/icon-192.png'), png192);
fs.writeFileSync(path.join(projectRoot, 'public/icon-512.png'), png512);

console.log('✓ Favicons atualizados com SDF e antialiasing de alta precisão!');
