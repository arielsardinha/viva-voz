"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Highlighter,
  Pause,
  Play,
  RotateCcw,
  Volume2,
} from "lucide-react";
import type { Sentence } from "@/lib/pdf-text";
import { cn } from "@/lib/utils";
import { AmbientSoundPlayer } from "../ui/ambient-sound-player";
import { TextSelectionMenu } from "../ui/text-selection-menu";
import type { ReaderSettings } from "../ui/template-switcher";
import { getFontFamilyClass } from "@/context/reader-settings-context";
import type { TtsEngine, VoiceOption } from "@/lib/tts-engines";

interface ZenFocusTemplateProps {
  sentences: Sentence[];
  currentIndex: number;
  title: string | null;
  settings: ReaderSettings;
  isPlaying: boolean;
  isBuffering: boolean;
  voice: string;
  speed: string;
  engine: TtsEngine;
  voices: VoiceOption[];
  disabledEngines: TtsEngine[];
  onEngineChange: (engine: TtsEngine) => void;
  onSelectSentence: (index: number) => void;
  onToggle: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onRestart: () => void;
  onVoiceChange: (voice: string) => void;
  onSpeedChange: (speed: string) => void;
  onAskAI?: (prompt: string) => void;
}

export function ZenFocusTemplate({
  sentences,
  currentIndex,
  title,
  settings,
  isPlaying,
  isBuffering,
  voice,
  speed,
  engine,
  voices,
  disabledEngines,
  onEngineChange,
  onSelectSentence,
  onToggle,
  onPrevious,
  onNext,
  onRestart,
  onVoiceChange,
  onSpeedChange,
  onAskAI,
}: ZenFocusTemplateProps) {
  const activeRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [highlightMode, setHighlightMode] = useState(true);

  const currentPage = sentences[currentIndex]?.page ?? 1;
  const totalPages = useMemo(() => {
    return sentences.reduce((max, s) => Math.max(max, s.page), 1);
  }, [sentences]);

  // Overall reading progress
  const progressRatio = totalPages > 0 ? currentPage / totalPages : 0;
  const strokeDashoffset = 100 - progressRatio * 100;

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentIndex]);

  const jumpToPage = (pageNum: number) => {
    const firstSentenceOfPage = sentences.findIndex((s) => s.page === pageNum);
    if (firstSentenceOfPage !== -1) {
      onSelectSentence(firstSentenceOfPage);
    }
  };

  // Font class based on settings
  const fontClass = getFontFamilyClass(settings.font);

  let lastRenderedPage = 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative mx-auto max-w-3xl px-4 py-8 sm:py-12 transition-all duration-300 pb-36",
        fontClass
      )}
      data-reading-theme={settings.theme === "light" ? "sepia" : settings.theme}
    >
      {/* Menu flutuante de seleção de texto */}
      <TextSelectionMenu
        containerRef={containerRef}
        onAskAI={onAskAI}
        onSpeakSelection={(text) => {
          const matched = sentences.findIndex((s) => s.text.includes(text) || text.includes(s.text));
          if (matched !== -1) onSelectSentence(matched);
        }}
      />

      {/* Cabeçalho Editorial do Documento (Inspiração 04) */}
      <header className="mb-12 text-left sm:text-center border-b border-border/40 pb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
          {title ?? "Leitura Imersiva"}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground italic font-sans">
          Modo Focado & Som de Fundo • {totalPages} páginas
        </p>
      </header>

      {/* Conteúdo com Tipografia Arejada */}
      <main className="space-y-6">
        <div
          style={{
            fontSize: `${settings.fontSize + 1}px`,
            lineHeight: settings.lineHeight || 2.0,
          }}
          className="text-foreground transition-all duration-200 tracking-normal"
        >
          {sentences.map((sentence) => {
            const isActive = sentence.index === currentIndex;
            const isRead = sentence.index < currentIndex;
            const showPageMark = sentence.page !== lastRenderedPage;
            lastRenderedPage = sentence.page;

            return (
              <span key={sentence.index}>
                {showPageMark && (
                  <div className="my-10 text-center select-none font-sans">
                    <span className="inline-block px-4 py-1 rounded-full text-xs font-semibold tracking-widest text-muted-foreground uppercase bg-secondary/50">
                      Capítulo / Página {sentence.page}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  ref={isActive ? activeRef : undefined}
                  onClick={() => onSelectSentence(sentence.index)}
                  className={cn(
                    "cursor-pointer rounded px-1 text-left break-words whitespace-normal transition-all duration-200 inline",
                    isActive && highlightMode && "sentence-highlight-active font-medium text-foreground",
                    !isActive && isRead && "text-muted-foreground/80 hover:text-foreground",
                    !isActive && !isRead && "text-foreground hover:bg-accent/10"
                  )}
                >
                  {sentence.text}
                </button>{" "}
              </span>
            );
          })}
        </div>
      </main>

      {/* Indicador Circular de Progresso da Página (Inspiração 04) */}
      <div className="mt-16 flex flex-col items-center justify-center gap-2 select-none">
        <div className="relative flex size-20 items-center justify-center">
          <svg className="size-full -rotate-90" viewBox="0 0 36 36">
            {/* Background Circle */}
            <path
              className="stroke-secondary"
              strokeWidth="3"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            {/* Progress Circle */}
            <path
              className="stroke-accent transition-all duration-500"
              strokeDasharray="100, 100"
              strokeDashoffset={strokeDashoffset}
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-xs font-bold text-foreground">{Math.round(progressRatio * 100)}%</span>
          </div>
        </div>
        <p className="text-xs font-medium text-muted-foreground font-sans">
          Página {currentPage} de {totalPages}
        </p>

        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={() => currentPage > 1 && jumpToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-secondary/80 hover:bg-secondary text-foreground disabled:opacity-30 font-sans"
          >
            <ChevronLeft className="size-3.5" /> Anterior
          </button>
          <button
            type="button"
            onClick={() => currentPage < totalPages && jumpToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-secondary/80 hover:bg-secondary text-foreground disabled:opacity-30 font-sans"
          >
            Próxima <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Pílula de Ações Flutuante Zen (Inspiração 04) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 glass-panel flex items-center gap-2 rounded-full p-2 shadow-xl border border-border/80 font-sans">
        <button
          type="button"
          onClick={() => setIsBookmarked(!isBookmarked)}
          title={isBookmarked ? "Marcado" : "Salvar marcador"}
          className={cn(
            "flex size-10 items-center justify-center rounded-full transition-colors",
            isBookmarked
              ? "bg-amber-500/20 text-amber-600 font-bold"
              : "hover:bg-secondary text-foreground/80"
          )}
        >
          <Bookmark className="size-4" />
        </button>

        <button
          type="button"
          onClick={() => setHighlightMode(!highlightMode)}
          title={highlightMode ? "Destaque de voz ativo" : "Destaque desligado"}
          className={cn(
            "flex size-10 items-center justify-center rounded-full transition-colors",
            highlightMode
              ? "bg-accent/20 text-accent font-bold"
              : "hover:bg-secondary text-foreground/80"
          )}
        >
          <Highlighter className="size-4" />
        </button>

        <button
          type="button"
          onClick={onToggle}
          aria-label={isPlaying ? "Pausar Narração" : "Iniciar Narração"}
          className="flex size-11 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md hover:scale-105 active:scale-95 transition-transform"
        >
          {isPlaying ? <Pause className="size-5" /> : <Play className="size-5 translate-x-0.5" />}
        </button>

        <button
          type="button"
          onClick={onRestart}
          title="Reiniciar Narração"
          className="flex size-10 items-center justify-center rounded-full hover:bg-secondary text-foreground/80 transition-colors"
        >
          <RotateCcw className="size-4" />
        </button>

        <div className="h-6 w-px bg-border my-auto mx-1" />

        {/* Gerador de Som Ambiente */}
        <AmbientSoundPlayer />
      </div>
    </div>
  );
}
