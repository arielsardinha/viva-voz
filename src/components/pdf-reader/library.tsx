"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Bookmark,
  Check,
  Clock,
  Cloud,
  Download,
  FileText,
  FileUp,
  FolderArchive,
  HardDrive,
  Headphones,
  Mic,
  MoreVertical,
  Pencil,
  Play,
  Search,
  Sparkles,
  Tag,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "./app-header";
import { useReaderSettings } from "@/context/reader-settings-context";
import {
  deleteReading,
  getReading,
  listReadings,
  saveReading,
  createReadingId,
  updateReading,
  type ReadingSummary,
} from "@/lib/library-db";
import { extractSentencesFromPdf } from "@/lib/pdf-text";
import { cn } from "@/lib/utils";


function formatSize(bytes: number) {
  return bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// Generate pleasing cover gradient based on reading id
const COVER_GRADIENTS = [
  "from-slate-800 to-indigo-950 text-indigo-200",
  "from-emerald-900 to-teal-950 text-emerald-200",
  "from-blue-900 to-slate-950 text-blue-200",
  "from-amber-950 to-orange-950 text-amber-200",
  "from-violet-900 to-purple-950 text-violet-200",
  "from-rose-950 to-pink-950 text-rose-200",
];

const TAG_PRESETS = ["Todos", "Design", "Tech", "Estudos", "Artigos"];

export function Library() {
  const { settings } = useReaderSettings();
  const [readings, setReadings] = useState<ReadingSummary[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTag, setActiveTag] = useState("Todos");
  const [activeTab, setActiveTab] = useState<"library" | "favorites" | "recent">("library");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const refresh = useCallback(async () => {
    setReadings(await listReadings());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    // Load favorites from local storage
    try {
      const savedFavs = JSON.parse(localStorage.getItem("vivavoz-favorites") || "[]");
      setFavorites(savedFavs);
    } catch {}
  }, [refresh]);

  const toggleFavorite = (id: string) => {
    const next = favorites.includes(id)
      ? favorites.filter((f) => f !== id)
      : [...favorites, id];
    setFavorites(next);
    localStorage.setItem("vivavoz-favorites", JSON.stringify(next));
    toast.success(favorites.includes(id) ? "Removido dos favoritos" : "Adicionado aos favoritos");
  };

  const saveTitle = async (id: string) => {
    const next = draft.trim();
    setEditingId(null);
    if (!next) return;
    await updateReading(id, { title: next });
    await refresh();
    toast.success("Título atualizado.");
  };

  const remove = async (id: string) => {
    await deleteReading(id);
    await refresh();
    toast.success("Leitura removida do navegador.");
  };

  const download = async (id: string) => {
    const reading = await getReading(id);
    if (!reading) return;
    const url = URL.createObjectURL(reading.file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = reading.fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleQuickUpload = async (file: File) => {
    if (!file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Envie um arquivo PDF.");
      return;
    }
    setIsUploading(true);
    try {
      const result = await extractSentencesFromPdf(file);
      if (result.sentences.length === 0) {
        toast.error("Nenhum texto encontrado no PDF.");
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
      await refresh();
      toast.success(`“${readingTitle}” adicionado à biblioteca!`);
    } catch (e) {
      toast.error("Erro ao importar PDF.");
    } finally {
      setIsUploading(false);
    }
  };

  // Filtered readings
  const filteredReadings = useMemo(() => {
    return readings.filter((r) => {
      const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (activeTab === "favorites") return favorites.includes(r.id);
      return true;
    });
  }, [readings, searchQuery, activeTab, favorites]);

  // Storage calculation
  const totalBytes = useMemo(() => readings.reduce((acc, r) => acc + r.size, 0), [readings]);

  return (
    <div
      className="bg-background text-foreground min-h-screen transition-colors"
      data-reading-theme={settings.theme}
    >
      <AppHeader />


      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          {/* Sidebar Navigation (Inspiração 03) */}
          <aside className="space-y-4">
            <div className="glass-panel p-3 rounded-3xl border border-border/80 space-y-1 shadow-sm">
              <button
                type="button"
                onClick={() => setActiveTab("library")}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all",
                  activeTab === "library"
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <FolderArchive className="size-4" />
                <span>Biblioteca</span>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-background/50 text-foreground font-bold">
                  {readings.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("favorites")}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all",
                  activeTab === "favorites"
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <Bookmark className="size-4" />
                <span>Favoritos</span>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-background/50 text-foreground font-bold">
                  {favorites.length}
                </span>
              </button>
            </div>

            {/* Armazenamento Local Widget */}
            <div className="glass-panel p-4 rounded-3xl border border-border/80 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <HardDrive className="size-4 text-accent" />
                <span>Armazenamento Local</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {readings.length} leitura(s) salvas no IndexedDB deste navegador ({formatSize(totalBytes)}).
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-accent rounded-full"
                  style={{ width: `${Math.min(100, Math.max(5, readings.length * 10))}%` }}
                />
              </div>
            </div>
          </aside>

          {/* Conteúdo Principal do Dashboard */}
          <section className="space-y-6 min-w-0">
            {/* Top Dropzone Card Rápido (Inspiração 03) */}
            <div className="glass-panel p-6 rounded-3xl border-2 border-dashed border-border/80 text-center relative overflow-hidden group hover:border-accent/60 transition-all shadow-sm">
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                id="library-quick-upload"
                disabled={isUploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleQuickUpload(file);
                }}
              />
              <label
                htmlFor="library-quick-upload"
                className="flex flex-col items-center justify-center cursor-pointer"
              >
                <div className="size-12 rounded-2xl bg-accent/15 text-accent flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Cloud className="size-6 stroke-[1.5]" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {isUploading ? "Processando e importando..." : "Arraste seu PDF aqui ou clique para Enviar"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Adicione novos documentos para ouvir a narração instantaneamente
                </p>
              </label>
            </div>

            {/* Barra de Busca e Filtros de Tags */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar leituras…"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-accent text-foreground"
                />
              </div>

              {/* Tags de Filtro */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                {TAG_PRESETS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setActiveTag(t)}
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded-full transition-colors shrink-0",
                      activeTag === t
                        ? "bg-accent/20 text-accent font-semibold ring-1 ring-accent/40"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid de Cards de Leituras (Inspiração 03) */}
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando leituras salvas…</p>
            ) : filteredReadings.length === 0 ? (
              <div className="glass-panel rounded-3xl p-12 text-center border border-border/80">
                <FileText className="size-10 text-muted-foreground mx-auto mb-3 stroke-1" />
                <h3 className="text-base font-bold text-foreground">Nenhuma leitura encontrada</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  {searchQuery
                    ? "Nenhum documento corresponde à sua pesquisa."
                    : "Envie um arquivo PDF acima para começar a sua biblioteca com narração."}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredReadings.map((reading, idx) => {
                  const gradientClass = COVER_GRADIENTS[idx % COVER_GRADIENTS.length];
                  const isFav = favorites.includes(reading.id);
                  const approxTotalSentences = Math.max(1, reading.pageCount * 12);
                  const progressPct =
                    reading.lastIndex > 0
                      ? Math.min(100, Math.max(5, Math.round(((reading.lastIndex + 1) / approxTotalSentences) * 100)))
                      : 0;

                  // Estimated minutes left (~1.5 min per page)
                  const estimatedMinsLeft = Math.max(1, Math.ceil(reading.pageCount * 1.5));

                  return (
                    <div
                      key={reading.id}
                      className="glass-panel group flex flex-col justify-between rounded-3xl p-4 border border-border/80 hover:border-accent/40 hover:shadow-lg transition-all duration-200"
                    >
                      <div>
                        {/* Top Card: Capa Estilizada + Título */}
                        <div className="flex items-start gap-3 mb-3">
                          <div
                            className={cn(
                              "size-14 rounded-2xl bg-gradient-to-br p-2 flex flex-col justify-between shrink-0 shadow-md",
                              gradientClass
                            )}
                          >
                            <FileText className="size-4 opacity-80" />
                            <span className="text-[9px] font-mono font-bold tracking-tight line-clamp-1">
                              PDF
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            {editingId === reading.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  autoFocus
                                  value={draft}
                                  onChange={(e) => setDraft(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") void saveTitle(reading.id);
                                    if (e.key === "Escape") setEditingId(null);
                                  }}
                                  className="w-full px-2 py-1 text-xs border border-border rounded-lg bg-background"
                                />
                                <button
                                  type="button"
                                  onClick={() => void saveTitle(reading.id)}
                                  className="p-1 text-accent hover:bg-secondary rounded"
                                >
                                  <Check className="size-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-1">
                                <h4 className="text-xs font-bold text-foreground line-clamp-2 leading-snug">
                                  {reading.title}
                                </h4>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDraft(reading.title);
                                    setEditingId(reading.id);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground transition-opacity"
                                  title="Renomear"
                                >
                                  <Pencil className="size-3" />
                                </button>
                              </div>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                              {reading.pageCount} páginas • {formatSize(reading.size)}
                            </p>
                          </div>
                        </div>

                        {/* Barra de Progresso de Leitura */}
                        <div className="space-y-1 mb-3">
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                            <span>Progresso da Leitura</span>
                            <span className="font-bold text-foreground">{progressPct}%</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full bg-accent rounded-full transition-all"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>

                        {/* Badges de Duração & Voz (Inspiração 03) */}
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-[10px] font-medium text-foreground">
                            <Clock className="size-3 text-muted-foreground" />
                            {estimatedMinsLeft} min restantes
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-[10px] font-medium text-foreground">
                            <Mic className="size-3 text-accent" />
                            Voz Neural
                          </span>
                        </div>
                      </div>

                      {/* Ações Inferiores: Ouvir / Download / Excluir */}
                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/60">
                        <Link
                          href={`/?doc=${reading.id}`}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-semibold shadow-md shadow-accent/20 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                          <Play className="size-3.5 fill-current" />
                          <span>Ouvir Áudio</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => toggleFavorite(reading.id)}
                          title={isFav ? "Remover dos Favoritos" : "Favoritar"}
                          className={cn(
                            "p-2 rounded-xl border border-border/80 hover:bg-secondary transition-colors",
                            isFav ? "text-amber-500 fill-amber-500" : "text-muted-foreground"
                          )}
                        >
                          <Bookmark className={cn("size-3.5", isFav ? "fill-current" : "")} />
                        </button>

                        <button
                          type="button"
                          onClick={() => void download(reading.id)}
                          title="Baixar PDF Original"
                          className="p-2 rounded-xl border border-border/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Download className="size-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => void remove(reading.id)}
                          title="Excluir leitura"
                          className="p-2 rounded-xl border border-border/80 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
