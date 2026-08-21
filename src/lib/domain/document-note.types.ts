export type NoteColor = "amber" | "emerald" | "sky" | "purple" | "rose";

export interface DocumentNote {
  id: string;
  documentId?: string;
  sentenceIndex: number;
  selectedText: string;
  title?: string;
  content: string;
  color?: NoteColor;
  page?: number;
  createdAt: number;
  updatedAt: number;
}

export interface NoteColorOption {
  id: NoteColor;
  label: string;
  hex: string;
  badgeClass: string;
  borderClass: string;
  bgClass: string;
}

export const NOTE_COLORS: NoteColorOption[] = [
  {
    id: "amber",
    label: "Amarelo Post-it",
    hex: "#f59e0b",
    badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30",
    borderClass: "border-amber-400",
    bgClass: "bg-amber-50 dark:bg-amber-950/40",
  },
  {
    id: "emerald",
    label: "Verde Menta",
    hex: "#10b981",
    badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
    borderClass: "border-emerald-400",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/40",
  },
  {
    id: "sky",
    label: "Azul Céu",
    hex: "#0ea5e9",
    badgeClass: "bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/30",
    borderClass: "border-sky-400",
    bgClass: "bg-sky-50 dark:bg-sky-950/40",
  },
  {
    id: "purple",
    label: "Roxo Criativo",
    hex: "#a855f7",
    badgeClass: "bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30",
    borderClass: "border-purple-400",
    bgClass: "bg-purple-50 dark:bg-purple-950/40",
  },
  {
    id: "rose",
    label: "Rosa Destaque",
    hex: "#f43f5e",
    badgeClass: "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30",
    borderClass: "border-rose-400",
    bgClass: "bg-rose-50 dark:bg-rose-950/40",
  },
];
