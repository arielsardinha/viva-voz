"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  Bookmark,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Highlighter,
  Loader2,
  Mic,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Sparkles,
} from "lucide-react";
import type { Sentence } from "@/lib/pdf-text";
import { cn } from "@/lib/utils";
import { TextSelectionMenu } from "../ui/text-selection-menu";
import { PagesDrawer } from "../ui/pages-drawer";
import { GeminiKeyDialog } from "../gemini-key-dialog";
import type { ReaderSettings } from "../ui/template-switcher";
import { getFontFamilyClass } from "@/context/reader-settings-context";
import { TTS_ENGINES, type TtsEngine, type VoiceOption } from "@/lib/tts-engines";
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
import { useGeminiApiKey } from "@/hooks/use-gemini-api-key";

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
  apiKey: propApiKey,
  onApiKeyChange: propOnApiKeyChange,
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
  const { apiKey: hookApiKey, updateApiKey: hookUpdateApiKey } = useGeminiApiKey();
  const apiKey = propApiKey !== undefined ? propApiKey : hookApiKey;
  const updateApiKey = propOnApiKeyChange || hookUpdateApiKey;

  const [geminiDialogOpen, setGeminiDialogOpen] = useState(false);
  const activeRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [highlightMode, setHighlightMode] = useState(true);

  const currentPage = sentences[currentIndex]?.page ?? 1;
  const totalPages = useMemo(() => {
    return sentences.reduce((max, s) => Math.max(max, s.page), 1);
  }, [sentences]);

  const currentVoiceObj = voices.find((v) => v.id === voice);
  const voiceLabel = currentVoiceObj?.label ?? "Voz Padrão";
  const engineLabel = TTS_ENGINES.find((e) => e.id === engine)?.label ?? "Sistema";
  const hasApiKey = Boolean(apiKey && apiKey.length >= 10);

  // Group pages for chapter navigation
  const pageList = useMemo(() => {
    const pages = new Set<number>();
    sentences.forEach((s) => pages.add(s.page));
    return Array.from(pages).sort((a, b) => a - b);
  }, [sentences]);

  const [showPagesDrawer, setShowPagesDrawer] = useState(false);

  // Overall reading progress
  const progressRatio = totalPages > 0 ? currentPage / totalPages : 0;
  const strokeDashoffset = 100 - progressRatio * 100;

  useEffect(() => {
    if (typeof activeRef.current?.scrollIntoView === "function") {
      activeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentIndex]);

  const jumpToPage = (pageNum: number) => {
    const firstSentenceOfPage = sentences.findIndex((s) => s.page === pageNum);
    if (firstSentenceOfPage !== -1) {
      onSelectSentence(firstSentenceOfPage);
    }
  };

  const handleSelectEngine = (nextEngine: TtsEngine) => {
    if (nextEngine === "google" && !hasApiKey) {
      onEngineChange("system");
      setGeminiDialogOpen(true);
      return;
    }
    onEngineChange(nextEngine);
  };

  // Font class based on settings
  const fontClass = getFontFamilyClass(settings.font);

  let lastRenderedPage = 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative mx-auto max-w-3xl px-3 sm:px-4 py-6 sm:py-12 transition-all duration-300 pb-36",
        fontClass
      )}
      data-reading-theme={settings.theme === "light" ? "sepia" : settings.theme}
    >
      {/* Diálogo de Chave Gemini para o Modo Zen */}
      <GeminiKeyDialog
        apiKey={apiKey}
        onChange={updateApiKey}
        open={geminiDialogOpen}
        onOpenChange={setGeminiDialogOpen}
        trigger={<span className="hidden" />}
      />

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
      <header className="mb-8 sm:mb-12 text-left sm:text-center border-b border-border/40 pb-6 sm:pb-8">
        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
          {title ?? "Leitura Imersiva"}
        </h1>
        <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-muted-foreground italic font-sans">
          Modo Focado & Leitura Imersiva • {totalPages} páginas
        </p>
      </header>

      {/* Conteúdo com Tipografia Arejada */}
      <main className="space-y-4 sm:space-y-6">
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
                  <div className="my-8 sm:my-10 text-center select-none font-sans">
                    <button
                      type="button"
                      onClick={() => setShowPagesDrawer(true)}
                      title="Abrir índice de páginas"
                      className="inline-block px-3 sm:px-4 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold tracking-widest text-muted-foreground hover:text-accent uppercase bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
                    >
                      Capítulo / Página {sentence.page}
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  ref={isActive ? activeRef : undefined}
                  onClick={() => onSelectSentence(sentence.index)}
                  className={cn(
                    "cursor-pointer rounded px-0.5 sm:px-1 text-left break-words whitespace-normal transition-all duration-200 inline",
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
      <div className="mt-12 sm:mt-16 flex flex-col items-center justify-center gap-2 select-none">
        <button
          type="button"
          onClick={() => setShowPagesDrawer(true)}
          title="Ver índice de páginas"
          className="relative flex size-16 sm:size-20 items-center justify-center cursor-pointer hover:scale-105 transition-transform"
        >
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
        </button>
        <button
          type="button"
          onClick={() => setShowPagesDrawer(true)}
          className="text-xs font-medium text-muted-foreground hover:text-accent font-sans transition-colors cursor-pointer"
        >
          Página {currentPage} de {totalPages} • <span className="underline decoration-dotted">Ver todas</span>
        </button>

        <div className="flex items-center gap-2 mt-1 sm:mt-2">
          <button
            type="button"
            onClick={() => currentPage > 1 && jumpToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-secondary/80 hover:bg-secondary text-foreground disabled:opacity-30 font-sans cursor-pointer"
          >
            <ChevronLeft className="size-3.5" /> Anterior
          </button>
          <button
            type="button"
            onClick={() => currentPage < totalPages && jumpToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-secondary/80 hover:bg-secondary text-foreground disabled:opacity-30 font-sans cursor-pointer"
          >
            Próxima <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Pílula de Ações Flutuante Zen (Sem som de foco, sem recomeçar, com avançar/voltar e ícone de som com IA) */}
      <div className="fixed bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 glass-panel flex items-center gap-1 sm:gap-1.5 rounded-full p-1.5 sm:p-2 shadow-2xl border border-border/80 font-sans max-w-[96vw]">
        {/* Índice de Páginas */}
        <button
          type="button"
          onClick={() => setShowPagesDrawer(true)}
          title="Índice de Páginas"
          aria-label="Índice de Páginas"
          className="flex size-8 sm:size-9 items-center justify-center rounded-full hover:bg-secondary text-foreground/80 transition-colors cursor-pointer"
        >
          <BookOpen className="size-3.5 sm:size-4" />
        </button>

        {/* Marcador */}
        <button
          type="button"
          onClick={() => setIsBookmarked(!isBookmarked)}
          title={isBookmarked ? "Marcado" : "Salvar marcador"}
          aria-label={isBookmarked ? "Marcado" : "Salvar marcador"}
          className={cn(
            "flex size-8 sm:size-9 items-center justify-center rounded-full transition-colors cursor-pointer",
            isBookmarked
              ? "bg-amber-500/20 text-amber-600 font-bold"
              : "hover:bg-secondary text-foreground/80"
          )}
        >
          <Bookmark className="size-3.5 sm:size-4" />
        </button>

        {/* Destaque de Texto */}
        <button
          type="button"
          onClick={() => setHighlightMode(!highlightMode)}
          title={highlightMode ? "Destaque de voz ativo" : "Destaque desligado"}
          aria-label={highlightMode ? "Destaque de voz ativo" : "Destaque desligado"}
          className={cn(
            "flex size-8 sm:size-9 items-center justify-center rounded-full transition-colors cursor-pointer",
            highlightMode
              ? "bg-accent/20 text-accent font-bold"
              : "hover:bg-secondary text-foreground/80"
          )}
        >
          <Highlighter className="size-3.5 sm:size-4" />
        </button>

        <div className="h-4 sm:h-5 w-px bg-border my-auto mx-0.5" />

        {/* Botão VOLTAR trecho */}
        <button
          type="button"
          onClick={onPrevious}
          disabled={currentIndex === 0}
          title="Voltar trecho"
          aria-label="Voltar trecho"
          className="flex size-8 sm:size-9 items-center justify-center rounded-full hover:bg-secondary text-foreground transition-colors disabled:opacity-30 cursor-pointer"
        >
          <SkipBack className="size-4" />
        </button>

        {/* Botão Play/Pause */}
        <button
          type="button"
          onClick={onToggle}
          aria-label={
            isBuffering
              ? "Carregando áudio..."
              : isPlaying
              ? "Pausar Narração"
              : "Iniciar Narração"
          }
          className="flex size-9 sm:size-10 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md hover:scale-105 active:scale-95 transition-transform cursor-pointer"
        >
          {isBuffering ? (
            <Loader2 className="size-4 sm:size-4.5 animate-spin" aria-hidden="true" />
          ) : isPlaying ? (
            <Pause className="size-4 sm:size-4.5" aria-hidden="true" />
          ) : (
            <Play className="size-4 sm:size-4.5 translate-x-0.5" aria-hidden="true" />
          )}
        </button>

        {/* Botão AVANÇAR trecho */}
        <button
          type="button"
          onClick={onNext}
          disabled={currentIndex >= sentences.length - 1}
          title="Avançar trecho"
          aria-label="Avançar trecho"
          className="flex size-8 sm:size-9 items-center justify-center rounded-full hover:bg-secondary text-foreground transition-colors disabled:opacity-30 cursor-pointer"
        >
          <SkipForward className="size-4" />
        </button>

        <div className="h-4 sm:h-5 w-px bg-border my-auto mx-0.5" />

        {/* Seletor de Voz / Motor */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title="Voz da narração"
              aria-label="Voz da narração"
              className="flex size-8 sm:size-9 items-center justify-center rounded-full hover:bg-secondary text-foreground/80 transition-colors cursor-pointer"
            >
              <Mic className="size-3.5 sm:size-4 text-accent" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-56 max-h-72 overflow-y-auto glass-panel">
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase">
              Motor ({engineLabel})
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={engine}
              onValueChange={(val) => handleSelectEngine(val as TtsEngine)}
            >
              {TTS_ENGINES.map((eng) => (
                <DropdownMenuRadioItem
                  key={eng.id}
                  value={eng.id}
                  disabled={disabledEngines.includes(eng.id)}
                  className="cursor-pointer text-xs"
                >
                  <div className="flex flex-col">
                    <span>{eng.label}</span>
                    <span className="text-[10px] text-muted-foreground">{eng.hint}</span>
                  </div>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>

            <DropdownMenuSeparator className="my-1.5" />
            <DropdownMenuItem
              onClick={() => setGeminiDialogOpen(true)}
              className="cursor-pointer text-xs flex items-center gap-1.5 text-accent font-medium"
            >
              <Sparkles className="size-3.5" />
              <span>{hasApiKey ? "Gerenciar chave Gemini" : "Conectar chave Gemini (IA)"}</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1.5" />
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase">
              Voz
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup value={voice} onValueChange={onVoiceChange}>
              {voices.map((v) => (
                <DropdownMenuRadioItem key={v.id} value={v.id} className="cursor-pointer text-xs">
                  {v.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Ícone para incluir SOM com IA / Enviar Token (caso desconectada ou gerenciar) */}
        <GeminiKeyDialog
          apiKey={apiKey}
          onChange={updateApiKey}
          variant="icon"
          className="size-8 sm:size-9"
        />
      </div>

      {/* Drawer de Páginas Overlay */}
      <PagesDrawer
        open={showPagesDrawer}
        onOpenChange={setShowPagesDrawer}
        currentPage={currentPage}
        totalPages={totalPages}
        pageList={pageList}
        onSelectPage={jumpToPage}
        sentences={sentences}
        title={title}
      />
    </div>
  );
}
