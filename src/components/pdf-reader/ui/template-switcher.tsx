"use client";

import {
  BookOpen,
  Bot,
  Compass,
  Maximize2,
  Minimize2,
  Moon,
  ScrollText,
  Sun,
  Type,
  Volume2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { AmbientSoundPlayer } from "./ambient-sound-player";
import type {
  ReaderTemplateId,
  ReadingTheme,
  ReadingFont,
  ReaderSettings,
} from "@/context/reader-settings-context";
import { READING_FONTS } from "@/context/reader-settings-context";

export type { ReaderTemplateId, ReadingTheme, ReadingFont, ReaderSettings };

interface TemplateSwitcherProps {
  settings: ReaderSettings;
  onChangeSettings: (patch: Partial<ReaderSettings>) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;

  currentPage?: number;
  totalPages?: number;
}

export const TEMPLATES = [
  {
    id: "modern" as const,
    label: "Estúdio Moderno",
    shortLabel: "Estúdio",
    description: "Leitor clean com player flutuante dock e waveform",
    icon: Compass,
  },
  {
    id: "ai-study" as const,
    label: "Assistente IA",
    shortLabel: "Assistente",
    description: "Split-view com chat inteligente e menu flutuante",
    icon: Bot,
  },
  {
    id: "zen" as const,
    label: "Modo Zen Imersivo",
    shortLabel: "Modo Zen",
    description: "Leitura focada sem distrações com som ambiente",
    icon: BookOpen,
  },
];

export function TemplateSwitcher({
  settings,
  onChangeSettings,
  isFullscreen = false,
  onToggleFullscreen,
  currentPage,
  totalPages,
}: TemplateSwitcherProps) {
  return (
    <div className="glass-panel flex flex-wrap items-center justify-between gap-2 rounded-2xl p-2 sm:px-3 sm:py-2 shadow-xs border border-border/80">
      {/* Selector de Template com Tabs em Pílulas */}
      <div className="flex items-center gap-1 bg-secondary/80 p-0.5 sm:p-1 rounded-xl overflow-x-auto no-scrollbar">
        {TEMPLATES.map((t) => {
          const Icon = t.icon;
          const isActive = settings.template === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChangeSettings({ template: t.id })}
              title={t.description}
              className={cn(
                "flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0",
                isActive
                  ? "bg-card text-foreground shadow-xs ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/50"
              )}
            >
              <Icon className={cn("size-3.5", isActive ? "text-accent" : "")} />
              <span className="hidden sm:inline">{t.label}</span>
              <span className="inline sm:hidden">{t.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Controles de Estilo / Tema / Áudio Ambiente */}
      <div className="flex items-center gap-1.5 ml-auto">
        {/* Sons Ambientes (Disponível em todos os modos) */}
        <AmbientSoundPlayer />

        {/* Menu de Ajustes Tipográficos */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title="Ajustes de Tipografia e Tema"
              aria-label="Ajustes de Tipografia e Tema"
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium bg-background/80 hover:bg-secondary border border-border transition-colors text-foreground"
            >
              <Type className="size-3.5" />
              <span className="hidden sm:inline">Texto & Tema</span>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-72 p-3 glass-panel">
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tema de Leitura
            </DropdownMenuLabel>
            <div className="grid grid-cols-3 gap-1.5 py-2">
              <button
                type="button"
                onClick={() => onChangeSettings({ theme: "light" })}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition-all",
                  settings.theme === "light"
                    ? "border-accent bg-accent/10 text-accent font-semibold"
                    : "border-border bg-white text-slate-800 hover:bg-slate-50"
                )}
              >
                <Sun className="size-4" />
                <span>Clean</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeSettings({ theme: "sepia" })}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition-all",
                  settings.theme === "sepia"
                    ? "border-amber-600 bg-amber-50 text-amber-900 font-semibold ring-1 ring-amber-500"
                    : "border-amber-200 bg-[#FDFBF7] text-amber-900 hover:bg-[#F7F3EB]"
                )}
              >
                <ScrollText className="size-4 text-amber-600" />
                <span>Papel Zen</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeSettings({ theme: "dark" })}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition-all",
                  settings.theme === "dark"
                    ? "border-accent bg-accent/20 text-accent font-semibold ring-1 ring-accent"
                    : "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                )}
              >
                <Moon className="size-4" />
                <span>Escuro</span>
              </button>
            </div>

            <DropdownMenuSeparator className="my-2" />

            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Família da Fonte (Google)
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={settings.font}
              onValueChange={(val) => onChangeSettings({ font: val as ReadingFont })}
              className="space-y-1 py-1"
            >
              {READING_FONTS.map((font) => (
                <DropdownMenuRadioItem
                  key={font.id}
                  value={font.id}
                  className={cn(
                    "cursor-pointer rounded-lg px-2.5 py-1.5 transition-colors flex flex-col items-start gap-0.5",
                    font.fontClass
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-sm font-semibold tracking-tight">{font.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-sans font-normal border border-border/50">
                      {font.category}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-normal leading-snug font-sans">
                    {font.description}
                  </span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>

            <DropdownMenuSeparator className="my-2" />

            <div className="space-y-2 py-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                <span>Tamanho da Fonte</span>
                <span>{settings.fontSize}px</span>
              </div>
              <Slider
                value={[settings.fontSize]}
                min={13}
                max={26}
                step={1}
                onValueChange={(val) => onChangeSettings({ fontSize: val[0] })}
              />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Botão de Tela Cheia */}
        {onToggleFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            title={isFullscreen ? "Sair da Tela Cheia" : "Modo Tela Cheia"}
            aria-label={isFullscreen ? "Sair da Tela Cheia" : "Modo Tela Cheia"}
            className="flex items-center justify-center size-8 rounded-full bg-background/80 hover:bg-secondary border border-border transition-colors text-foreground"
          >
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
