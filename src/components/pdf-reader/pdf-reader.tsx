"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, FileText, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "./app-header";
import { PdfDropzone } from "./pdf-dropzone";
import { PlayerControls } from "./player-controls";
import { TranscriptView } from "./transcript-view";
import { ChatPanel } from "./chat-panel";
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
  LOVABLE_VOICES,
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

  const engine = prefs.engine as TtsEngine;
  const speed = prefs.speed;
  const voices: VoiceOption[] =
    engine === "system" ? systemVoices : engine === "google" ? GOOGLE_VOICES : LOVABLE_VOICES;
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
    [],
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
    [patchPrefs, prefs.voice, engine],
  );
  const setSpeed = useCallback((next: string) => patchPrefs({ speed: next }), [patchPrefs]);
  const setEngine = useCallback(
    (next: TtsEngine) => patchPrefs({ engine: next }),
    [patchPrefs],
  );

  // Chave própria do Gemini (compartilhada com o chat)
  useEffect(() => {
    const read = () => setUserApiKey(window.localStorage.getItem(GEMINI_KEY_STORAGE));
    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, []);

  // Vozes do navegador/sistema
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const load = () => setSystemVoices(listSystemVoices());
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  // Preferências salvas
  useEffect(() => {
    void (async () => {
      setPrefs(await getPreferences());
      setPrefsLoaded(true);
    })();
  }, []);

  const currentPage = useMemo(
    () => sentences[player.currentIndex]?.page ?? 0,
    [sentences, player.currentIndex],
  );

  // Retoma a última leitura ao reabrir o navegador
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

  // Abre uma leitura já persistida (?doc=id)
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

  // Persiste a posição atual da leitura
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
        setProgress(`Extraindo o texto… página ${page} de ${total}`),
      );
      if (result.sentences.length === 0) {
        toast.error(
          "Nenhum texto encontrado. Este PDF parece ser digitalizado (apenas imagens), sem camada de texto.",
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
        `${result.sentences.length} trechos prontos e salvos nas suas leituras (${result.pageCount} página(s)).`,
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

  return (
    <div className="bg-background min-h-screen">
      <AppHeader />

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:py-8">
        {sentences.length === 0 ? (
          <PdfDropzone onFile={handleFile} isLoading={isLoading} progress={progress} />
        ) : (
          <>
            <div className="border-border bg-card grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="text-accent size-4 shrink-0" />
                {isEditing ? (
                  <div className="flex min-w-0 flex-1 items-center gap-1">
                    <input
                      autoFocus
                      value={draftTitle}
                      onChange={(event) => setDraftTitle(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void saveTitle();
                        if (event.key === "Escape") setIsEditing(false);
                      }}
                      aria-label="Título da leitura"
                      className="border-border bg-background min-w-0 flex-1 rounded-md border px-2 py-1 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => void saveTitle()}
                      aria-label="Salvar título"
                      className="text-accent hover:bg-secondary inline-flex size-8 shrink-0 items-center justify-center rounded-md"
                    >
                      <Check className="size-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="truncate text-sm font-medium">{title}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setDraftTitle(title ?? "");
                        setIsEditing(true);
                      }}
                      aria-label="Editar título"
                      className="text-muted-foreground hover:text-foreground inline-flex size-7 shrink-0 items-center justify-center rounded-md"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={reset}
                className="text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center gap-1 text-sm transition-colors"
              >
                <X className="size-4" />
                <span className="hidden sm:inline">Trocar arquivo</span>
              </button>
            </div>

            <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
              <div className="min-w-0 space-y-5">
                <PlayerControls
                  isPlaying={player.isPlaying}
                  isBuffering={player.isBuffering}
                  currentIndex={player.currentIndex}
                  total={sentences.length}
                  page={currentPage}
                  voice={voice}
                  speed={speed}
                  engine={engine}
                  voices={voices}
                  disabledEngines={prefs.disabledEngines as TtsEngine[]}
                  onEngineChange={setEngine}
                  onToggle={player.toggle}
                  onPrevious={player.previous}
                  onNext={player.next}
                  onRestart={player.restart}
                  onVoiceChange={setVoice}
                  onSpeedChange={setSpeed}
                />

                <TranscriptView
                  sentences={sentences}
                  currentIndex={player.currentIndex}
                  onSelect={player.jumpTo}
                />
              </div>

              <ChatPanel sentences={sentences} fileName={title} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
