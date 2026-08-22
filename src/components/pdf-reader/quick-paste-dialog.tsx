"use client";

import { useState, useId } from "react";
import {
  Clock,
  FilePlus,
  FileText,
  Type,
  X,
  Volume2,
} from "lucide-react";
import { ReadingMetricsService } from "@/lib/domain/reading-metrics.service";
import { cn } from "@/lib/utils";

interface QuickPasteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, text: string) => Promise<void>;
  isLoading?: boolean;
}

export function QuickPasteDialog({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: QuickPasteDialogProps) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const titleId = useId();
  const textId = useId();

  if (!isOpen) return null;

  const wordCount = ReadingMetricsService.countWords(text);
  const estimatedMinutes = ReadingMetricsService.calculateEstimatedMinutes(wordCount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isLoading) return;
    await onSubmit(title.trim(), text.trim());
    setTitle("");
    setText("");
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${titleId}-header`}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-0 duration-200"
    >
      <div
        className="relative w-full max-w-xl flex flex-col max-h-[85dvh] sm:max-h-[80dvh] rounded-2xl sm:rounded-3xl border border-border/80 bg-card p-4 sm:p-6 shadow-2xl glass-panel"
        data-webmcp-tool="quickPasteDocument"
        data-webmcp-action="submitRawText"
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 sm:size-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Type className="size-4 sm:size-5" />
            </div>
            <div>
              <h3 id={`${titleId}-header`} className="text-sm sm:text-base font-bold text-foreground">
                Colar ou Digitar Texto
              </h3>
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                Insira textos, resumos ou notas para ouvir imediatamente
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela"
            className="flex size-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Formulário / Corpo com rolagem */}
        <form
          id="quick-paste-form"
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 min-h-0 overflow-y-auto py-3 sm:py-4 space-y-3 sm:space-y-4"
        >
          <div className="space-y-1.5">
            <label
              htmlFor={titleId}
              className="text-xs font-semibold text-foreground flex items-center gap-1.5"
            >
              <FileText className="size-3.5 text-muted-foreground" />
              <span>Título da Leitura (Opcional)</span>
            </label>
            <input
              id={titleId}
              name="title"
              data-cy="quick-paste-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Resumo de História, Artigo sobre IA..."
              aria-label="Título opcional da leitura"
              className="w-full px-3 py-2 text-xs sm:text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-accent text-foreground"
            />
          </div>

          <div className="space-y-1.5 flex-1 flex flex-col min-h-[140px]">
            <label
              htmlFor={textId}
              className="text-xs font-semibold text-foreground flex items-center justify-between"
            >
              <span>Conteúdo do Texto *</span>
              <span className="text-[10px] text-muted-foreground font-normal">
                {wordCount} palavras
              </span>
            </label>
            <textarea
              id={textId}
              name="content"
              data-cy="quick-paste-content-textarea"
              required
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Cole seu texto aqui ou comece a digitar..."
              aria-label="Conteúdo de texto para conversão em áudio"
              className="w-full flex-1 p-3 text-xs sm:text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-accent text-foreground resize-none"
            />
          </div>

          {/* Métricas estimadas */}
          {wordCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-secondary/50 border border-border/40 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                <Clock className="size-3 text-accent" />
                ~{estimatedMinutes} min de áudio
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Volume2 className="size-3" />
                Pronto para sintetização neural
              </span>
            </div>
          )}
        </form>

        {/* Rodapé de Ações com Safe Area */}
        <div className="flex flex-col-reverse xs:flex-row items-center justify-end gap-2 pt-3 sm:pt-4 border-t border-border/60 shrink-0 pb-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-full xs:w-auto px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground rounded-xl hover:bg-secondary transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="quick-paste-form"
            data-cy="quick-paste-submit-btn"
            disabled={!text.trim() || isLoading}
            className="w-full xs:w-auto flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-semibold shadow-xs hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
          >
            <FilePlus className="size-3.5" />
            <span>{isLoading ? "Processando..." : "Criar Leitura"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
