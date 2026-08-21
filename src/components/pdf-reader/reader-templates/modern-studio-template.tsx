"use client";

import { useRef, useState, useMemo } from "react";
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
import { HighlightedSentenceText } from "../ui/highlighted-sentence-text";
import type { HighlightColor, TextHighlight } from "@/lib/domain/document-highlight.types";
import { PagesDrawer } from "../ui/pages-drawer";
import type { ReaderSettings } from "../ui/template-switcher";
import { getFontFamilyClass } from "@/context/reader-settings-context";
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
  apiKey?: string | null;
  onApiKeyChange?: (key: string | null) => void;
  onEngineChange: (engine: TtsEngine) => void;
  onSelectSentence: (index: number) => void;
  onToggle: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onRestart: () => void;
  onVoiceChange: (voice: string) => void;
  onSpeedChange: (speed: string) => void;
  onAskAI?: (prompt: string) => void;
  getHighlightsForSentence?: (index: number) => TextHighlight[];
  onHighlight?: (color: HighlightColor, text: string, container?: HTMLElement | null) => void;
  onRemoveHighlight?: (text: string, container?: HTMLElement | null) => void;
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
  apiKey,
  onApiKeyChange,
  onEngineChange,
  onSelectSentence,
  onToggle,
  onPrevious,
  onNext,
  onRestart,
  onVoiceChange,
  onSpeedChange,
  onAskAI,
  getHighlightsForSentence,
  onHighlight,
  onRemoveHighlight,
}: ModernStudioTemplateProps) {
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
  const fontClass = getFontFamilyClass(settings.font);

  let lastRenderedPage = 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative pb-40 sm:pb-32 transition-colors",
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
        onHighlight={(color, text) => onHighlight?.(color, text, containerRef.current)}
        onRemoveHighlight={(text) => onRemoveHighlight?.(text, containerRef.current)}
      />

      {/* Barra de Ferramentas Superior do Leitor (Inspiração 01) */}
      <div className="glass-panel sticky top-2 z-30 mb-4 sm:mb-5 flex items-center justify-between gap-2 rounded-2xl p-2 sm:p-2.5 shadow-xs border border-border/80">
        {/* Navegador de Páginas em Pílula */}
        <div className="flex items-center gap-0.5 sm:gap-1 bg-secondary/80 px-1.5 sm:px-2 py-1 rounded-xl shrink-0">
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            title="Página Anterior"
            aria-label="Página Anterior"
            className="flex size-6 sm:size-7 items-center justify-center rounded-lg hover:bg-card text-foreground disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="size-3.5 sm:size-4" />
          </button>

          <span className="px-1.5 sm:px-2 text-xs font-semibold text-foreground whitespace-nowrap">
            {currentPage} <span className="text-muted-foreground">/ {totalPages}</span>
          </span>

          <button
            type="button"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            title="Próxima Página"
            aria-label="Próxima Página"
            className="flex size-6 sm:size-7 items-center justify-center rounded-lg hover:bg-card text-foreground disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="size-3.5 sm:size-4" />
          </button>
        </div>

        {/* Busca dentro do documento */}
        <div className="relative flex-1 max-w-[180px] sm:max-w-xs min-w-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar..."
            className="w-full pl-8 pr-2.5 py-1 text-xs bg-background/90 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-accent text-foreground"
          />
        </div>

        {/* Zoom e Lista de Páginas */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <div className="hidden md:flex items-center gap-1 bg-secondary/80 px-1 py-0.5 rounded-xl">
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
            onClick={() => setShowChapters(true)}
            title="Índice de Páginas"
            aria-label="Índice de Páginas"
            className={cn(
              "flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors cursor-pointer",
              showChapters
                ? "bg-accent text-accent-foreground border-accent"
                : "bg-background/80 text-foreground hover:bg-secondary border-border"
            )}
          >
            <List className="size-3.5" />
            <span>Páginas</span>
          </button>
        </div>
      </div>

      {/* Layout de Leitura Principal com Gaveta de Páginas Opcional */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
        {/* Folha do Documento Clean */}
        <div className="glass-panel min-w-0 rounded-2xl sm:rounded-3xl p-4 sm:p-8 md:p-10 shadow-xs border border-border/80 w-full">
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
                    <span className="my-6 sm:my-8 flex items-center gap-3 sm:gap-4 text-[11px] sm:text-xs font-bold tracking-widest text-muted-foreground/80 uppercase">
                      <span className="h-px flex-1 bg-border/80" />
                      <span className="bg-secondary/70 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full">
                        Página {sentence.page}
                      </span>
                      <span className="h-px flex-1 bg-border/80" />
                    </span>
                  )}
                  <button
                    type="button"
                    data-sentence-index={sentence.index}
                    onClick={() => onSelectSentence(sentence.index)}
                    className={cn(
                      "cursor-pointer rounded px-0.5 sm:px-1 text-left break-words whitespace-normal transition-all duration-200 inline",
                      isActive && "sentence-highlight-active font-medium text-foreground",
                      !isActive && isRead && "text-muted-foreground hover:bg-accent/10 hover:text-foreground",
                      !isActive && !isRead && "text-foreground hover:bg-accent/10",
                      matchesSearch && "bg-amber-400/40 ring-1 ring-amber-400"
                    )}
                  >
                    <HighlightedSentenceText
                      text={sentence.text}
                      highlights={getHighlightsForSentence?.(sentence.index) ?? []}
                    />
                  </button>{" "}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Drawer de Páginas Overlay (Mobile & Desktop) */}
      <PagesDrawer
        open={showChapters}
        onOpenChange={setShowChapters}
        currentPage={currentPage}
        totalPages={totalPages}
        pageList={pageList}
        onSelectPage={jumpToPage}
        sentences={sentences}
        title={title}
      />

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
        apiKey={apiKey}
        onApiKeyChange={onApiKeyChange}
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
