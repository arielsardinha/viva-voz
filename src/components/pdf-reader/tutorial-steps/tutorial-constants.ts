import { BookOpen, Bot, Moon, ScrollText, Sun } from "lucide-react";
import type { ReaderTemplateId, ReadingTheme } from "@/context/reader-settings-context";

export const TEMPLATE_CHOICES: {
  id: ReaderTemplateId;
  title: string;
  badge: string;
  description: string;
  features: string[];
  icon: typeof Bot;
}[] = [
  {
    id: "ai-study",
    title: "Assistente IA & Estudos",
    badge: "Recomendado",
    description: "Split-view integrado com IA, player flutuante, resumos e quiz interativo.",
    features: ["Chat inteligente Gemini", "Player flutuante fixo", "Visualização lado a lado"],
    icon: Bot,
  },
  {
    id: "zen",
    title: "Modo Zen Imersivo",
    badge: "Foco Total",
    description: "Experiência de leitura contínua e sem distrações com gerador de som ambiente.",
    features: ["Interface ultra limpa", "Sons de chuva/café/floresta", "Ritmo de leitura fluido"],
    icon: BookOpen,
  },
];

export const THEME_CHOICES: {
  id: ReadingTheme;
  title: string;
  description: string;
  bgPreview: string;
  textPreview: string;
  icon: typeof Sun;
}[] = [
  {
    id: "light",
    title: "Clean (Claro)",
    description: "Fundo branco com contraste perfeito para ambientes bem iluminados.",
    bgPreview: "bg-white border-slate-200",
    textPreview: "text-slate-900",
    icon: Sun,
  },
  {
    id: "sepia",
    title: "Papel Zen (Sépia)",
    description: "Tons quentes de papel envelhecido que reduzem a fadiga visual.",
    bgPreview: "bg-[#FBF0D9] border-amber-300",
    textPreview: "text-[#433422]",
    icon: ScrollText,
  },
  {
    id: "dark",
    title: "Midnight (Escuro)",
    description: "Tema escuro relaxante ideal para leituras noturnas.",
    bgPreview: "bg-[#090D16] border-slate-800",
    textPreview: "text-slate-100",
    icon: Moon,
  },
];

export const SPEED_PRESETS = [
  { label: "0.8x", value: 0.8, desc: "Pausado" },
  { label: "1.0x", value: 1.0, desc: "Padrão" },
  { label: "1.25x", value: 1.25, desc: "Dinâmico" },
  { label: "1.5x", value: 1.5, desc: "Rápido" },
];

export const FONT_SIZE_PRESETS = [
  { label: "Padrão", size: 16 },
  { label: "Confortável", size: 18 },
  { label: "Ampliado", size: 20 },
  { label: "Grande", size: 22 },
];
