"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  List,
  Search,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { Sentence } from "@/lib/pdf-text";
import { cn } from "@/lib/utils";
import { FloatingAudioDock } from "../ui/floating-audio-dock";
import { TextSelectionMenu } from "../ui/text-selection-menu";
import type { ReaderSettings } from "../ui/template-switcher";
import type { TtsEngine, VoiceOption } from "@/lib/tts-engines";

interface ModernStudioTemplateProps {
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

export function ModernStudioTemplate({
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
}: ModernStudioTemplateProps) {
  const activeRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showChapters, setShowChapters] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);

  const currentPage = sentences[currentIndex]?.page ?? 1;
  const totalPages = useMemo(() => {
    return sentences.reduce((max, s) => Math.max(max, s.page), 1);
  }, [sentences]);

  // Group pages for chapter navigation
  const pageList = useMemo(() => {
    const pages = new Set<number>();
    sentences.forEach((s) => pages.add(s.page));
    return Array.from(pages).sort((a, b) => a - b);
  }, [sentences]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentIndex]);

  const jumpToPage = (pageNum: number) => {
    const firstSentenceOfPage = sentences.findIndex((s) => s.page === pageNum);
    if (firstSentenceOfPage !== -1) {
      onSelectSentence(firstSentenceOfPage);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) jumpToPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) jumpToPage(currentPage - 1);
  };

  // Font class based on settings
  const fontClass =
    settings.font === "serif"
      ? "font-serif"
      : settings.font === "mono"
        ? "font-mono"
        : "font-sans";

  let lastRenderedPage = 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative pb-32 transition-colors",
        fontClass
      )}
      data-reading-theme={settings.theme}
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

      {/* Barra de Ferramentas Superior do Leitor (Inspiração 01) */}
      <div className="glass-panel sticky top-2 z-30 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-2.5 shadow-sm border border-border/80">
        {/* Navegador de Páginas em Pílula */}
        <div className="flex items-center gap-1 bg-secondary/80 px-2 py-1 rounded-xl">
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            title="Página Anterior"
            className="flex size-7 items-center justify-center rounded-lg hover:bg-card text-foreground disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="size-4" />
          </button>

          <span className="px-2 text-xs font-semibold text-foreground">
            {currentPage} <span className="text-muted-foreground">/ {totalPages}</span>
          </span>

          <button
            type="button"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            title="Próxima Página"
            className="flex size-7 items-center justify-center rounded-lg hover:bg-card text-foreground disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* Busca dentro do documento */}
        <div className="relative flex-1 max-w-xs min-w-[140px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar no texto…"
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-background/90 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-accent text-foreground"
          />
        </div>

        {/* Zoom e Lista de Páginas */}
        <div className="flex items-center gap-1.5">
          <div className="hidden sm:flex items-center gap-1 bg-secondary/80 px-1 py-0.5 rounded-xl">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(80, z - 10))}
              title="Diminuir Zoom"
              className="flex size-7 items-center justify-center rounded-lg hover:bg-card text-foreground transition-colors"
            >
              <ZoomOut className="size-3.5" />
            </button>
            <span className="px-1 text-xs font-medium text-muted-foreground">{zoomLevel}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(140, z + 10))}
              title="Aumentar Zoom"
              className="flex size-7 items-center justify-center rounded-lg hover:bg-card text-foreground transition-colors"
            >
              <ZoomIn className="size-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowChapters((prev) => !prev)}
            title="Índice de Páginas"
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors",
              showChapters
                ? "bg-accent text-accent-foreground border-accent"
                : "bg-background/80 text-foreground hover:bg-secondary border-border"
            )}
          >
            <List className="size-3.5" />
            <span className="hidden sm:inline">Páginas</span>
          </button>
        </div>
      </div>

      {/* Layout de Leitura Principal com Gaveta de Páginas Opcional */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
        {/* Folha do Documento Clean */}
        <div className="glass-panel min-w-0 rounded-3xl p-6 sm:p-10 shadow-sm border border-border/80">
          <div
            style={{
              fontSize: `${(settings.fontSize * (zoomLevel / 100)).toFixed(1)}px`,
              lineHeight: settings.lineHeight || 1.8,
            }}
            className="text-foreground transition-all duration-150"
          >
            {sentences.map((sentence) => {
              const isActive = sentence.index === currentIndex;
              const isRead = sentence.index < currentIndex;
              const showPageMark = sentence.page !== lastRenderedPage;
              lastRenderedPage = sentence.page;

              const matchesSearch =
                searchQuery.trim() !== "" &&
                sentence.text.toLowerCase().includes(searchQuery.toLowerCase());

              return (
                <span key={sentence.index}>
                  {showPageMark && (
                    <span className="my-8 flex items-center gap-4 text-xs font-bold tracking-widest text-muted-foreground/80 uppercase">
                      <span className="h-px flex-1 bg-border/80" />
                      <span className="bg-secondary/70 px-3 py-1 rounded-full">
                        Página {sentence.page}
                      </span>
                      <span className="h-px flex-1 bg-border/80" />
                    </span>
                  )}
                  <button
                    type="button"
                    ref={isActive ? activeRef : undefined}
                    onClick={() => onSelectSentence(sentence.index)}
                    className={cn(
                      "cursor-pointer rounded px-1 text-left break-words whitespace-normal transition-all duration-200 inline",
                      isActive && "sentence-highlight-active font-medium text-foreground",
                      !isActive && isRead && "text-muted-foreground hover:bg-accent/10 hover:text-foreground",
                      !isActive && !isRead && "text-foreground hover:bg-accent/10",
                      matchesSearch && "bg-amber-400/40 ring-1 ring-amber-400"
                    )}
                  >
                    {sentence.text}
                  </button>{" "}
                </span>
              );
            })}
          </div>
        </div>

        {/* Sidebar / Miniatura de Páginas (Estilo Inspiração 01) */}
        {showChapters && (
          <aside className="glass-panel w-full lg:w-56 h-[70vh] overflow-y-auto rounded-3xl p-4 border border-border/80 animate-in slide-in-from-right-4 duration-200">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <BookOpen className="size-3.5 text-accent" />
                Páginas
              </h3>
              <span className="text-xs font-semibold text-muted-foreground">
                {totalPages} total
              </span>
            </div>
            <div className="grid grid-cols-4 lg:grid-cols-2 gap-2">
              {pageList.map((p) => {
                const isCurrent = p === currentPage;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => jumpToPage(p)}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-2xl text-xs font-semibold transition-all border",
                      isCurrent
                        ? "bg-accent text-accent-foreground border-accent shadow-sm scale-105"
                        : "bg-background/60 hover:bg-secondary border-border text-foreground"
                    )}
                  >
                    <span>Pág.</span>
                    <span className="text-sm font-bold">{p}</span>
                  </button>
                );
              })}
            </div>
          </aside>
        )}
      </div>

      {/* Player Flutuante Dock na Parte Inferior */}
      <FloatingAudioDock
        isPlaying={isPlaying}
        isBuffering={isBuffering}
        currentIndex={currentIndex}
        total={sentences.length}
        title={title}
        currentPage={currentPage}
        voice={voice}
        speed={speed}
        engine={engine}
        voices={voices}
        disabledEngines={disabledEngines}
        onEngineChange={onEngineChange}
        onToggle={onToggle}
        onPrevious={onPrevious}
        onNext={onNext}
        onRestart={onRestart}
        onVoiceChange={onVoiceChange}
        onSpeedChange={onSpeedChange}
      />
    </div>
  );
}
