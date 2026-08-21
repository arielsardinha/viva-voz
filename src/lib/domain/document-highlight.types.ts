export type HighlightColor =
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "orange";

export interface TextHighlight {
  id: string;
  documentId?: string;
  sentenceIndex: number;
  startOffset: number;
  endOffset: number;
  text: string;
  color: HighlightColor;
  createdAt: number;
}

export interface HighlightColorOption {
  id: HighlightColor;
  label: string;
  hex: string;
  bgClass: string;
  borderClass: string;
  dotClass: string;
}

export const HIGHLIGHT_COLORS: HighlightColorOption[] = [
  {
    id: "yellow",
    label: "Amarelo Piloto",
    hex: "#facc15",
    bgClass: "highlight-yellow",
    borderClass: "border-yellow-400",
    dotClass: "bg-yellow-400",
  },
  {
    id: "green",
    label: "Verde Menta",
    hex: "#4ade80",
    bgClass: "highlight-green",
    borderClass: "border-green-400",
    dotClass: "bg-green-400",
  },
  {
    id: "blue",
    label: "Azul Céu",
    hex: "#60a5fa",
    bgClass: "highlight-blue",
    borderClass: "border-blue-400",
    dotClass: "bg-blue-400",
  },
  {
    id: "purple",
    label: "Roxo Lilás",
    hex: "#c084fc",
    bgClass: "highlight-purple",
    borderClass: "border-purple-400",
    dotClass: "bg-purple-400",
  },
  {
    id: "pink",
    label: "Rosa Magenta",
    hex: "#f472b6",
    bgClass: "highlight-pink",
    borderClass: "border-pink-400",
    dotClass: "bg-pink-400",
  },
  {
    id: "orange",
    label: "Laranja Âmbar",
    hex: "#fb923c",
    bgClass: "highlight-orange",
    borderClass: "border-orange-400",
    dotClass: "bg-orange-400",
  },
];
