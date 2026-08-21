"use client";

import { useState, useEffect } from "react";
import { StickyNote, Trash2, Check, X, Quote } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  NOTE_COLORS,
  type DocumentNote,
  type NoteColor,
} from "@/lib/domain/document-note.types";
import { cn } from "@/lib/utils";

interface NoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sentenceIndex: number;
  selectedText: string;
  page?: number;
  editingNote?: DocumentNote | null;
  onSave: (data: {
    sentenceIndex: number;
    selectedText: string;
    content: string;
    title?: string;
    color: NoteColor;
    page?: number;
  }) => void;
  onDelete?: (noteId: string) => void;
}

export function NoteDialog({
  open,
  onOpenChange,
  sentenceIndex,
  selectedText,
  page,
  editingNote,
  onSave,
  onDelete,
}: NoteDialogProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState<NoteColor>("amber");

  useEffect(() => {
    if (editingNote) {
      setTitle(editingNote.title || "");
      setContent(editingNote.content || "");
      setColor(editingNote.color || "amber");
    } else {
      setTitle("");
      setContent("");
      setColor("amber");
    }
  }, [editingNote, open]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    onSave({
      sentenceIndex: editingNote ? editingNote.sentenceIndex : sentenceIndex,
      selectedText: editingNote ? editingNote.selectedText : selectedText,
      title: title.trim() || undefined,
      content: content.trim(),
      color,
      page: editingNote?.page ?? page,
    });

    onOpenChange(false);
  };

  const handleDelete = () => {
    if (editingNote && onDelete) {
      onDelete(editingNote.id);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg glass-panel max-h-[85dvh] flex flex-col p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-border shadow-2xl">
        <DialogHeader className="shrink-0 space-y-1 text-left">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <StickyNote className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                {editingNote ? "Editar Anotação" : "Bloco de Notas"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {page ? `Página ${page}` : "Anotação vinculada ao trecho"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSave} className="flex-1 flex flex-col gap-3.5 overflow-y-auto pt-2 pb-2">
          {/* Citação do Trecho Selecionado */}
          <div className="rounded-xl border border-border/80 bg-secondary/50 p-3 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-foreground mb-1">
              <Quote className="size-3 text-accent" />
              <span>Trecho selecionado:</span>
            </div>
            <p className="italic text-muted-foreground line-clamp-3 leading-relaxed">
              "{editingNote ? editingNote.selectedText : selectedText}"
            </p>
          </div>

          {/* Seletor de Cores de Etiqueta */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Etiqueta de cor
            </label>
            <div className="flex items-center gap-2">
              {NOTE_COLORS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setColor(opt.id)}
                  title={opt.label}
                  aria-label={opt.label}
                  className={cn(
                    "size-6 sm:size-7 rounded-full transition-transform cursor-pointer border border-white/40",
                    opt.id === "amber" && "bg-amber-400",
                    opt.id === "emerald" && "bg-emerald-400",
                    opt.id === "sky" && "bg-sky-400",
                    opt.id === "purple" && "bg-purple-400",
                    opt.id === "rose" && "bg-rose-400",
                    color === opt.id
                      ? "ring-2 ring-accent scale-110 shadow-sm"
                      : "opacity-80 hover:opacity-100 hover:scale-105"
                  )}
                />
              ))}
            </div>
          </div>

          {/* Título Opcional */}
          <div className="space-y-1">
            <label htmlFor="note-title" className="text-xs font-semibold text-foreground">
              Título <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <input
              id="note-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Insight chave, Conceito de prova..."
              className="w-full rounded-xl border border-border bg-card/80 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-accent"
              maxLength={80}
            />
          </div>

          {/* Conteúdo da Anotação */}
          <div className="space-y-1 flex-1 flex flex-col min-h-[120px]">
            <label htmlFor="note-content" className="text-xs font-semibold text-foreground">
              Sua Anotação <span className="text-red-500">*</span>
            </label>
            <textarea
              id="note-content"
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Digite aqui seus comentários, resumo ou ideias..."
              className="w-full flex-1 rounded-xl border border-border bg-card/80 p-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-accent resize-none leading-relaxed"
              autoFocus
            />
          </div>

          <DialogFooter className="shrink-0 flex items-center justify-between sm:justify-between gap-2 pt-2 border-t border-border/60">
            {editingNote && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 rounded-xl transition-colors cursor-pointer"
                title="Excluir anotação"
              >
                <Trash2 className="size-3.5" />
                <span>Excluir</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!content.trim()}
                className="flex items-center gap-1.5 bg-accent hover:bg-accent/90 text-accent-foreground px-4 py-2 text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-40 cursor-pointer"
              >
                <Check className="size-3.5" />
                <span>{editingNote ? "Salvar Alterações" : "Salvar Nota"}</span>
              </button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
