"use client";

import { useState, useRef } from "react";
import { Cloud, FileText, FileUp, Globe, Loader2, Search, Sparkles, Type } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "./app-header";
import { QuickPasteDialog } from "./quick-paste-dialog";
import { WebUrlDialog } from "./web-url-dialog";
import { GeminiKeyDialog } from "./gemini-key-dialog";
import { DeleteConfirmDialog } from "./ui/delete-confirm-dialog";
import { DocumentCard } from "./document-card";
import { LibrarySidebar } from "./library-sidebar";
import { useReaderSettings } from "@/context/reader-settings-context";
import { FORMAT_FILTER_TAGS, useLibrary } from "@/hooks/use-library";
import { useDocumentUploader } from "@/hooks/use-document-uploader";
import { useGeminiApiKey } from "@/hooks/use-gemini-api-key";
import type { DocumentMetadata } from "@/lib/domain/document.types";
import { DocumentProcessingFacade } from "@/lib/facade/document-processing.facade";
import { cn } from "@/lib/utils";

interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  description: string;
  itemTitle?: string | null;
  hasAudioCache?: boolean;
  cacheSizeBytes?: number;
  cacheTrackCount?: number;
  isAudioCacheOnly?: boolean;
  confirmLabel?: string;
  isLoading?: boolean;
  action: () => Promise<void>;
}

export function Library() {
  const { settings } = useReaderSettings();
  const [isPasteOpen, setIsPasteOpen] = useState(false);
  const [isOver, setIsOver] = useState(false);
  const [isWebUrlOpen, setIsWebUrlOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false,
    title: "",
    description: "",
    action: async () => {},
  });

  const { hasApiKey, maskedKey, updateApiKey, apiKey } = useGeminiApiKey();
  const [isGeminiDialogOpen, setIsGeminiDialogOpen] = useState(false);

  const handleRequestDisconnectGeminiKey = () => {
    setConfirmModal({
      isOpen: true,
      title: "Desconectar Chave Gemini",
      description:
        "Tem certeza que deseja desconectar sua chave de IA? Os recursos de narração com voz do Google AI e perguntas ao assistente não estarão disponíveis até você conectar uma nova chave.",
      itemTitle: maskedKey ? `Chave (${maskedKey})` : "Conta Gemini",
      confirmLabel: "Sim, Desconectar",
      action: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        try {
          const success = await updateApiKey(null);
          if (success) {
            toast.success("Conta Gemini desconectada.");
            setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          } else {
            toast.error("Não foi possível desconectar a chave.");
            setConfirmModal((prev) => ({ ...prev, isLoading: false }));
          }
        } catch {
          toast.error("Erro ao desconectar a chave.");
          setConfirmModal((prev) => ({ ...prev, isLoading: false }));
        }
      },
    });
  };

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
    deleteAudioCache,
    clearAllAudioCache,
    downloadOriginal,
    refresh,
    totalBytes,
    audioCacheStats,
  } = libraryVM;

  const uploaderVM = useDocumentUploader({
    onSuccess: (doc) => {
      toast.success(`"${doc.metadata.title}" adicionado à biblioteca!`);
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

  const handleRequestDeleteDocument = (doc: DocumentMetadata) => {
    const docCache = audioCacheStats.byDocument[doc.id];
    const hasCache = Boolean(docCache && docCache.trackCount > 0);

    setConfirmModal({
      isOpen: true,
      title: "Excluir Leitura",
      description: "Você tem certeza que deseja excluir esta leitura da sua biblioteca?",
      itemTitle: doc.title,
      hasAudioCache: hasCache,
      cacheSizeBytes: docCache?.sizeBytes || 0,
      cacheTrackCount: docCache?.trackCount || 0,
      isAudioCacheOnly: false,
      confirmLabel: "Sim, excluir leitura",
      action: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        try {
          await deleteDocument(doc.id);
          toast.success("Leitura e dados associados excluídos.");
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        } catch {
          toast.error("Não foi possível excluir a leitura.");
          setConfirmModal((prev) => ({ ...prev, isLoading: false }));
        }
      },
    });
  };

  const handleRequestDeleteAudioCache = (doc: DocumentMetadata) => {
    const docCache = audioCacheStats.byDocument[doc.id];

    setConfirmModal({
      isOpen: true,
      title: "Apagar Cache de Áudio",
      description:
        "Deseja apagar apenas as faixas de áudio em cache desta leitura? O arquivo original e seu texto permanecerão salvos na biblioteca.",
      itemTitle: doc.title,
      hasAudioCache: true,
      cacheSizeBytes: docCache?.sizeBytes || 0,
      cacheTrackCount: docCache?.trackCount || 0,
      isAudioCacheOnly: true,
      confirmLabel: "Apagar Faixas de Áudio",
      action: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        try {
          await deleteAudioCache(doc.id);
          toast.success("Cache de áudio desta leitura foi apagado.");
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        } catch {
          toast.error("Erro ao apagar cache de áudio.");
          setConfirmModal((prev) => ({ ...prev, isLoading: false }));
        }
      },
    });
  };

  const handleRequestClearAllAudioCache = () => {
    setConfirmModal({
      isOpen: true,
      title: "Limpar Todo o Cache de Áudio IA",
      description:
        "Você tem certeza que deseja apagar todas as faixas de áudio geradas por IA salvas no seu navegador?",
      itemTitle: "Todas as leituras",
      hasAudioCache: true,
      cacheSizeBytes: audioCacheStats.totalBytes,
      cacheTrackCount: audioCacheStats.totalTracks,
      isAudioCacheOnly: true,
      confirmLabel: "Limpar Todos os Áudios",
      action: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        try {
          await clearAllAudioCache();
          toast.success("Todo o cache de áudio foi limpo.");
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        } catch {
          toast.error("Erro ao limpar cache de áudio.");
          setConfirmModal((prev) => ({ ...prev, isLoading: false }));
        }
      },
    });
  };

  const handleQuickPasteSubmit = async (pastedTitle: string, pastedText: string) => {
    await uploaderVM.uploadRawText(pastedTitle, pastedText);
    await libraryVM.refresh();
  };

  const handleWebUrlSubmit = async (doc: import("@/lib/domain/document.types").ParsedDocument) => {
    try {
      await DocumentProcessingFacade.getInstance().saveParsedDocument(doc);
      toast.success(`Artigo "${doc.metadata.title}" adicionado à biblioteca com sucesso!`);
      await libraryVM.refresh();
    } catch {
      toast.error("Erro ao salvar artigo na biblioteca.");
    }
  };

  return (
    <div
      className="bg-background text-foreground min-h-screen transition-colors pb-10"
      data-reading-theme={settings.theme}
    >
      <AppHeader />

      {/* Modal Reutilizável de Confirmação com Alerta de Gastos com IA */}
      <DeleteConfirmDialog
        open={confirmModal.isOpen}
        onOpenChange={(open) => setConfirmModal((prev) => ({ ...prev, isOpen: open }))}
        title={confirmModal.title}
        description={confirmModal.description}
        itemTitle={confirmModal.itemTitle}
        hasAudioCache={confirmModal.hasAudioCache}
        cacheSizeBytes={confirmModal.cacheSizeBytes}
        cacheTrackCount={confirmModal.cacheTrackCount}
        isAudioCacheOnly={confirmModal.isAudioCacheOnly}
        confirmLabel={confirmModal.confirmLabel}
        isLoading={confirmModal.isLoading}
        onConfirm={confirmModal.action}
      />

      <main className="mx-auto max-w-7xl px-3 sm:px-4 py-4 sm:py-8">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <LibrarySidebar
            activeTab={activeTab}
            documentCount={documents.length}
            favoritesCount={favorites.length}
            totalBytes={totalBytes}
            audioCacheStats={audioCacheStats}
            hasApiKey={hasApiKey}
            maskedKey={maskedKey}
            onTabChange={setActiveTab}
            onClearAudioCache={handleRequestClearAllAudioCache}
            onConnectGemini={() => setIsGeminiDialogOpen(true)}
            onDisconnectGemini={handleRequestDisconnectGeminiKey}
          />

          {/* Conteúdo Principal da Biblioteca */}
          <section
            aria-label="Gerenciador da biblioteca de leituras multi-formato"
            className="space-y-4 sm:space-y-6 min-w-0"
          >
            {/* Dropzone Compacta Superior */}
            <div
              role="region"
              aria-label="Zona de soltar arquivos e documentos para a biblioteca"
              data-webmcp-tool="uploadDocument"
              data-webmcp-action="quickUploadMulti"
              data-webmcp-schema="multipart/form-data"
              onDragOver={(e) => {
                e.preventDefault();
                setIsOver(true);
              }}
              onDragLeave={() => setIsOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  void uploaderVM.uploadFiles(e.dataTransfer.files);
                }
              }}
              className={cn(
                "glass-panel p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-2 border-dashed border-border/80 text-center relative overflow-hidden transition-all shadow-xs",
                isOver
                  ? "border-accent bg-accent/10 scale-[1.01] ring-4 ring-accent/20"
                  : "hover:border-accent/60 hover:bg-card/90"
              )}
            >
              <input
                ref={fileInputRef}
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
                <div className="size-10 sm:size-12 rounded-2xl bg-accent/15 text-accent flex items-center justify-center mb-2 sm:mb-3 transition-transform">
                  {uploaderVM.isUploading ? (
                    <Loader2 className="size-5 sm:size-6 animate-spin" aria-hidden="true" />
                  ) : (
                    <Cloud className="size-5 sm:size-6 stroke-[1.5]" aria-hidden="true" />
                  )}
                </div>

                <p className="text-xs sm:text-sm font-semibold text-foreground">
                  {uploaderVM.isUploading
                    ? uploaderVM.currentProgress || "Processando e importando..."
                    : "Arraste seus documentos (.pdf, .epub, .docx, .odt, .txt, .md) aqui ou toque para Enviar"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Importe livros, apostilas ou textos para ouvir a narração instantaneamente
                </p>

                {/* Botões de Ação Principais */}
                <div className="mt-3.5 sm:mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
                  <button
                    type="button"
                    disabled={uploaderVM.isUploading}
                    aria-controls="library-multi-upload"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-accent-foreground shadow-md shadow-accent/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-60 cursor-pointer"
                  >
                    <FileUp className="size-4" aria-hidden="true" />
                    <span>Selecionar Arquivo</span>
                  </button>

                  <button
                    type="button"
                    disabled={uploaderVM.isUploading}
                    onClick={() => setIsPasteOpen(true)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary/80 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-foreground hover:bg-secondary transition-all hover:scale-105 active:scale-95 disabled:opacity-60 cursor-pointer"
                  >
                    <Type className="size-3.5 sm:size-4 text-accent" aria-hidden="true" />
                    <span>Colar Texto</span>
                  </button>

                  <button
                    type="button"
                    data-cy="library-web-url-btn"
                    disabled={uploaderVM.isUploading}
                    onClick={() => setIsWebUrlOpen(true)}
                    aria-label="Ler artigo da web a partir de uma URL"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary/80 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-foreground hover:bg-secondary transition-all hover:scale-105 active:scale-95 disabled:opacity-60 cursor-pointer"
                  >
                    <Globe className="size-3.5 sm:size-4 text-sky-500" aria-hidden="true" />
                    <span>Ler Artigo da Web</span>
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
                {filteredDocuments.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    isFav={favorites.includes(doc.id)}
                    editingId={editingId}
                    draftTitle={draftTitle}
                    docCache={audioCacheStats.byDocument[doc.id]}
                    onToggleFavorite={toggleFavorite}
                    onSetEditingId={setEditingId}
                    onSetDraftTitle={setDraftTitle}
                    onSaveTitle={handleSaveTitle}
                    onDownload={(id) => void downloadOriginal(id)}
                    onDeleteAudioCache={handleRequestDeleteAudioCache}
                    onDeleteDocument={handleRequestDeleteDocument}
                  />
                ))}
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

      {/* Diálogo de Extrair Artigo da Web */}
      <WebUrlDialog
        isOpen={isWebUrlOpen}
        onClose={() => setIsWebUrlOpen(false)}
        onSubmit={handleWebUrlSubmit}
      />

      {/* Diálogo da Chave Gemini */}
      <GeminiKeyDialog
        apiKey={apiKey}
        onChange={updateApiKey}
        open={isGeminiDialogOpen}
        onOpenChange={setIsGeminiDialogOpen}
        trigger={<span className="hidden" />}
      />
    </div>
  );
}
