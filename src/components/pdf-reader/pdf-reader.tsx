"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  BookOpen,
  Check,
  FileText,
  Pencil,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "./app-header";
import { PdfDropzone } from "./pdf-dropzone";
import {
  TemplateSwitcher,
} from "./ui/template-switcher";
import { useReaderSettings } from "@/context/reader-settings-context";
import { ModernStudioTemplate } from "./reader-templates/modern-studio-template";
import { AIStudyTemplate } from "./reader-templates/ai-study-template";
import { ZenFocusTemplate } from "./reader-templates/zen-focus-template";
import { ZenQuotaDialog } from "./ui/zen-quota-dialog";
import { GeminiKeyDialog } from "./gemini-key-dialog";
import type { Sentence } from "@/lib/pdf-text";
import {
  DEFAULT_PREFERENCES,
  getPreferences,
  savePreferences,
  type Preferences,
} from "@/lib/library-db";
import {
  DEFAULT_VOICE,
  GOOGLE_VOICES,
  listSystemVoices,
  type TtsEngine,
  type VoiceOption,
} from "@/lib/tts-engines";
import { useTtsPlayer } from "@/hooks/use-tts-player";
import { useDocumentUploader } from "@/hooks/use-document-uploader";
import { DocumentProcessingFacade } from "@/lib/facade/document-processing.facade";
import type { DocumentChapter, DocumentFormat } from "@/lib/domain/document.types";
import { useGeminiApiKey } from "@/hooks/use-gemini-api-key";
import { useMediaSession } from "@/hooks/use-media-session";
import { useDocumentHighlights } from "@/hooks/use-document-highlights";
import { useDocumentNotes } from "@/hooks/use-document-notes";
import { NoteDialog } from "./ui/note-dialog";
import { NotesDrawer } from "./ui/notes-drawer";
import { StorageQuotaModal } from "@/components/sync/storage-quota-modal";
import type { HighlightColor } from "@/lib/domain/document-highlight.types";
import type { DocumentNote, NoteColor } from "@/lib/domain/document-note.types";

export function PdfReader() {
  const searchParams = useSearchParams();
  const docParam = searchParams.get("doc");

  const [readingId, setReadingId] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [chapters, setChapters] = useState<DocumentChapter[]>([]);
  const [docFormat, setDocFormat] = useState<DocumentFormat>("pdf");
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [systemVoices, setSystemVoices] = useState<VoiceOption[]>([]);
  const { apiKey: userApiKey, hasApiKey, updateApiKey: setUserApiKey } = useGeminiApiKey();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zenQuotaDialogOpen, setZenQuotaDialogOpen] = useState(false);
  const [geminiKeyDialogOpen, setGeminiKeyDialogOpen] = useState(false);

  // Estados do Bloco de Notas
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [activeNoteDraft, setActiveNoteDraft] = useState<{
    sentenceIndex: number;
    selectedText: string;
    page?: number;
  } | null>(null);
  const [editingNote, setEditingNote] = useState<DocumentNote | null>(null);
  const [notesDrawerOpen, setNotesDrawerOpen] = useState(false);

  const docHighlights = useDocumentHighlights(readingId);
  const docNotes = useDocumentNotes(readingId);

  const handleHighlight = useCallback(
    (color: HighlightColor, text: string, container?: HTMLElement | null) => {
      docHighlights.applyHighlight(color, text, container, sentences);
    },
    [docHighlights, sentences]
  );

  const handleRemoveHighlight = useCallback(
    (text: string, container?: HTMLElement | null) => {
      docHighlights.removeHighlightsForSelection(text, container, sentences);
    },
    [docHighlights, sentences]
  );

  const handleRequestAddNote = useCallback(
    (text: string, sentenceIndex: number, page?: number) => {
      setActiveNoteDraft({
        sentenceIndex,
        selectedText: text,
        page,
      });
      setEditingNote(null);
      setNoteDialogOpen(true);
    },
    []
  );

  const handleOpenNote = useCallback((note: DocumentNote) => {
    setEditingNote(note);
    setActiveNoteDraft(null);
    setNoteDialogOpen(true);
  }, []);

  const handleSaveNote = useCallback(
    (data: {
      sentenceIndex: number;
      selectedText: string;
      content: string;
      title?: string;
      color: NoteColor;
      page?: number;
    }) => {
      if (editingNote) {
        docNotes.updateNote(editingNote.id, {
          title: data.title,
          content: data.content,
          color: data.color,
        });
        toast.success("Anotação atualizada.");
      } else {
        docNotes.addNote(data);
        toast.success("Anotação salva no Bloco de Notas.");
      }
    },
    [editingNote, docNotes]
  );

  const handleDeleteNote = useCallback(
    (noteId: string) => {
      docNotes.deleteNote(noteId);
      toast.success("Anotação excluída.");
    },
    [docNotes]
  );

  const facade = useMemo(() => DocumentProcessingFacade.getInstance(), []);

  // Template & Display Settings vindos do contexto global
  const { settings: readerSettings, patchSettings } = useReaderSettings();

  const engine = prefs.engine;
  const speed = prefs.speed;
  const voices: VoiceOption[] = engine === "system" ? systemVoices : GOOGLE_VOICES;
  const voice = prefs.voice[engine] ?? DEFAULT_VOICE[engine] ?? "";

  const patchPrefs = useCallback((patch: Partial<Preferences>) => {
    setPrefs((current) => ({ ...current, ...patch }));
    void savePreferences(patch);
  }, []);

  const handleError = useCallback((message: string) => toast.error(message), []);

  const handleEngineUnavailable = useCallback(
    (failed: TtsEngine, message: string) => {
      if (readerSettings.template === "zen") {
        setZenQuotaDialogOpen(true);
      } else {
        toast.info(
          `${message} Alternando automaticamente para as vozes gratuitas do sistema.`
        );
        setPrefs((current) => {
          const next: Preferences = {
            ...current,
            engine: "system",
            disabledEngines: Array.from(new Set([...current.disabledEngines, failed])),
          };
          void savePreferences({ engine: next.engine, disabledEngines: next.disabledEngines });
          return next;
        });
      }
    },
    [readerSettings.template]
  );

  const player = useTtsPlayer({
    sentences,
    engine,
    voice,
    speed: Number(speed),
    userApiKey,
    documentId: readingId,
    onError: handleError,
    onEngineUnavailable: handleEngineUnavailable,
  });

  const handleContinueZenWithFreeVoice = useCallback(
    (selectedVoice: string) => {
      setPrefs((current) => {
        const next: Preferences = {
          ...current,
          engine: "system",
          voice: {
            ...current.voice,
            system: selectedVoice,
          },
        };
        void savePreferences({
          engine: next.engine,
          voice: next.voice,
        });
        return next;
      });
      setTimeout(() => {
        player.play();
      }, 50);
    },
    [player]
  );

  const handleJumpToNoteSentence = useCallback(
    (sentenceIndex: number) => {
      player.seekTo(sentenceIndex);
      if (typeof window !== "undefined") {
        setTimeout(() => {
          const el = document.querySelector<HTMLElement>(
            `[data-sentence-index="${sentenceIndex}"]`
          );
          if (el && typeof el.scrollIntoView === "function") {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 50);
      }
    },
    [player]
  );

  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);

  const uploaderVM = useDocumentUploader({
    facade,
    onSuccess: (doc) => {
      setReadingId(doc.id);
      setTitle(doc.metadata.title);
      setSentences(doc.sentences);
      setChapters(doc.chapters);
      setDocFormat(doc.metadata.format);
      void savePreferences({ lastReadingId: doc.id });
      toast.success(
        `${doc.sentences.length} trechos prontos (${doc.metadata.wordCount} palavras) no formato ${doc.metadata.format.toUpperCase()}.`
      );
    },
    onError: (err) => {
      if (!isQuotaModalOpen) {
        toast.error(err.message || "Não foi possível processar o documento.");
      }
    },
    onQuotaExceeded: () => {
      setIsQuotaModalOpen(true);
    },
  });

  const setVoice = useCallback(
    (next: string) => patchPrefs({ voice: { ...prefs.voice, [engine]: next } }),
    [patchPrefs, prefs.voice, engine]
  );
  const setSpeed = useCallback(
    (next: string) => {
      patchPrefs({ speed: next });
      patchSettings({ speed: Number(next) });
    },
    [patchPrefs, patchSettings]
  );
  const effectiveDisabledEngines = useMemo(() => {
    const disabled = (prefs.disabledEngines as TtsEngine[]) || [];
    if (hasApiKey) {
      return disabled.filter((e) => e !== "google");
    }
    return disabled;
  }, [hasApiKey, prefs.disabledEngines]);

  const setEngine = useCallback(
    (next: TtsEngine) => {
      if (next === "google" && !hasApiKey) {
        patchPrefs({ engine: "system" });
        return;
      }
      patchPrefs({ engine: next });
    },
    [patchPrefs, hasApiKey]
  );

  // Se o motor estiver configurado como Google mas não houver chave, volta para a seleção padrão gratuita (sistema)
  useEffect(() => {
    if (prefs.engine === "google" && !hasApiKey) {
      patchPrefs({ engine: "system" });
    }
  }, [prefs.engine, hasApiKey, patchPrefs]);

  // Se a chave for conectada e 'google' estava em disabledEngines, limpa a restrição
  useEffect(() => {
    if (hasApiKey && prefs.disabledEngines.includes("google")) {
      patchPrefs({
        disabledEngines: prefs.disabledEngines.filter((e) => e !== "google"),
      });
    }
  }, [hasApiKey, prefs.disabledEngines, patchPrefs]);

  // System voices
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const load = () => setSystemVoices(listSystemVoices());
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  // Sincroniza velocidade quando alterada via ReaderSettings
  useEffect(() => {
    if (readerSettings.speed !== undefined) {
      const speedStr = String(readerSettings.speed);
      setPrefs((current) => {
        if (current.speed === speedStr) return current;
        return { ...current, speed: speedStr };
      });
    }
  }, [readerSettings.speed]);

  // Preferences: carrega no início
  useEffect(() => {
    void (async () => {
      const loadedPrefs = await getPreferences();
      setPrefs((current) => ({
        ...loadedPrefs,
        speed:
          readerSettings.speed !== undefined
            ? String(readerSettings.speed)
            : loadedPrefs.speed || current.speed,
      }));
      setPrefsLoaded(true);
    })();
  }, []);

  const currentPage = useMemo(
    () => sentences[player.currentIndex]?.page ?? 1,
    [sentences, player.currentIndex]
  );

  const totalPages = useMemo(() => {
    return sentences.reduce((max, s) => Math.max(max, s.page), 1);
  }, [sentences]);

  // Identifica o capítulo atual com base na sentença ativa
  const currentChapter = useMemo(() => {
    const index = player.currentIndex;
    return chapters.find((c) => index >= c.startIndex && index <= c.endIndex);
  }, [chapters, player.currentIndex]);

  // Integração com Media Session API para controles nativos na tela de bloqueio
  useMediaSession({
    title: title || "VivaVoz — Leitor de Texto em Áudio",
    subtitle: currentChapter
      ? currentChapter.title
      : sentences.length > 0
      ? `Trecho ${player.currentIndex + 1} de ${sentences.length}`
      : "Narração Inteligente",
    isPlaying: player.isPlaying,
    onPlay: player.play,
    onPause: player.pause,
    onPrevious: player.previous,
    onNext: player.next,
  });

  // Retoma última leitura
  useEffect(() => {
    if (!prefsLoaded || docParam || readingId || !prefs.lastReadingId) return;
    void (async () => {
      const doc = await facade.getRepository().getById(prefs.lastReadingId!);
      if (!doc) return;
      setReadingId(doc.id);
      setTitle(doc.metadata.title);
      setSentences(doc.sentences);
      setChapters(doc.chapters);
      setDocFormat(doc.metadata.format);
      if (doc.lastSentenceIndex > 0) player.seekTo(doc.lastSentenceIndex);
      toast.info(`Retomando “${doc.metadata.title}” de onde você parou.`);
    })();
  }, [prefsLoaded]);

  // Abre leitura específica via query (?doc=id)
  useEffect(() => {
    const id = docParam;
    if (!id || id === readingId) return;
    void (async () => {
      const doc = await facade.getRepository().getById(id);
      if (!doc) {
        toast.error("Leitura não encontrada no armazenamento do navegador.");
        return;
      }
      setReadingId(doc.id);
      setTitle(doc.metadata.title);
      setSentences(doc.sentences);
      setChapters(doc.chapters);
      setDocFormat(doc.metadata.format);
      if (doc.lastSentenceIndex > 0) player.seekTo(doc.lastSentenceIndex);
      void savePreferences({ lastReadingId: doc.id });
    })();
  }, [docParam]);

  // Persiste a posição atual de leitura
  useEffect(() => {
    if (!readingId) return;
    const timeout = setTimeout(() => {
      void facade.saveReadingProgress(readingId, player.currentIndex);
    }, 800);
    return () => clearTimeout(timeout);
  }, [readingId, player.currentIndex, facade]);

  const handleFilesUpload = useCallback(
    (files: FileList | File[]) => {
      void uploaderVM.uploadFiles(files);
    },
    [uploaderVM]
  );

  const handleQuickPaste = useCallback(
    async (pastedTitle: string, pastedText: string) => {
      await uploaderVM.uploadRawText(pastedTitle, pastedText);
    },
    [uploaderVM]
  );

  const handleWebUrl = useCallback(
    async (doc: import("@/lib/domain/document.types").ParsedDocument) => {
      try {
        await facade.saveParsedDocument(doc);
      } catch {
        // Se houver algum erro de persistência, prossegue com a leitura em memória
      }
      setReadingId(doc.id);
      setTitle(doc.metadata.title);
      setSentences(doc.sentences);
      setChapters(doc.chapters);
      setDocFormat(doc.metadata.format);
      void savePreferences({ lastReadingId: doc.id });
      toast.success(
        `Artigo "${doc.metadata.title}" salvo na biblioteca (${doc.metadata.wordCount} palavras).`
      );
    },
    [facade]
  );

  const saveTitle = useCallback(async () => {
    const next = draftTitle.trim();
    setIsEditing(false);
    if (!next || !readingId || next === title) return;
    setTitle(next);
    await facade.renameDocument(readingId, next);
    toast.success("Título atualizado.");
  }, [draftTitle, readingId, title, facade]);

  const reset = useCallback(() => {
    player.pause();
    setSentences([]);
    setChapters([]);
    setTitle(null);
    setReadingId(null);
    void savePreferences({ lastReadingId: null });
  }, [player]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      void document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div
      className="bg-background min-h-screen transition-colors pb-10"
      data-reading-theme={readerSettings.theme}
    >
      <AppHeader />

      <main className="mx-auto max-w-7xl px-3 sm:px-4 py-4 sm:py-8 space-y-3 sm:space-y-5">
        {sentences.length === 0 ? (
          <PdfDropzone
            onFiles={handleFilesUpload}
            onQuickPaste={handleQuickPaste}
            onWebUrl={handleWebUrl}
            isLoading={uploaderVM.isUploading}
            progress={uploaderVM.currentProgress}
          />

        ) : (
          <>
            {/* Barra de Título, Formato & Ações Principais */}
            <div className="glass-panel flex items-center justify-between gap-2 sm:gap-3 rounded-2xl p-2.5 sm:px-5 sm:py-3 border border-border/80 shadow-xs">
              <div className="flex min-w-0 items-center gap-2 sm:gap-2.5 flex-1">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent font-mono text-xs font-bold uppercase">
                  {docFormat}
                </div>
                {isEditing ? (
                  <div className="flex min-w-0 flex-1 items-center gap-1.5 max-w-md">
                    <input
                      autoFocus
                      value={draftTitle}
                      onChange={(event) => setDraftTitle(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void saveTitle();
                        if (event.key === "Escape") setIsEditing(false);
                      }}
                      aria-label="Título da leitura"
                      className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                    <button
                      type="button"
                      onClick={() => void saveTitle()}
                      aria-label="Salvar título"
                      className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-xs hover:opacity-90"
                    >
                      <Check className="size-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex min-w-0 items-center gap-1.5 flex-1">
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-xs sm:text-base font-bold text-foreground max-w-[180px] xs:max-w-[260px] sm:max-w-md">
                        {title}
                      </h2>
                      {currentChapter && (
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                          {currentChapter.title}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDraftTitle(title ?? "");
                        setIsEditing(true);
                      }}
                      aria-label="Editar título"
                      className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Se houver múltiplos capítulos, dropdown para pular */}
              {chapters.length > 1 && (
                <div className="hidden sm:flex items-center gap-1.5">
                  <select
                    aria-label="Selecionar capítulo"
                    value={currentChapter?.id || ""}
                    onChange={(e) => {
                      const selected = chapters.find((c) => c.id === e.target.value);
                      if (selected) player.jumpTo(selected.startIndex);
                    }}
                    className="text-xs bg-secondary/80 border border-border rounded-xl px-2.5 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer max-w-[160px] truncate"
                  >
                    {chapters.map((chap) => (
                      <option key={chap.id} value={chap.id}>
                        {chap.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={reset}
                  data-cy="change-document-btn"
                  title="Trocar de documento"
                  className="flex items-center gap-1 sm:gap-1.5 rounded-xl border border-border bg-card/80 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="size-3.5" />
                  <span className="hidden xs:inline">Trocar Documento</span>
                  <span className="inline xs:hidden">Trocar</span>
                </button>
              </div>
            </div>

            {/* Seletor de Templates e Controles de Exibição */}
            <TemplateSwitcher
              settings={readerSettings}
              onChangeSettings={patchSettings}
              isFullscreen={isFullscreen}
              onToggleFullscreen={toggleFullscreen}
              currentPage={currentPage}
              totalPages={totalPages}
              notesCount={docNotes.notes.length}
              onOpenNotesDrawer={() => setNotesDrawerOpen(true)}
            />

            {/* Renderização Condicional dos 3 Templates */}
            {readerSettings.template === "modern" && (
              <ModernStudioTemplate
                sentences={sentences}
                currentIndex={player.currentIndex}
                title={title}
                settings={readerSettings}
                isPlaying={player.isPlaying}
                isBuffering={player.isBuffering}
                voice={voice}
                speed={speed}
                engine={engine}
                voices={voices}
                disabledEngines={effectiveDisabledEngines}
                apiKey={userApiKey}
                onApiKeyChange={setUserApiKey}
                onEngineChange={setEngine}
                onSelectSentence={player.jumpTo}
                onToggle={player.toggle}
                onPrevious={player.previous}
                onNext={player.next}
                onRestart={player.restart}
                onVoiceChange={setVoice}
                onSpeedChange={setSpeed}
                onAskAI={() => {
                  patchSettings({ template: "ai-study" });
                }}
                getHighlightsForSentence={docHighlights.getHighlightsForSentence}
                onHighlight={handleHighlight}
                onRemoveHighlight={handleRemoveHighlight}
                getNotesForSentence={docNotes.getNotesForSentence}
                onAddNote={handleRequestAddNote}
                onOpenNote={handleOpenNote}
              />
            )}

            {readerSettings.template === "ai-study" && (
              <AIStudyTemplate
                sentences={sentences}
                currentIndex={player.currentIndex}
                title={title}
                settings={readerSettings}
                isPlaying={player.isPlaying}
                isBuffering={player.isBuffering}
                voice={voice}
                speed={speed}
                engine={engine}
                voices={voices}
                disabledEngines={effectiveDisabledEngines}
                apiKey={userApiKey}
                onApiKeyChange={setUserApiKey}
                onEngineChange={setEngine}
                onSelectSentence={player.jumpTo}
                onToggle={player.toggle}
                onPrevious={player.previous}
                onNext={player.next}
                onRestart={player.restart}
                onVoiceChange={setVoice}
                onSpeedChange={setSpeed}
                getHighlightsForSentence={docHighlights.getHighlightsForSentence}
                onHighlight={handleHighlight}
                onRemoveHighlight={handleRemoveHighlight}
                getNotesForSentence={docNotes.getNotesForSentence}
                onAddNote={handleRequestAddNote}
                onOpenNote={handleOpenNote}
              />
            )}

            {readerSettings.template === "zen" && (
              <ZenFocusTemplate
                sentences={sentences}
                currentIndex={player.currentIndex}
                title={title}
                settings={readerSettings}
                isPlaying={player.isPlaying}
                isBuffering={player.isBuffering}
                voice={voice}
                speed={speed}
                engine={engine}
                voices={voices}
                disabledEngines={effectiveDisabledEngines}
                apiKey={userApiKey}
                onApiKeyChange={setUserApiKey}
                onEngineChange={setEngine}
                onSelectSentence={player.jumpTo}
                onToggle={player.toggle}
                onPrevious={player.previous}
                onNext={player.next}
                onRestart={player.restart}
                onVoiceChange={setVoice}
                onSpeedChange={setSpeed}
                onAskAI={() => {
                  patchSettings({ template: "ai-study" });
                }}
                getHighlightsForSentence={docHighlights.getHighlightsForSentence}
                onHighlight={handleHighlight}
                onRemoveHighlight={handleRemoveHighlight}
                getNotesForSentence={docNotes.getNotesForSentence}
                onAddNote={handleRequestAddNote}
                onOpenNote={handleOpenNote}
              />
            )}

            {/* Diálogo de Fallback de Tokens/Cota para o Modo Zen */}
            <ZenQuotaDialog
              open={zenQuotaDialogOpen}
              onOpenChange={setZenQuotaDialogOpen}
              systemVoices={systemVoices}
              currentVoice={prefs.voice["system"] || DEFAULT_VOICE["system"]}
              onContinueWithFree={handleContinueZenWithFreeVoice}
              onOpenGeminiKey={() => setGeminiKeyDialogOpen(true)}
            />

            {/* Diálogo auxiliar de Chave Gemini */}
            <GeminiKeyDialog
              apiKey={userApiKey}
              onChange={setUserApiKey}
              open={geminiKeyDialogOpen}
              onOpenChange={setGeminiKeyDialogOpen}
              trigger={<span className="hidden" />}
            />

            {/* Diálogo para Criar / Editar Anotação no Bloco de Notas */}
            <NoteDialog
              open={noteDialogOpen}
              onOpenChange={setNoteDialogOpen}
              sentenceIndex={activeNoteDraft?.sentenceIndex ?? editingNote?.sentenceIndex ?? 0}
              selectedText={activeNoteDraft?.selectedText ?? editingNote?.selectedText ?? ""}
              page={activeNoteDraft?.page ?? editingNote?.page}
              editingNote={editingNote}
              onSave={handleSaveNote}
              onDelete={handleDeleteNote}
            />

            {/* Drawer Lateral com Todas as Anotações do Documento */}
            <NotesDrawer
              open={notesDrawerOpen}
              onOpenChange={setNotesDrawerOpen}
              notes={docNotes.notes}
              onSelectSentence={handleJumpToNoteSentence}
              onEditNote={handleOpenNote}
              onDeleteNote={handleDeleteNote}
            />
          </>
        )}

        {/* Diálogo de Memória Insuficiente no Navegador (Acessível em qualquer estado) */}
        <StorageQuotaModal
          open={isQuotaModalOpen}
          onOpenChange={setIsQuotaModalOpen}
        />
      </main>
    </div>
  );
}
