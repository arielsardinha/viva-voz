"use client";

import Link from "next/link";
import {
  Bookmark,
  Check,
  Clock,
  Download,
  FileText,
  Mic,
  Pencil,
  Play,
  Sparkles,
  Trash2,
  VolumeX,
} from "lucide-react";
import type { DocumentMetadata } from "@/lib/domain/document.types";
import { cn } from "@/lib/utils";

function formatSize(bytes: number) {
  if (!bytes) return "0 KB";
  return bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// Estilo visual temático por tipo de formato de documento
export const FORMAT_THEMES: Record<
  import("@/lib/domain/document.types").DocumentFormat,
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

export interface AudioCacheEntry {
  trackCount: number;
  sizeBytes: number;
}

interface DocumentCardProps {
  doc: DocumentMetadata;
  isFav: boolean;
  editingId: string | null;
  draftTitle: string;
  docCache?: AudioCacheEntry;
  onToggleFavorite: (id: string) => void;
  onSetEditingId: (id: string | null) => void;
  onSetDraftTitle: (title: string) => void;
  onSaveTitle: (id: string) => Promise<void>;
  onDownload: (id: string) => void;
  onDeleteAudioCache: (doc: DocumentMetadata) => void;
  onDeleteDocument: (doc: DocumentMetadata) => void;
}

export function DocumentCard({
  doc,
  isFav,
  editingId,
  draftTitle,
  docCache,
  onToggleFavorite,
  onSetEditingId,
  onSetDraftTitle,
  onSaveTitle,
  onDownload,
  onDeleteAudioCache,
  onDeleteDocument,
}: DocumentCardProps) {
  const formatInfo = FORMAT_THEMES[doc.format] ?? FORMAT_THEMES.txt;
  const hasCache = Boolean(docCache && docCache.trackCount > 0);

  return (
    <div className="glass-panel group flex flex-col justify-between rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border border-border/80 hover:border-accent/40 hover:shadow-lg transition-all duration-200">
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
                  onChange={(e) => onSetDraftTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void onSaveTitle(doc.id);
                    if (e.key === "Escape") onSetEditingId(null);
                  }}
                  className="w-full px-2 py-1 text-xs border border-border rounded-lg bg-background"
                />
                <button
                  type="button"
                  onClick={() => void onSaveTitle(doc.id)}
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
                    onSetDraftTitle(doc.title);
                    onSetEditingId(doc.id);
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

        {/* Badges de Duração, Palavras e Cache IA */}
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
          {hasCache && docCache && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/15 border border-accent/30 text-[10px] font-bold text-accent">
              <Sparkles className="size-3" />
              Áudio: {formatSize(docCache.sizeBytes)} ({docCache.trackCount}{" "}
              {docCache.trackCount === 1 ? "faixa" : "faixas"})
            </span>
          )}
        </div>
      </div>

      {/* Ações Inferiores: Ouvir / Favoritar / Download / Limpar Áudio / Excluir */}
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
          onClick={() => onToggleFavorite(doc.id)}
          title={isFav ? "Remover dos Favoritos" : "Favoritar"}
          aria-label={isFav ? "Remover dos Favoritos" : "Favoritar"}
          className={cn(
            "p-1.5 sm:p-2 rounded-xl border border-border/80 hover:bg-secondary transition-colors cursor-pointer",
            isFav ? "text-amber-500 fill-amber-500" : "text-muted-foreground"
          )}
        >
          <Bookmark className={cn("size-3.5", isFav ? "fill-current" : "")} />
        </button>

        <button
          type="button"
          onClick={() => onDownload(doc.id)}
          title="Baixar Arquivo Original"
          aria-label="Baixar Arquivo Original"
          className="p-1.5 sm:p-2 rounded-xl border border-border/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <Download className="size-3.5" />
        </button>

        {/* Botão para apagar apenas o cache de áudio deste arquivo */}
        {hasCache && (
          <button
            type="button"
            onClick={() => onDeleteAudioCache(doc)}
            title="Apagar cache de áudio deste arquivo"
            aria-label="Apagar cache de áudio deste arquivo"
            className="p-1.5 sm:p-2 rounded-xl border border-border/80 hover:bg-amber-500/15 text-muted-foreground hover:text-amber-500 transition-colors cursor-pointer"
          >
            <VolumeX className="size-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={() => onDeleteDocument(doc)}
          title="Excluir leitura"
          aria-label="Excluir leitura"
          className="p-1.5 sm:p-2 rounded-xl border border-border/80 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
