import localFont from "next/font/local";

export const inter = localFont({
  src: "./fonts/inter-latin-wght-normal.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-inter",
  display: "swap",
  adjustFontFallback: "Arial",
  preload: true,
});

export const merriweather = localFont({
  src: "./fonts/merriweather-latin-wght-normal.woff2",
  weight: "300 900",
  style: "normal",
  variable: "--font-merriweather",
  display: "swap",
  adjustFontFallback: "Times New Roman",
  preload: false,
});

export const lora = localFont({
  src: "./fonts/lora-latin-wght-normal.woff2",
  weight: "400 700",
  style: "normal",
  variable: "--font-lora",
  display: "swap",
  adjustFontFallback: "Times New Roman",
  preload: false,
});

export const roboto = localFont({
  src: "./fonts/roboto-latin-wght-normal.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-roboto",
  display: "swap",
  adjustFontFallback: "Arial",
  preload: false,
});

export const literata = localFont({
  src: "./fonts/literata-latin-wght-normal.woff2",
  weight: "200 900",
  style: "normal",
  variable: "--font-literata",
  display: "swap",
  adjustFontFallback: "Times New Roman",
  preload: false,
});

export const ROOT_FONT_VARIABLE_CLASSES = [
  inter.variable,
  merriweather.variable,
  lora.variable,
  roboto.variable,
  literata.variable,
].join(" ");
