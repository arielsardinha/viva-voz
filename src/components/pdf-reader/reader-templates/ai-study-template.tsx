"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  AudioLines,
  BotMessageSquare,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Image as ImageIcon,
  List,
  Play,
  ArrowUp,
  Sparkles,
} from "lucide-react";
import type { Sentence } from "@/lib/pdf-text";
import { cn } from "@/lib/utils";
import type { ChatAttachment } from "@/lib/local-ai/domain/local-model.types";
import { ChatMultimodalBar } from "@/components/local-ai/chat-multimodal-bar";
import { FloatingAudioDock } from "../ui/floating-audio-dock";
import { QuickPromptsBar } from "../ui/quick-prompts-bar";
import { TextSelectionMenu } from "../ui/text-selection-menu";
import { HighlightedSentenceText } from "../ui/highlighted-sentence-text";
import type { HighlightColor, TextHighlight } from "@/lib/domain/document-highlight.types";
import type { DocumentNote } from "@/lib/domain/document-note.types";
import { GeminiKeyDialog } from "../gemini-key-dialog";
import { ChromeAiBadge } from "../chrome-ai-badge";
import { PagesDrawer } from "../ui/pages-drawer";
import type { ReaderSettings } from "../ui/template-switcher";
import { getFontFamilyClass } from "@/context/reader-settings-context";
import type { TtsEngine, VoiceOption } from "@/lib/tts-engines";
import type { ActiveTtsModelInfo } from "@/lib/tts-models";
import { useFirebaseAI } from "@/hooks/useFirebaseAI";
import { useA2uiQuiz } from "@/hooks/use-a2ui-quiz";
import type { A2UIQuizQuestion } from "@/lib/a2ui/a2ui-quiz.types";
import { A2UIQuizSurface } from "../a2ui/a2ui-quiz-surface";
import { A2UISuggestCard } from "../a2ui/a2ui-suggest-card";
import { InlineVoiceReply } from "../ui/inline-voice-reply";

type AssistantMode = "chat" | "simplify" | "quiz" | "summary";

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
  activeTtsModel?: ActiveTtsModelInfo | null;
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
  initialPrompt?: string;
  getHighlightsForSentence?: (index: number) => TextHighlight[];
  onHighlight?: (color: HighlightColor, text: string, container?: HTMLElement | null) => void;
  onRemoveHighlight?: (text: string, container?: HTMLElement | null) => void;
  getNotesForSentence?: (index: number) => DocumentNote[];
  onAddNote?: (text: string, sentenceIndex: number, page?: number) => void;
  onOpenNote?: (note: DocumentNote) => void;
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
  activeTtsModel = null,
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
  initialPrompt: _initialPrompt,
  getHighlightsForSentence,
  onHighlight,
  onRemoveHighlight,
  getNotesForSentence,
  onAddNote,
  onOpenNote,
}: AIStudyTemplateProps) {
  const {
    messages,
    sendPrompt,
    sendMessage,
    isLoading: isLoadingAI,
    status,
    activeEngine,
    apiKey,
    setApiKey,
  } = useFirebaseAI({ initialApiKey: propApiKey || undefined });

  const effectiveApiKey = propApiKey ?? apiKey ?? null;
  const updateApiKey = (key: string | null) => {
    if (propOnApiKeyChange) {
      propOnApiKeyChange(key);
    } else {
      setApiKey(key || "");
    }
  };
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentSentence = sentences[currentIndex];
  const currentPage = currentSentence?.page ?? 1;

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

  const context = useMemo(
    () => sentences.map((s) => `[p.${s.page}] ${s.text}`).join("\n"),
    [sentences]
  );

  // Auto scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, status]);

  const [mobileTab, setMobileTab] = useState<"doc" | "chat">("doc");
  const [assistantMode, setAssistantMode] = useState<AssistantMode>("chat");
  const [pausedBySymbiosis, setPausedBySymbiosis] = useState(false);

  const quiz = useA2uiQuiz({
    sentences,
    currentIndex,
    title,
    activeEngine,
    apiKey,
    sendMessage,
  });

  const prevIsPlayingRef = useRef(isPlaying);
  useEffect(() => {
    if (!prevIsPlayingRef.current && isPlaying && pausedBySymbiosis) {
      setPausedBySymbiosis(false);
    }
    prevIsPlayingRef.current = isPlaying;
  }, [isPlaying, pausedBySymbiosis]);

  const scrollToSentence = (sentenceIndex: number) => {
    const el = containerRef.current?.querySelector<HTMLElement>(
      `[data-sentence-index="${sentenceIndex}"]`,
    );
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const pauseForSymbiosisIfNeeded = () => {
    if (isPlaying) {
      onToggle();
      setPausedBySymbiosis(true);
    }
  };

  const handleOpenQuiz = () => {
    pauseForSymbiosisIfNeeded();
    setAssistantMode("quiz");
    setMobileTab("chat");
    void quiz.ensureQuizReady();
  };

  const handleSaveQuizCard = (question: A2UIQuizQuestion) => {
    const target = sentences[question.sentenceIndex];
    onAddNote?.(question.evidenceQuote, question.sentenceIndex, target?.page);
  };

  const handleSendPrompt = (promptText: string) => {
    const clean = promptText.trim();
    if ((!clean && attachments.length === 0) || isLoadingAI) return;
    pauseForSymbiosisIfNeeded();
    const currentAttachments = attachments;
    setInput("");
    setAttachments([]);
    setAssistantMode("chat");
    setMobileTab("chat");
    void sendPrompt(clean, {
      context,
      fileName: title,
      attachments: currentAttachments,
    });
  };

  const highlightedEvidenceIndex =
    assistantMode === "quiz" ? quiz.surface.dataModelUpdate.highlightedSentenceIndex : null;

  // Quick Action Prompts
  const quickPrompts =
    assistantMode === "simplify"
      ? [`Explicar página ${currentPage} em termos simples`, "Dar um exemplo do dia a dia", "Traduzir jargões"]
      : assistantMode === "summary"
        ? [`Resumir página ${currentPage} em 3 tópicos`, "Pontos principais até aqui", "Mapa mental do capítulo"]
        : [`Resumir página ${currentPage}`, "Pontos principais do documento", "Explicar conceitos-chave", "Perguntas de fixação"];

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
      className="relative flex flex-col lg:grid lg:grid-cols-12 lg:items-start gap-4 sm:gap-5 pb-40 sm:pb-32"
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
        onHighlight={(color, text) => onHighlight?.(color, text, containerRef.current)}
        onRemoveHighlight={(text) => onRemoveHighlight?.(text, containerRef.current)}
        onAddNote={(text) => {
          const matched = sentences.find((s) => s.text.includes(text) || text.includes(s.text)) || sentences[currentIndex];
          onAddNote?.(text, matched ? matched.index : currentIndex, matched?.page);
        }}
      />

      {/* Seletor de Abas Mobile (< lg) */}
      <div className="flex lg:hidden items-center p-1 bg-secondary rounded-full">
        <button
          type="button" data-cy="mobile-tab-doc"
          onClick={() => setMobileTab("doc")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 h-10 text-xs font-semibold rounded-full transition-all cursor-pointer",
            mobileTab === "doc"
              ? "bg-card text-foreground shadow-xs ring-1 ring-border"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Headphones className="size-3.5" />
          <span>Documento & Áudio</span>
        </button>

        <button
          type="button" data-cy="mobile-tab-chat"
          onClick={() => setMobileTab("chat")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 h-10 text-xs font-semibold rounded-full transition-all relative cursor-pointer",
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
        {/* Barra Limpa de Navegação de Páginas (Controles de áudio ficam no FloatingAudioDock) */}
        <div className="glass-panel flex items-center justify-between gap-2 rounded-2xl p-2 sm:p-2.5 shadow-xs border border-border/80">
          {/* Navegação de Página */}
          <div className="flex items-center gap-0.5 sm:gap-1 bg-secondary/80 px-1.5 sm:px-2 py-1 rounded-xl">
            <button
              type="button"
              onClick={() => currentPage > 1 && jumpToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              aria-label="Página anterior"
              className="flex size-6 sm:size-7 items-center justify-center rounded-lg hover:bg-card text-foreground disabled:opacity-30 cursor-pointer"
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
              className="flex size-6 sm:size-7 items-center justify-center rounded-lg hover:bg-card text-foreground disabled:opacity-30 cursor-pointer"
            >
              <ChevronRight className="size-3.5 sm:size-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowPagesDrawer(true)}
            title="Índice de Páginas"
            aria-label="Índice de Páginas"
            className="flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary cursor-pointer"
          >
            <List className="size-3.5" aria-hidden="true" />
            <span>Páginas</span>
          </button>
        </div>

        {/* Banner de Simbiose Áudio <-> IA */}
        {pausedBySymbiosis && !isPlaying && (
          <div
            data-cy="symbiosis-paused-banner"
            className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-voice/40 bg-voice-soft px-3.5 py-2 text-xs text-voice-ink"
          >
            <span className="font-semibold">
              Narração pausada em ¶{currentIndex + 1} enquanto você conversa
            </span>
            <button
              type="button"
              data-cy="symbiosis-resume-btn"
              onClick={() => {
                setPausedBySymbiosis(false);
                onToggle();
              }}
              className="inline-flex items-center gap-1 rounded-full bg-voice px-2.5 py-1 text-[11px] font-bold text-primary cursor-pointer hover:opacity-90"
            >
              <Play className="size-3 fill-current" aria-hidden="true" />
              <span>Retomar</span>
            </button>
          </div>
        )}

        {/* Visualizador de Texto */}
        <div className="reader-sheet rounded-3xl px-5 py-6 sm:px-10 sm:py-10">
          <div
            style={{
              fontSize: `${settings.fontSize}px`,
              lineHeight: settings.lineHeight || 1.8,
            }}
            className={cn("mx-auto max-w-[68ch] text-foreground", fontClass)}
          >
            {sentences.map((sentence) => {
              const isActive = sentence.index === currentIndex;
              const isA2uiEvidence = sentence.index === highlightedEvidenceIndex;
              const isRead = sentence.index < currentIndex;
              const showPageMark = sentence.page !== lastRenderedPage;
              lastRenderedPage = sentence.page;

              return (
                <span key={sentence.index}>
                  {showPageMark && (
                    <span className="my-6 sm:my-8 flex items-center gap-3 font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
                      <span>Pág. {sentence.page}</span>
                      <span className="h-px flex-1 bg-border" />
                    </span>
                  )}
                  <button
                    type="button"
                    data-sentence-index={sentence.index}
                    data-a2ui-evidence={isA2uiEvidence ? "true" : undefined}
                    onClick={() => onSelectSentence(sentence.index)}
                    className={cn(
                      "cursor-pointer rounded-[3px] px-0.5 text-left break-words whitespace-normal transition-colors duration-200 inline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isA2uiEvidence &&
                        "bg-emerald-500/15 ring-2 ring-emerald-500/50 text-foreground font-medium",
                      !isA2uiEvidence && isActive && "sentence-highlight-active text-foreground",
                      !isA2uiEvidence && !isActive && isRead && "text-muted-foreground hover:bg-accent/10",
                      !isA2uiEvidence && !isActive && !isRead && "text-foreground hover:bg-accent/10"
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

      {/* Painel Direito: Assistente de IA de Estudos (5 Colunas no Desktop, fixo ao rolar) */}
      <div
        data-cy="ai-assistant-panel"
        className={cn(
          "lg:col-span-5 lg:sticky lg:top-20 lg:self-start flex flex-col rounded-3xl overflow-hidden h-[calc(100dvh-14rem)] min-h-[420px] lg:h-[calc(100dvh-19rem)] border border-border bg-card shadow-[0_4px_18px_rgba(30,34,48,0.06)] font-sans",
          mobileTab !== "chat" && "hidden lg:flex"
        )}
      >
        {/* Header do Chat com IA */}
        <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3 sm:py-4 border-b border-border">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Sparkles className="size-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">Assistente de leitura</h3>
              <p className="truncate text-xs text-muted-foreground">Pergunte sem sair da página</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <ChromeAiBadge hasCloudKey={Boolean(effectiveApiKey)} activeEngine={activeEngine} />
            {!effectiveApiKey && <GeminiKeyDialog apiKey={effectiveApiKey} onChange={updateApiKey} compact />}
          </div>
        </div>

        {/* Abas de Modo do Tutor */}
        <div data-cy="assistant-mode-tabs" className="flex items-center gap-1.5 px-3 sm:px-5 py-2 border-b border-border overflow-x-auto no-scrollbar">
          {([["chat", "Conversar"], ["simplify", "Explicar simples"], ["quiz", "Quiz"], ["summary", "Resumo"]] as const).map(([modeKey, modeLabel]) => (
            <button
              key={modeKey}
              type="button"
              data-cy={`assistant-tab-${modeKey}`}
              onClick={() => (modeKey === "quiz" ? handleOpenQuiz() : setAssistantMode(modeKey))}
              className={cn(
                "rounded-full border px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold transition-colors shrink-0 cursor-pointer",
                assistantMode === modeKey ? "border-accent bg-accent text-accent-foreground" : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground",
              )}
            >
              {modeLabel}
            </button>
          ))}
        </div>

        {assistantMode === "quiz" ? (
          <A2UIQuizSurface
            questions={quiz.surface.surfaceUpdate.questions}
            dataModel={quiz.surface.dataModelUpdate}
            coverage={quiz.surface.surfaceUpdate.coverage}
            source={quiz.surface.surfaceUpdate.source}
            generationStatus={quiz.generationStatus}
            generationNotice={quiz.generationNotice}
            plannedQuestionCount={quiz.plannedQuestionCount}
            canUseAi={quiz.canUseAi}
            onUserAction={quiz.dispatchAction}
            onHighlightEvidence={(sentenceIndex) => {
              onSelectSentence(sentenceIndex);
              scrollToSentence(sentenceIndex);
            }}
            onSaveCardToNotes={handleSaveQuizCard}
            onRegenerate={() => void quiz.regenerateQuiz()}
            onCancelGeneration={quiz.cancelGeneration}
          />
        ) : (
          <>
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-3 sm:px-5 py-2.5 sm:py-4 space-y-3 sm:space-y-4 text-sm scroll-smooth">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-start sm:justify-center min-h-full text-center px-1 sm:px-2 text-muted-foreground space-y-2.5 sm:space-y-4">
                  <div className="flex flex-col items-center">
                    <div className="mb-2 flex size-9 sm:size-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                      <BotMessageSquare className="size-5 sm:size-6 stroke-[1.5]" />
                    </div>
                    <p className="font-semibold text-foreground text-sm sm:text-base">Pronto para tirar dúvidas</p>
                    <p className="text-xs sm:text-sm leading-snug sm:leading-relaxed max-w-xs mt-0.5 sm:mt-1">
                      Selecione qualquer trecho no texto para resumir, ou use as sugestões rápidas abaixo.
                    </p>
                  </div>
                  <div className="w-full text-left">
                    <A2UISuggestCard
                      onStartQuiz={handleOpenQuiz}
                      questionCount={quiz.plannedQuestionCount}
                      wasBudgetLimited={quiz.plannedCoverage.wasBudgetLimited}
                    />
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((m) => {
                    const isUser = m.role === "user";
                    const sourceLabel = m.source === "vertex" ? "vertex" : m.source === "litert-lm" ? "LiteRT-LM (Local)" : "nano";
                    return (
                      <div key={m.id} className={cn("flex flex-col gap-1.5", isUser ? "ml-auto max-w-[85%] items-end" : "mr-auto w-full items-start")}>
                        <div className={cn("leading-relaxed whitespace-pre-wrap", isUser ? "rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground" : "text-[15px] leading-[1.65] text-foreground")}>
                          {m.attachments && m.attachments.length > 0 && (
                            <div className="mb-1.5 flex flex-wrap gap-1.5">
                              {m.attachments.map((att) => (
                                <span key={att.id} className="inline-flex items-center gap-1 rounded-md bg-background/20 px-2 py-0.5 text-[10px]">
                                  {att.type === "image" ? <ImageIcon className="size-3" aria-hidden="true" /> : <AudioLines className="size-3" aria-hidden="true" />}
                                  <span>{att.name}</span>
                                </span>
                              ))}
                            </div>
                          )}
                          {m.content}
                        </div>
                        {!isUser && m.content.trim().length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <InlineVoiceReply text={m.content} />
                            <button
                              type="button"
                              onClick={() => scrollToSentence(currentIndex)}
                              className="inline-flex items-center gap-1 rounded-full bg-accent/12 px-2.5 py-1 text-[11px] font-semibold text-accent hover:bg-accent/20 cursor-pointer"
                            >
                              ¶{currentIndex + 1} · trecho atual
                            </button>
                          </div>
                        )}
                        <span className={cn("text-[11px] text-muted-foreground", isUser && "px-1")}>
                          {isUser ? "Você" : `VivaVoz AI - ${sourceLabel}`}
                        </span>
                      </div>
                    );
                  })}
                  <A2UISuggestCard
                    onStartQuiz={handleOpenQuiz}
                    disabled={isLoadingAI}
                    questionCount={quiz.plannedQuestionCount}
                    wasBudgetLimited={quiz.plannedCoverage.wasBudgetLimited}
                  />
                </>
              )}
              {isLoadingAI && (
                <div className="flex items-center gap-2 text-muted-foreground text-xs p-2">
                  <span className="size-2 rounded-full bg-accent animate-ping motion-reduce:animate-none" />
                  <span>Analisando o documento…</span>
                </div>
              )}
            </div>
            <QuickPromptsBar
              prompts={quickPrompts}
              disabled={isLoadingAI}
              onSelectPrompt={handleSendPrompt}
            />
            <div className="mx-3 sm:mx-4 mb-3 sm:mb-4 rounded-2xl border border-input bg-card p-2.5 space-y-2 shadow-[0_4px_18px_rgba(30,34,48,0.06)] focus-within:ring-2 focus-within:ring-ring/40">
              <ChatMultimodalBar
                attachments={attachments}
                onAddAttachment={(att) => setAttachments((prev) => [...prev, att])}
                onRemoveAttachment={(id) => setAttachments((prev) => prev.filter((item) => item.id !== id))}
                activeEngine={activeEngine}
                disabled={isLoadingAI}
              />
              <form
                data-webmcp-tool="askDocumentAI"
                data-webmcp-action="queryPdfContext"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendPrompt(input);
                }}
                className="flex items-center gap-1.5 sm:gap-2"
              >
                <textarea
                  ref={textareaRef}
                  id="ai-study-prompt-input"
                  name="userPrompt"
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
                  aria-label="Perguntar sobre o documento PDF"
                  className="flex-1 min-h-[40px] max-h-28 resize-none bg-transparent px-2 py-2 text-sm leading-relaxed focus:outline-none text-foreground placeholder:text-muted-foreground"
                />
                <button
                  type="submit"
                  disabled={(!input.trim() && attachments.length === 0) || isLoadingAI}
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-40 cursor-pointer"
                  aria-label="Enviar pergunta sobre o documento"
                >
                  <ArrowUp className="size-5" aria-hidden="true" />
                </button>
              </form>
            </div>
          </>
        )}
      </div>

      {/* Player Flutuante Fixo na Parte Inferior */}
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
        activeTtsModel={activeTtsModel}
        voices={voices}
        disabledEngines={disabledEngines}
        apiKey={effectiveApiKey}
        onApiKeyChange={updateApiKey}
        onEngineChange={onEngineChange}
        onToggle={onToggle}
        onPrevious={onPrevious}
        onNext={onNext}
        onRestart={onRestart}
        onVoiceChange={onVoiceChange}
        onSpeedChange={onSpeedChange}
        className={mobileTab === "chat" ? "hidden lg:block" : undefined}
      />

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
