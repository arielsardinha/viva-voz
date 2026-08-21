"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  BotMessageSquare,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Key,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import type { Sentence } from "@/lib/pdf-text";
import { cn } from "@/lib/utils";
import { TextSelectionMenu } from "../ui/text-selection-menu";
import { WaveformVisualizer } from "../ui/waveform-visualizer";
import { GeminiKeyDialog } from "../gemini-key-dialog";
import { PagesDrawer } from "../ui/pages-drawer";
import type { ReaderSettings } from "../ui/template-switcher";
import { getFontFamilyClass } from "@/context/reader-settings-context";
import type { TtsEngine, VoiceOption } from "@/lib/tts-engines";

const STORAGE_KEY = "gemini-api-key";

interface AIStudyTemplateProps {
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
  initialPrompt?: string;
}

export function AIStudyTemplate({
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
  initialPrompt,
}: AIStudyTemplateProps) {
  const activeRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [input, setInput] = useState("");

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

  const [showPagesDrawer, setShowPagesDrawer] = useState(false);

  useEffect(() => {
    setApiKey(window.localStorage.getItem(STORAGE_KEY));
  }, []);

  const updateApiKey = useCallback((key: string | null) => {
    setApiKey(key);
    if (key) window.localStorage.setItem(STORAGE_KEY, key);
    else window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentIndex]);

  const context = useMemo(
    () => sentences.map((s) => `[p.${s.page}] ${s.text}`).join("\n"),
    [sentences]
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/ask",
        body: () => ({ context, fileName: title, userApiKey: apiKey }),
      }),
    [context, title, apiKey]
  );

  const { messages, sendMessage, status } = useChat({
    transport,
    onError: (error) => toast.error(error.message || "Não foi possível consultar a IA."),
  });

  const isLoadingAI = status === "submitted" || status === "streaming";

  // Auto scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, status]);

  const [mobileTab, setMobileTab] = useState<"doc" | "chat">("doc");

  const handleSendPrompt = (promptText: string) => {
    const clean = promptText.trim();
    if (!clean || isLoadingAI) return;
    setInput("");
    setMobileTab("chat");
    void sendMessage({ text: clean });
  };

  // Quick Action Prompts
  const quickPrompts = [
    `Resumir página ${currentPage}`,
    "Pontos principais do documento",
    "Explicar conceitos-chave",
    "Perguntas de fixação",
  ];

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
      className={cn("flex flex-col lg:grid lg:grid-cols-12 gap-4 sm:gap-5 min-h-[calc(100vh-10rem)]", fontClass)}
      data-reading-theme={settings.theme}
    >
      {/* Menu flutuante de seleção de texto */}
      <TextSelectionMenu
        containerRef={containerRef}
        onAskAI={(prompt) => handleSendPrompt(prompt)}
        onSpeakSelection={(text) => {
          const matched = sentences.findIndex((s) => s.text.includes(text) || text.includes(s.text));
          if (matched !== -1) onSelectSentence(matched);
        }}
      />

      {/* Seletor de Abas Mobile (< lg) */}
      <div className="flex lg:hidden items-center p-1 bg-secondary/80 rounded-2xl border border-border/60">
        <button
          type="button"
          onClick={() => setMobileTab("doc")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition-all",
            mobileTab === "doc"
              ? "bg-card text-foreground shadow-xs ring-1 ring-border"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Headphones className="size-3.5" />
          <span>Documento & Áudio</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab("chat")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition-all relative",
            mobileTab === "chat"
              ? "bg-card text-accent shadow-xs ring-1 ring-border"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Sparkles className="size-3.5 text-accent" />
          <span>Assistente IA</span>
          {messages.length > 0 && (
            <span className="size-2 rounded-full bg-accent" />
          )}
        </button>
      </div>

      {/* Painel Esquerdo: Leitor do Documento (7 Colunas no Desktop) */}
      <div
        className={cn(
          "lg:col-span-7 flex flex-col gap-3 sm:gap-4",
          mobileTab !== "doc" && "hidden lg:flex"
        )}
      >
        {/* Barra Compacta do Leitor */}
        <div className="glass-panel flex items-center justify-between gap-2 rounded-2xl p-2 sm:p-2.5 shadow-xs border border-border/80">
          <div className="flex items-center gap-0.5 sm:gap-1 bg-secondary/80 px-1.5 sm:px-2 py-1 rounded-xl">
            <button
              type="button"
              onClick={() => currentPage > 1 && jumpToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              aria-label="Página anterior"
              className="flex size-6 sm:size-7 items-center justify-center rounded-lg hover:bg-card text-foreground disabled:opacity-30"
            >
              <ChevronLeft className="size-3.5 sm:size-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowPagesDrawer(true)}
              title="Abrir índice de páginas"
              aria-label="Abrir índice de páginas"
              className="px-1.5 sm:px-2 text-xs font-semibold text-foreground whitespace-nowrap hover:text-accent cursor-pointer transition-colors rounded hover:bg-card/50"
            >
              Pág. {currentPage} / {totalPages}
            </button>
            <button
              type="button"
              onClick={() => currentPage < totalPages && jumpToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              aria-label="Próxima página"
              className="flex size-6 sm:size-7 items-center justify-center rounded-lg hover:bg-card text-foreground disabled:opacity-30"
            >
              <ChevronRight className="size-3.5 sm:size-4" />
            </button>
          </div>

          {/* Mini Player Control */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={onRestart}
              className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title="Reiniciar"
              aria-label="Reiniciar"
            >
              <RotateCcw className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={onToggle}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold shadow-xs hover:opacity-90 transition-transform active:scale-95"
            >
              {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              <span>{isPlaying ? "Pausar" : "Ouvir"}</span>
            </button>
            <div className="w-16 hidden sm:block">
              <WaveformVisualizer isPlaying={isPlaying} barCount={12} className="h-6 px-0" />
            </div>
          </div>
        </div>

        {/* Visualizador de Texto */}
        <div className="glass-panel flex-1 rounded-2xl sm:rounded-3xl p-4 sm:p-8 h-[calc(100vh-14rem)] overflow-y-auto shadow-xs border border-border/80">
          <div
            style={{
              fontSize: `${settings.fontSize}px`,
              lineHeight: settings.lineHeight || 1.8,
            }}
            className="text-foreground"
          >
            {sentences.map((sentence) => {
              const isActive = sentence.index === currentIndex;
              const isRead = sentence.index < currentIndex;
              const showPageMark = sentence.page !== lastRenderedPage;
              lastRenderedPage = sentence.page;

              return (
                <span key={sentence.index}>
                  {showPageMark && (
                    <span className="my-5 sm:my-6 flex items-center gap-3 text-[11px] sm:text-xs font-bold tracking-wider text-muted-foreground/70 uppercase">
                      <span className="h-px flex-1 bg-border/80" />
                      Pág. {sentence.page}
                      <span className="h-px flex-1 bg-border/80" />
                    </span>
                  )}
                  <button
                    type="button"
                    ref={isActive ? activeRef : undefined}
                    onClick={() => onSelectSentence(sentence.index)}
                    className={cn(
                      "cursor-pointer rounded px-0.5 sm:px-1 text-left break-words whitespace-normal transition-all duration-200 inline",
                      isActive && "sentence-highlight-active font-medium text-foreground",
                      !isActive && isRead && "text-muted-foreground hover:bg-accent/10",
                      !isActive && !isRead && "text-foreground hover:bg-accent/10"
                    )}
                  >
                    {sentence.text}
                  </button>{" "}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Painel Direito: Assistente de IA de Estudos (5 Colunas no Desktop) */}
      <div
        className={cn(
          "lg:col-span-5 glass-panel flex flex-col rounded-2xl sm:rounded-3xl overflow-hidden h-[calc(100vh-12rem)] lg:h-[calc(100vh-10rem)] border border-border/80 shadow-md",
          mobileTab !== "chat" && "hidden lg:flex"
        )}
      >
        {/* Header do Chat com IA */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-border bg-card/60">
          <div className="flex items-center gap-2">
            <div className="flex size-7 sm:size-8 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Sparkles className="size-3.5 sm:size-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">AI Study Assistant</h3>
              <p className="text-[10px] text-muted-foreground">Pergunte e analise o documento</p>
            </div>
          </div>
          <GeminiKeyDialog apiKey={apiKey} onChange={updateApiKey} compact />
        </div>

        {/* Histórico de Mensagens */}
        <div
          ref={chatScrollRef}
          className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5 text-xs scroll-smooth"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 text-muted-foreground">
              <BotMessageSquare className="size-10 text-accent/50 mb-2 stroke-1" />
              <p className="font-semibold text-foreground text-sm">Pronto para tirar dúvidas</p>
              <p className="text-xs max-w-xs mt-1">
                Selecione qualquer trecho no texto para resumir, ou use as sugestões rápidas abaixo.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isUser = m.role === "user";
              const text = m.parts
                .map((part) => (part.type === "text" ? part.text : ""))
                .join("");

              return (
                <div
                  key={m.id}
                  className={cn("flex flex-col gap-1 max-w-[92%] sm:max-w-[90%]", isUser ? "ml-auto items-end" : "mr-auto items-start")}
                >
                  <div
                    className={cn(
                      "p-3 rounded-2xl leading-relaxed whitespace-pre-wrap",
                      isUser
                        ? "bg-accent text-accent-foreground rounded-br-none shadow-xs"
                        : "bg-secondary/90 text-secondary-foreground rounded-bl-none border border-border/80 shadow-xs"
                    )}
                  >
                    {text}
                  </div>
                  <span className="text-[10px] text-muted-foreground px-1">
                    {isUser ? "Você" : "VivaVoz AI"}
                  </span>
                </div>
              );
            })
          )}

          {isLoadingAI && (
            <div className="flex items-center gap-2 text-muted-foreground text-xs p-2">
              <span className="size-2 rounded-full bg-accent animate-ping" />
              <span>Analisando o documento…</span>
            </div>
          )}
        </div>

        {/* Chips de Ações Rápidas */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-t border-border/60 bg-secondary/40 overflow-x-auto no-scrollbar">
          {quickPrompts.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => handleSendPrompt(q)}
              disabled={isLoadingAI}
              className="text-[10px] sm:text-[11px] font-medium px-2.5 py-1 rounded-full bg-card hover:bg-accent/15 hover:text-accent border border-border text-foreground/80 transition-colors disabled:opacity-50 shrink-0"
            >
              ✨ {q}
            </button>
          ))}
        </div>

        {/* Input de Pergunta */}
        <div className="p-2.5 sm:p-3 border-t border-border bg-card/80">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendPrompt(input);
            }}
            className="flex items-center gap-1.5 sm:gap-2"
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendPrompt(input);
                }
              }}
              placeholder="Pergunte sobre o documento..."
              className="flex-1 min-h-[36px] max-h-24 resize-none rounded-xl border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent text-foreground"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoadingAI}
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-40 shadow-xs"
              aria-label="Enviar pergunta"
            >
              <Send className="size-4" />
            </button>
          </form>
          <p className="text-[10px] text-muted-foreground mt-1 text-center">
            {apiKey ? "Chave Gemini conectada" : "Usando IA integrada"}
          </p>
        </div>
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
