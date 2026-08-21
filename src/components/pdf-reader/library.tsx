"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bookmark,
  Check,
  Clock,
  Cloud,
  Download,
  FileText,
  FolderArchive,
  HardDrive,
  Mic,
  Pencil,
  Play,
  Search,
  Sparkles,
  Trash2,
  Type,
} from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "./app-header";
import { QuickPasteDialog } from "./quick-paste-dialog";
import { useReaderSettings } from "@/context/reader-settings-context";
import { FORMAT_FILTER_TAGS, useLibrary } from "@/hooks/use-library";
import { useDocumentUploader } from "@/hooks/use-document-uploader";
import type { DocumentFormat } from "@/lib/domain/document.types";
import { cn } from "@/lib/utils";

function formatSize(bytes: number) {
  if (!bytes) return "0 KB";
  return bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// Estilo visual temático por tipo de formato de documento
const FORMAT_THEMES: Record<
  DocumentFormat,
  { badgeColor: string; gradient: string; label: string }
> = {
  pdf: {
    badgeColor: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    gradient: "from-slate-800 to-indigo-950 text-indigo-200",
    label: "PDF",
  },
  epub: {
    badgeColor: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    gradient: "from-purple-900 to-indigo-950 text-purple-200",
    label: "EPUB",
  },
  docx: {
    badgeColor: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
    gradient: "from-blue-900 to-slate-950 text-blue-200",
    label: "DOCX",
  },
  txt: {
    badgeColor: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    gradient: "from-amber-950 to-orange-950 text-amber-200",
    label: "TXT",
  },
  md: {
    badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    gradient: "from-emerald-900 to-teal-950 text-emerald-200",
    label: "MD",
  },
  paste: {
    badgeColor: "bg-pink-500/15 text-pink-400 border-pink-500/30",
    gradient: "from-rose-950 to-pink-950 text-rose-200",
    label: "NOTA",
  },
  web: {
    badgeColor: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    gradient: "from-cyan-950 to-slate-950 text-cyan-200",
    label: "WEB",
  },
  pptx: {
    badgeColor: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    gradient: "from-orange-950 to-red-950 text-orange-200",
    label: "PPTX",
  },
  odt: {
    badgeColor: "bg-teal-500/15 text-teal-400 border-teal-500/30",
    gradient: "from-teal-950 to-slate-950 text-teal-200",
    label: "ODT",
  },
  ocr: {
    badgeColor: "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30",
    gradient: "from-fuchsia-950 to-purple-950 text-fuchsia-200",
    label: "OCR",
  },
};

export function Library() {
  const { settings } = useReaderSettings();
  const [isPasteOpen, setIsPasteOpen] = useState(false);

  const libraryVM = useLibrary();
  const {
    documents,
    filteredDocuments,
    isLoading,
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    activeFormat,
    setActiveFormat,
    favorites,
    toggleFavorite,
    editingId,
    setEditingId,
    draftTitle,
    setDraftTitle,
    renameDocument,
    deleteDocument,
    downloadOriginal,
    refresh,
    totalBytes,
  } = libraryVM;

  const uploaderVM = useDocumentUploader({
    onSuccess: (doc) => {
      toast.success(`“${doc.metadata.title}” adicionado à biblioteca!`);
      void refresh();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao processar arquivo.");
    },
  });

  const handleSaveTitle = async (id: string) => {
    await renameDocument(id, draftTitle);
    toast.success("Título atualizado.");
  };

  const handleRemove = async (id: string) => {
    await deleteDocument(id);
    toast.success("Leitura removida.");
  };

  const handleQuickPasteSubmit = async (title: string, text: string) => {
    const doc = await uploaderVM.uploadRawText(title, text);
    if (doc) {
      toast.success("Nota de texto criada com sucesso!");
      void refresh();
    }
  };

  return (
    <div
      className="bg-background text-foreground min-h-screen transition-colors pb-10"
      data-reading-theme={settings.theme}
    >
      <AppHeader />

      <main className="mx-auto max-w-7xl px-3 sm:px-4 py-4 sm:py-8">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          {/* Sidebar Navigation */}
          <aside className="space-y-3 sm:space-y-4">
            <div className="glass-panel p-1.5 sm:p-3 rounded-2xl sm:rounded-3xl border border-border/80 flex sm:flex-col gap-1.5 shadow-xs">
              <button
                type="button"
                onClick={() => setActiveTab("library")}
                className={cn(
                  "flex-1 sm:flex-initial w-full flex items-center justify-center sm:justify-start gap-2 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs font-semibold transition-all",
                  activeTab === "library"
                    ? "bg-accent text-accent-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <FolderArchive className="size-4 shrink-0" />
                <span>Biblioteca</span>
                <span className="ml-1 sm:ml-auto text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-background/50 text-foreground font-bold">
                  {documents.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("favorites")}
                className={cn(
                  "flex-1 sm:flex-initial w-full flex items-center justify-center sm:justify-start gap-2 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs font-semibold transition-all",
                  activeTab === "favorites"
                    ? "bg-accent text-accent-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <Bookmark className="size-4 shrink-0" />
                <span>Favoritos</span>
                <span className="ml-1 sm:ml-auto text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-background/50 text-foreground font-bold">
                  {favorites.length}
                </span>
              </button>
            </div>

            {/* Armazenamento Local Widget */}
            <div className="glass-panel p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-border/80 shadow-xs space-y-2 sm:space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <HardDrive className="size-3.5 sm:size-4 text-accent" />
                <span>Armazenamento Local</span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-snug">
                {documents.length} documento(s) salvos no navegador ({formatSize(totalBytes)}).
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(5, documents.length * 10))}%` }}
                />
              </div>
            </div>
          </aside>

          {/* Conteúdo Principal da Biblioteca */}
          <section
            aria-label="Gerenciador da biblioteca de leituras multi-formato"
            className="space-y-4 sm:space-y-6 min-w-0"
          >
            {/* Dropzone Compacta Superior */}
            <div
              data-webmcp-tool="uploadDocument"
              data-webmcp-action="quickUploadMulti"
              data-webmcp-schema="multipart/form-data"
              className="glass-panel p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-2 border-dashed border-border/80 text-center relative overflow-hidden group hover:border-accent/60 transition-all shadow-xs"
            >
              <input
                type="file"
                name="libraryFiles"
                multiple
                accept={uploaderVM.acceptAttribute}
                className="sr-only"
                id="library-multi-upload"
                disabled={uploaderVM.isUploading}
                aria-label="Selecionar arquivos para adicionar à biblioteca"
                onChange={(e) => {
                  if (e.target.files) void uploaderVM.uploadFiles(e.target.files);
                }}
              />

              <div className="flex flex-col items-center justify-center">
                <label
                  htmlFor="library-multi-upload"
                  className="cursor-pointer flex flex-col items-center justify-center w-full"
                >
                  <div className="size-10 sm:size-12 rounded-2xl bg-accent/15 text-accent flex items-center justify-center mb-2 sm:mb-3 group-hover:scale-110 transition-transform">
                    <Cloud className="size-5 sm:size-6 stroke-[1.5]" aria-hidden="true" />
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-foreground">
                    {uploaderVM.isUploading
                      ? uploaderVM.currentProgress || "Processando e importando..."
                      : "Arraste seus documentos (.pdf, .epub, .docx, .txt, .md) aqui ou toque para Enviar"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Importe livros, apostilas ou textos para ouvir a narração instantaneamente
                  </p>
                </label>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPasteOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-secondary/80 text-xs font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  >
                    <Type className="size-3.5 text-accent" />
                    <span>Colar Texto Direto</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Barra de Busca e Filtros de Formatos */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
              <form
                role="search"
                data-webmcp-tool="searchLibrary"
                data-webmcp-action="filterReadings"
                onSubmit={(e) => e.preventDefault()}
                className="relative w-full sm:max-w-xs"
              >
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 sm:size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  id="library-search-input"
                  name="searchQuery"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar leituras…"
                  aria-label="Pesquisar leituras salvas por título"
                  className="w-full pl-9 pr-3 py-1.5 sm:py-2 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-accent text-foreground"
                />
              </form>

              {/* Tags de Filtro por Formato */}
              <div
                role="toolbar"
                aria-label="Filtro por formato de documento"
                className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto pb-0.5 sm:pb-0"
              >
                {FORMAT_FILTER_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setActiveFormat(tag)}
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded-full transition-colors shrink-0",
                      activeFormat === tag
                        ? "bg-accent/20 text-accent font-semibold ring-1 ring-accent/40"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid de Cards de Documentos */}
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando leituras salvas…</p>
            ) : filteredDocuments.length === 0 ? (
              <div className="glass-panel rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center border border-border/80">
                <FileText className="size-10 text-muted-foreground mx-auto mb-3 stroke-1" />
                <h3 className="text-base font-bold text-foreground">Nenhuma leitura encontrada</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  {searchQuery
                    ? "Nenhum documento corresponde aos filtros aplicados."
                    : "Envie um arquivo PDF, EPUB, Word ou cole um texto acima para começar a sua biblioteca com narração."}
                </p>
              </div>
            ) : (
              <div className="grid gap-3.5 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredDocuments.map((doc) => {
                  const formatInfo = FORMAT_THEMES[doc.format] || FORMAT_THEMES.txt;
                  const isFav = favorites.includes(doc.id);

                  return (
                    <div
                      key={doc.id}
                      className="glass-panel group flex flex-col justify-between rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border border-border/80 hover:border-accent/40 hover:shadow-lg transition-all duration-200"
                    >
                      <div>
                        {/* Top Card: Capa Estilizada + Formato + Título */}
                        <div className="flex items-start gap-2.5 sm:gap-3 mb-2.5 sm:mb-3">
                          <div
                            className={cn(
                              "size-12 sm:size-14 rounded-2xl bg-gradient-to-br p-2 flex flex-col justify-between shrink-0 shadow-md",
                              formatInfo.gradient
                            )}
                          >
                            <FileText className="size-3.5 sm:size-4 opacity-80" />
                            <span className="text-[9px] font-mono font-bold tracking-tight line-clamp-1">
                              {formatInfo.label}
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            {editingId === doc.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  autoFocus
                                  value={draftTitle}
                                  onChange={(e) => setDraftTitle(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") void handleSaveTitle(doc.id);
                                    if (e.key === "Escape") setEditingId(null);
                                  }}
                                  className="w-full px-2 py-1 text-xs border border-border rounded-lg bg-background"
                                />
                                <button
                                  type="button"
                                  onClick={() => void handleSaveTitle(doc.id)}
                                  className="p-1 text-accent hover:bg-secondary rounded"
                                >
                                  <Check className="size-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-1">
                                <h4 className="text-xs font-bold text-foreground line-clamp-2 leading-snug">
                                  {doc.title}
                                </h4>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDraftTitle(doc.title);
                                    setEditingId(doc.id);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground transition-opacity"
                                  title="Renomear"
                                >
                                  <Pencil className="size-3" />
                                </button>
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <span
                                className={cn(
                                  "px-1.5 py-0.5 rounded text-[9px] font-bold border",
                                  formatInfo.badgeColor
                                )}
                              >
                                {formatInfo.label}
                              </span>
                              {doc.chapterCount > 1 && (
                                <span className="text-[10px] text-muted-foreground">
                                  • {doc.chapterCount} capítulos
                                </span>
                              )}
                              <span className="text-[10px] text-muted-foreground truncate">
                                • {formatSize(doc.sizeBytes)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Badges de Duração & Palavras */}
                        <div className="flex flex-wrap gap-1.5 mb-3 sm:mb-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-[10px] font-medium text-foreground">
                            <Clock className="size-3 text-muted-foreground" />
                            ~{doc.estimatedReadingMinutes} min
                          </span>
                          {doc.wordCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-[10px] font-medium text-foreground">
                              {doc.wordCount} palavras
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-[10px] font-medium text-foreground">
                            <Mic className="size-3 text-accent" />
                            Voz Neural
                          </span>
                        </div>
                      </div>

                      {/* Ações Inferiores: Ouvir / Favoritar / Download / Excluir */}
                      <div className="flex items-center justify-between gap-1.5 sm:gap-2 pt-2.5 sm:pt-3 border-t border-border/60">
                        <Link
                          href={`/?doc=${doc.id}`}
                          className="flex-1 flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-semibold shadow-xs hover:scale-[1.02] active:scale-95 transition-all"
                        >
                          <Play className="size-3.5 fill-current" />
                          <span>Ouvir Áudio</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => toggleFavorite(doc.id)}
                          title={isFav ? "Remover dos Favoritos" : "Favoritar"}
                          aria-label={isFav ? "Remover dos Favoritos" : "Favoritar"}
                          className={cn(
                            "p-1.5 sm:p-2 rounded-xl border border-border/80 hover:bg-secondary transition-colors",
                            isFav ? "text-amber-500 fill-amber-500" : "text-muted-foreground"
                          )}
                        >
                          <Bookmark className={cn("size-3.5", isFav ? "fill-current" : "")} />
                        </button>

                        <button
                          type="button"
                          onClick={() => void downloadOriginal(doc.id)}
                          title="Baixar Arquivo Original"
                          aria-label="Baixar Arquivo Original"
                          className="p-1.5 sm:p-2 rounded-xl border border-border/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Download className="size-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleRemove(doc.id)}
                          title="Excluir leitura"
                          aria-label="Excluir leitura"
                          className="p-1.5 sm:p-2 rounded-xl border border-border/80 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
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

      {/* Diálogo de Colar Texto */}
      <QuickPasteDialog
        isOpen={isPasteOpen}
        onClose={() => setIsPasteOpen(false)}
        onSubmit={handleQuickPasteSubmit}
        isLoading={uploaderVM.isUploading}
      />
    </div>
  );
}
