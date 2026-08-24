"use client";

import { useRef, useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  List,
  Search,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { Sentence } from "@/lib/pdf-text";
import { cn } from "@/lib/utils";
import { FloatingAudioDock } from "../ui/floating-audio-dock";
import { TextSelectionMenu } from "../ui/text-selection-menu";
import { HighlightedSentenceText } from "../ui/highlighted-sentence-text";
import type { HighlightColor, TextHighlight } from "@/lib/domain/document-highlight.types";
import type { DocumentNote } from "@/lib/domain/document-note.types";
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
  getNotesForSentence?: (index: number) => DocumentNote[];
  onAddNote?: (text: string, sentenceIndex: number, page?: number) => void;
  onOpenNote?: (note: DocumentNote) => void;
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
  getNotesForSentence,
  onAddNote,
  onOpenNote,
}: ModernStudioTemplateProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMatchIndex, setActiveMatchIndex] = useState(-1);
  const [showChapters, setShowChapters] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);

  const currentPage = sentences[currentIndex]?.page ?? 1;
  const totalPages = useMemo(() => {
    return sentences.reduce((max, s) => Math.max(max, s.page), 1);
  }, [sentences]);

  // Lista de índices de sentenças que correspondem à busca
  const matchedIndices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    return sentences
      .filter((s) => s.text.toLowerCase().includes(query))
      .map((s) => s.index);
  }, [sentences, searchQuery]);

  // Executa scrollIntoView suave até o elemento da sentença
  const scrollToSentence = (sentenceIndex: number) => {
    if (!containerRef.current) return;
    const el = containerRef.current.querySelector<HTMLElement>(
      `[data-sentence-index="${sentenceIndex}"]`
    );
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // Atualização do termo de busca com auto-scroll para o primeiro resultado
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    const query = val.trim().toLowerCase();
    if (!query) {
      setActiveMatchIndex(-1);
      return;
    }
    const matches = sentences
      .filter((s) => s.text.toLowerCase().includes(query))
      .map((s) => s.index);

    if (matches.length > 0) {
      setActiveMatchIndex(0);
      scrollToSentence(matches[0]);
    } else {
      setActiveMatchIndex(-1);
    }
  };

  // Navega para a próxima ocorrência (descer)
  const handleNextMatch = () => {
    if (matchedIndices.length === 0) return;
    const nextIndex = (activeMatchIndex + 1) % matchedIndices.length;
    setActiveMatchIndex(nextIndex);
    scrollToSentence(matchedIndices[nextIndex]);
  };

  // Navega para a ocorrência anterior (subir)
  const handlePrevMatch = () => {
    if (matchedIndices.length === 0) return;
    const prevIndex = (activeMatchIndex - 1 + matchedIndices.length) % matchedIndices.length;
    setActiveMatchIndex(prevIndex);
    scrollToSentence(matchedIndices[prevIndex]);
  };

  // Limpa o termo de busca
  const handleClearSearch = () => {
    setSearchQuery("");
    setActiveMatchIndex(-1);
    searchInputRef.current?.focus();
  };

  // Atalhos de teclado no campo de busca (Enter / Shift+Enter / Esc)
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        handlePrevMatch();
      } else {
        handleNextMatch();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleClearSearch();
    }
  };

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
        onAddNote={(text) => {
          const matched = sentences.find((s) => s.text.includes(text) || text.includes(s.text)) || sentences[currentIndex];
          onAddNote?.(text, matched ? matched.index : currentIndex, matched?.page);
        }}
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

        {/* Busca dentro do documento com navegação Ctrl+F */}
        <div className="relative flex-1 min-w-0 max-w-[200px] sm:max-w-xs md:max-w-sm">
          <div className="relative flex items-center bg-background/90 border border-border rounded-xl focus-within:ring-1 focus-within:ring-accent transition-all">
            <Search className="absolute left-2.5 size-3.5 text-muted-foreground pointer-events-none shrink-0" />
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Buscar..."
              aria-label="Buscar no documento"
              data-webmcp-tool="searchInDocument"
              className="w-full pl-8 pr-1.5 py-1 text-xs bg-transparent border-0 focus:outline-none text-foreground placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
            />
            {searchQuery.trim().length > 0 && (
              <div className="flex items-center gap-0.5 pr-1.5 shrink-0 animate-in fade-in duration-150">
                <span
                  className="px-1 text-[10px] font-semibold text-muted-foreground tabular-nums select-none"
                  aria-live="polite"
                >
                  {matchedIndices.length > 0 ? `${activeMatchIndex + 1}/${matchedIndices.length}` : "0/0"}
                </span>

                <button
                  type="button"
                  onClick={handlePrevMatch}
                  disabled={matchedIndices.length === 0}
                  aria-label="Ocorrência anterior"
                  title="Ocorrência anterior (Shift+Enter)"
                  className="flex size-5 sm:size-5.5 items-center justify-center rounded-md hover:bg-secondary text-foreground disabled:opacity-30 transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronUp className="size-3 sm:size-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleNextMatch}
                  disabled={matchedIndices.length === 0}
                  aria-label="Próxima ocorrência"
                  title="Próxima ocorrência (Enter)"
                  className="flex size-5 sm:size-5.5 items-center justify-center rounded-md hover:bg-secondary text-foreground disabled:opacity-30 transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronDown className="size-3 sm:size-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleClearSearch}
                  aria-label="Limpar busca"
                  title="Limpar busca (Esc)"
                  className="flex size-5 sm:size-5.5 items-center justify-center rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="size-3 sm:size-3.5" />
                </button>
              </div>
            )}
          </div>
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

              const isMatched =
                searchQuery.trim() !== "" &&
                sentence.text.toLowerCase().includes(searchQuery.trim().toLowerCase());
              const isCurrentMatch =
                isMatched &&
                activeMatchIndex >= 0 &&
                matchedIndices[activeMatchIndex] === sentence.index;

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
                    data-search-match={isMatched ? "true" : undefined}
                    data-search-active={isCurrentMatch ? "true" : undefined}
                    onClick={() => onSelectSentence(sentence.index)}
                    className={cn(
                      "cursor-pointer rounded px-0.5 sm:px-1 text-left break-words whitespace-normal transition-all duration-200 inline",
                      isActive && "sentence-highlight-active font-medium text-foreground",
                      !isActive && isRead && "text-muted-foreground hover:bg-accent/10 hover:text-foreground",
                      !isActive && !isRead && "text-foreground hover:bg-accent/10",
                      isMatched && !isCurrentMatch && "bg-amber-400/30 ring-1 ring-amber-400/50 text-foreground",
                      isCurrentMatch && "bg-amber-400 text-amber-950 font-semibold ring-2 ring-amber-500 shadow-xs dark:bg-amber-400 dark:text-amber-950"
                    )}
                  >
                    <HighlightedSentenceText
                      text={sentence.text}
                      highlights={getHighlightsForSentence?.(sentence.index) ?? []}
                      notes={getNotesForSentence?.(sentence.index) ?? []}
                      onOpenNote={onOpenNote}
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
