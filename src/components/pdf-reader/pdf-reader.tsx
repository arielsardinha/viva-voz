"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, FileText, Pencil, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "./app-header";
import { PdfDropzone } from "./pdf-dropzone";
import {
  TemplateSwitcher,
  type ReaderSettings,
} from "./ui/template-switcher";
import { useReaderSettings } from "@/context/reader-settings-context";
import { ModernStudioTemplate } from "./reader-templates/modern-studio-template";
import { AIStudyTemplate } from "./reader-templates/ai-study-template";
import { ZenFocusTemplate } from "./reader-templates/zen-focus-template";
import { extractSentencesFromPdf, type Sentence } from "@/lib/pdf-text";
import {
  createReadingId,
  DEFAULT_PREFERENCES,
  getPreferences,
  getReading,
  savePreferences,
  saveReading,
  updateReading,
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

const GEMINI_KEY_STORAGE = "gemini-api-key";

export function PdfReader() {
  const searchParams = useSearchParams();
  const docParam = searchParams.get("doc");

  const [readingId, setReadingId] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [systemVoices, setSystemVoices] = useState<VoiceOption[]>([]);
  const [userApiKey, setUserApiKey] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  const setVoice = useCallback(
    (next: string) => patchPrefs({ voice: { ...prefs.voice, [engine]: next } }),
    [patchPrefs, prefs.voice, engine]
  );
  const setSpeed = useCallback((next: string) => patchPrefs({ speed: next }), [patchPrefs]);
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

  // Preferences
  useEffect(() => {
    void (async () => {
      setPrefs(await getPreferences());
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

  // Resume last reading
  useEffect(() => {
    if (!prefsLoaded || docParam || readingId || !prefs.lastReadingId) return;
    void (async () => {
      const reading = await getReading(prefs.lastReadingId!);
      if (!reading) return;
      setReadingId(reading.id);
      setTitle(reading.title);
      setSentences(reading.sentences);
      if (reading.lastIndex > 0) player.seekTo(reading.lastIndex);
      toast.info(`Retomando “${reading.title}” de onde você parou.`);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefsLoaded]);

  // Open specific reading (?doc=id)
  useEffect(() => {
    const id = docParam;
    if (!id || id === readingId) return;
    void (async () => {
      const reading = await getReading(id);
      if (!reading) {
        toast.error("Leitura não encontrada no armazenamento do navegador.");
        return;
      }
      setReadingId(reading.id);
      setTitle(reading.title);
      setSentences(reading.sentences);
      if (reading.lastIndex > 0) player.seekTo(reading.lastIndex);
      void savePreferences({ lastReadingId: reading.id });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docParam]);

  // Persist current position
  useEffect(() => {
    if (!readingId) return;
    const timeout = setTimeout(() => {
      void updateReading(readingId, { lastIndex: player.currentIndex });
    }, 800);
    return () => clearTimeout(timeout);
  }, [readingId, player.currentIndex]);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Envie um arquivo no formato PDF.");
      return;
    }
    setIsLoading(true);
    setProgress("Extraindo o texto…");
    try {
      const result = await extractSentencesFromPdf(file, (page, total) =>
        setProgress(`Extraindo o texto… página ${page} de ${total}`)
      );
      if (result.sentences.length === 0) {
        toast.error(
          "Nenhum texto encontrado. Este PDF parece ser digitalizado (apenas imagens), sem camada de texto."
        );
        return;
      }
      const now = Date.now();
      const id = createReadingId();
      const readingTitle = file.name.replace(/\.pdf$/i, "");
      await saveReading({
        id,
        title: readingTitle,
        fileName: file.name,
        size: file.size,
        pageCount: result.pageCount,
        sentences: result.sentences,
        file,
        createdAt: now,
        updatedAt: now,
        lastIndex: 0,
      });
      setReadingId(id);
      setTitle(readingTitle);
      setSentences(result.sentences);
      void savePreferences({ lastReadingId: id });
      toast.success(
        `${result.sentences.length} trechos prontos e salvos nas suas leituras (${result.pageCount} página(s)).`
      );
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível ler este PDF. Verifique se o arquivo não está protegido.");
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  }, []);

  const saveTitle = useCallback(async () => {
    const next = draftTitle.trim();
    setIsEditing(false);
    if (!next || !readingId || next === title) return;
    setTitle(next);
    await updateReading(readingId, { title: next });
    toast.success("Título atualizado.");
  }, [draftTitle, readingId, title]);

  const reset = useCallback(() => {
    player.pause();
    setSentences([]);
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
      className="bg-background min-h-screen transition-colors"
      data-reading-theme={readerSettings.theme}
    >
      <AppHeader />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8 space-y-5">
        {sentences.length === 0 ? (
          <PdfDropzone onFile={handleFile} isLoading={isLoading} progress={progress} />
        ) : (
          <>
            {/* Barra de Título & Ações Principais */}
            <div className="glass-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3 sm:px-5 border border-border/80 shadow-xs">
              <div className="flex min-w-0 items-center gap-2.5 flex-1">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                  <FileText className="size-4" />
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
                  <div className="flex min-w-0 items-center gap-1.5">
                    <h2 className="truncate text-sm sm:text-base font-bold text-foreground">
                      {title}
                    </h2>
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

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={reset}
                  className="flex items-center gap-1.5 rounded-xl border border-border bg-card/80 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <X className="size-3.5" />
                  <span>Trocar PDF</span>
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

            {/* Renderização Condicional dos 3 Templates Inspirados */}
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
                onAskAI={(prompt) => {
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
                onAskAI={(prompt) => {
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
