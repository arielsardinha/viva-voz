"use client";

import {
  AlertTriangle,
  Loader2,
  Sparkles,
  Trash2,
  VolumeX,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  itemTitle?: string | null;
  /** Se o item possui áudio em cache gerado por IA */
  hasAudioCache?: boolean;
  cacheSizeBytes?: number;
  cacheTrackCount?: number;
  /** Se a ação é especificamente apagar apenas o cache de áudio */
  isAudioCacheOnly?: boolean;
  confirmLabel?: string;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 KB";
  return bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  itemTitle,
  hasAudioCache = false,
  cacheSizeBytes = 0,
  cacheTrackCount = 0,
  isAudioCacheOnly = false,
  confirmLabel = "Sim, excluir",
  isLoading = false,
  onConfirm,
}: DeleteConfirmDialogProps) {
  const showAiWarning = hasAudioCache || isAudioCacheOnly;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-webmcp-tool="confirmDeletion"
        data-webmcp-action="confirmDeleteAction"
        className="w-[92vw] max-w-md rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-border/80 shadow-2xl glass-panel"
      >
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center gap-3">
            <div className="flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-2xl bg-destructive/15 text-destructive ring-1 ring-destructive/30">
              {isAudioCacheOnly ? (
                <VolumeX className="size-5" aria-hidden="true" />
              ) : (
                <Trash2 className="size-5" aria-hidden="true" />
              )}
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                {title}
              </DialogTitle>
              {itemTitle && (
                <p className="text-xs font-semibold text-muted-foreground truncate max-w-[240px] sm:max-w-[280px]">
                  {itemTitle}
                </p>
              )}
            </div>
          </div>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-1">
            {description}
          </DialogDescription>
        </DialogHeader>

        {/* ALERTA DE DESTAQUE: Aviso sobre perda de faixas de áudio IA e novos gastos de tokens */}
        {showAiWarning && (
          <div
            role="alert"
            className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 sm:p-4 text-amber-500 dark:text-amber-400 space-y-2 shadow-inner"
          >
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-300">
              <AlertTriangle className="size-4 shrink-0 text-amber-500 animate-pulse" aria-hidden="true" />
              <span>Atenção: Faixas de Áudio IA em Alta Qualidade</span>
            </div>

            <p className="text-[11px] sm:text-xs leading-relaxed text-foreground/90">
              {isAudioCacheOnly ? (
                <>
                  Você está prestes a apagar{" "}
                  <strong className="font-bold text-amber-600 dark:text-amber-300">
                    {cacheTrackCount > 0 ? `${cacheTrackCount} faixas` : "o cache"} ({formatBytes(cacheSizeBytes)})
                  </strong>{" "}
                  de áudio já sintetizadas com voz neural de IA.
                </>
              ) : (
                <>
                  Este documento possui{" "}
                  <strong className="font-bold text-amber-600 dark:text-amber-300">
                    {cacheTrackCount > 0 ? `${cacheTrackCount} faixas de áudio` : "áudio"} em cache ({formatBytes(cacheSizeBytes)})
                  </strong>
                  .
                </>
              )}
            </p>

            <div className="flex items-start gap-1.5 pt-1 text-[10px] sm:text-[11px] font-medium text-amber-700 dark:text-amber-200 border-t border-amber-500/20">
              <Sparkles className="size-3.5 shrink-0 text-amber-500 mt-0.5" aria-hidden="true" />
              <span>
                Se você ouvir este conteúdo novamente, novas requisições serão feitas e{" "}
                <strong>novos créditos/tokens de IA serão consumidos</strong>.
              </span>
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 sm:pt-4">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => onOpenChange(false)}
            className="inline-flex items-center justify-center rounded-xl border border-border bg-secondary/80 px-4 py-2.5 text-xs sm:text-sm font-semibold text-foreground hover:bg-secondary transition-colors disabled:opacity-50 cursor-pointer min-h-[44px]"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => void onConfirm()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-xs sm:text-sm font-semibold text-destructive-foreground shadow-md shadow-destructive/20 hover:bg-destructive/90 active:scale-95 transition-all disabled:opacity-50 cursor-pointer min-h-[44px]"
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="size-4" aria-hidden="true" />
            )}
            <span>{confirmLabel}</span>
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
