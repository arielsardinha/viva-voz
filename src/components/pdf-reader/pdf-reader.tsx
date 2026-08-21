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

const GEMINI_KEY_STORAGE = "gemini-api-key";

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
  const [userApiKey, setUserApiKey] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
      toast.error(`${message} Voltando para as vozes do sistema.`);
      setPrefs((current) => {
        const next: Preferences = {
          ...current,
          engine: "system",
          disabledEngines: Array.from(new Set([...current.disabledEngines, failed])),
        };
        void savePreferences({ engine: next.engine, disabledEngines: next.disabledEngines });
        return next;
      });
    },
    []
  );

  const player = useTtsPlayer({
    sentences,
    engine,
    voice,
    speed: Number(speed),
    userApiKey,
    onError: handleError,
    onEngineUnavailable: handleEngineUnavailable,
  });

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
      toast.error(err.message || "Não foi possível processar o documento.");
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
  const setEngine = useCallback(
    (next: TtsEngine) => patchPrefs({ engine: next }),
    [patchPrefs]
  );

  // Gemini API key
  useEffect(() => {
    const read = () => setUserApiKey(window.localStorage.getItem(GEMINI_KEY_STORAGE));
    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, []);

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
                  title="Trocar de documento"
                  className="flex items-center gap-1 sm:gap-1.5 rounded-xl border border-border bg-card/80 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
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
                disabledEngines={prefs.disabledEngines as TtsEngine[]}
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
                disabledEngines={prefs.disabledEngines as TtsEngine[]}
                onEngineChange={setEngine}
                onSelectSentence={player.jumpTo}
                onToggle={player.toggle}
                onPrevious={player.previous}
                onNext={player.next}
                onRestart={player.restart}
                onVoiceChange={setVoice}
                onSpeedChange={setSpeed}
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
                disabledEngines={prefs.disabledEngines as TtsEngine[]}
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
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
