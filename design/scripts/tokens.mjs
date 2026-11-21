// Tokens visuais, tipografia, formatos e dados realistas da jornada VivaVoz v2.

export const C = {
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
  indigoBorder: "#C5C1FA",
  amber: "#E9A23B",
  amberSoft: "#FCEFCF",
  amberInk: "#7A4B06",
  amberGlow: "#F5C77A",
  green: "#2E8B57",
  greenSoft: "#DDF2E6",
  greenInk: "#1B5E3A",
  night: "#11131A",
  nightCard: "#191C25",
  nightCard2: "#222634",
  nightLine: "#2A2E3B",
  nightText: "#E8E4DA",
  nightText2: "#9A9FAD",
  white: "#FFFFFF",
};

export const FORMAT = {
  PDF: "#B9543D",
  EPUB: "#4B44D6",
  WEB: "#2B7A9B",
  DOCX: "#3D6E4E",
  MD: "#7A5AA8",
  TXT: "#6B6F7B",
};

export const SERIF = "Source Serif 4";
export const SANS = "Inter";

export const SHADOW_SOFT = [
  { type: "dropShadow", color: "#1E223012", offset: [0, 4], radius: 18, spread: 0 },
];

export const SHADOW_FLOAT = [
  { type: "dropShadow", color: "#1E22301A", offset: [0, 18], radius: 48, spread: -6 },
  { type: "dropShadow", color: "#1E22300D", offset: [0, 2], radius: 6, spread: 0 },
];

export const SHADOW_AMBER = [
  { type: "dropShadow", color: "#E9A23B33", offset: [0, 8], radius: 24, spread: -4 },
];

export const DOC = {
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

export const CHAPTERS = [
  ["I", "Óbito do autor", "6m"],
  ["II", "O emplasto", "5m"],
  ["III", "Genealogia", "7m"],
  ["IV", "A ideia fixa", "4m"],
  ["V", "Em que aparece a orelha de uma senhora", "8m"],
  ["VI", "Chimène, qui l'eût dit?", "5m"],
  ["VII", "O delírio", "14m"],
  ["VIII", "Razão contra sandice", "6m"],
];

export const SHELF = [
  ["Memórias Póstumas de Brás Cubas", "EPUB", "Machado de Assis", 0.34, "Cap. I · 2h10 rest.", 4],
  ["Relatório Anual de Sustentabilidade 2025", "PDF", "48 páginas", 0.72, "Pág. 35 de 48", 2],
  ["Como o cérebro consolida memórias", "WEB", "nexojornal.com.br", 0.1, "12 min de áudio", 0],
  ["Anotações · Biologia celular", "DOCX", "Aula 07", 1, "Concluído", 7],
  ["Dom Casmurro", "PDF", "Machado de Assis", 0, "Novo · 6h40 de áudio", 0],
  ["Guia: Atenção é tudo que você precisa", "MD", "Resumo do paper", 0.55, "Seção 3 de 6", 3],
];

export const VOICES = [
  ["Dora", "Kokoro 82M · PT-BR", "Natural e expressiva", true],
  ["Faber", "Piper · PT-BR", "Leve na CPU", false],
  ["Alex", "Kokoro 82M · PT-BR", "Ideal para estudo", false],
  ["Cadu", "Piper · PT-BR", "Firme e clara", false],
];

export const AMBIENT_PRESETS = [
  ["volumeX", "Silêncio", false],
  ["rain", "Chuva", true],
  ["waves", "Ondas", false],
  ["flame", "Lareira", false],
  ["wind", "Foco", false],
];
