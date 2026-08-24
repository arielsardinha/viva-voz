"use client";

import { useState, useMemo } from "react";
import {
  StickyNote,
  Search,
  Trash2,
  Edit3,
  ExternalLink,
  Calendar,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  NOTE_COLORS,
  type DocumentNote,
} from "@/lib/domain/document-note.types";
import { cn } from "@/lib/utils";

interface NotesDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notes: DocumentNote[];
  onSelectSentence: (index: number) => void;
  onEditNote: (note: DocumentNote) => void;
  onDeleteNote: (id: string) => void;
}

export function NotesDrawer({
  open,
  onOpenChange,
  notes,
  onSelectSentence,
  onEditNote,
  onDeleteNote,
}: NotesDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredNotes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        (n.title && n.title.toLowerCase().includes(q)) ||
        n.content.toLowerCase().includes(q) ||
        n.selectedText.toLowerCase().includes(q)
    );
  }, [notes, searchQuery]);

  const handleJumpToSentence = (sentenceIndex: number) => {
    onSelectSentence(sentenceIndex);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl glass-panel max-h-[88dvh] flex flex-col p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-border shadow-2xl">
        <DialogHeader className="shrink-0 space-y-1 text-left pb-2 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <StickyNote className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                  <span>Bloco de Notas</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                    {notes.length}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Todas as anotações e reflexões deste documento
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Busca rápida de anotações */}
        {notes.length > 0 && (
          <div className="relative pt-1 shrink-0">
            <Search className="absolute left-3 top-3.5 size-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar em anotações ou trechos..."
              className="w-full rounded-xl border border-border bg-card/80 pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        )}

        {/* Lista de Notas */}
        <div className="flex-1 overflow-y-auto space-y-3 pt-2 pb-2 pr-0.5">
          {notes.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center gap-3">
              <div className="size-12 rounded-2xl bg-secondary/80 flex items-center justify-center text-muted-foreground">
                <StickyNote className="size-6 opacity-60" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Nenhuma anotação criada</p>
                <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                  Selecione qualquer trecho no leitor e clique em <strong>"Bloco de Notas"</strong> para salvar suas ideias.
                </p>
              </div>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Nenhuma anotação encontrada para "{searchQuery}".
            </div>
          ) : (
            filteredNotes.map((note) => {
              const colorOpt =
                NOTE_COLORS.find((c) => c.id === note.color) || NOTE_COLORS[0];
              const dateStr = new Date(note.updatedAt || note.createdAt).toLocaleDateString(
                "pt-BR",
                { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }
              );

              return (
                <div
                  key={note.id}
                  className={cn(
                    "rounded-2xl border p-3.5 transition-all shadow-xs flex flex-col gap-2.5 bg-card/70 hover:border-accent/40",
                    colorOpt.borderClass
                  )}
                >
                  {/* Cabeçalho do Card */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                          colorOpt.badgeClass
                        )}
                      >
                        {note.page ? `Pág. ${note.page}` : "Anotação"}
                      </span>
                      {note.title && (
                        <h4 className="text-xs font-bold text-foreground line-clamp-1">
                          {note.title}
                        </h4>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEditNote(note)}
                        title="Editar anotação"
                        aria-label="Editar anotação"
                        className="size-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                      >
                        <Edit3 className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteNote(note.id)}
                        title="Excluir anotação"
                        aria-label="Excluir anotação"
                        className="size-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Citação do Trecho */}
                  <div className="rounded-xl bg-secondary/40 border border-border/50 p-2.5 text-[11px] italic text-muted-foreground line-clamp-2">
                    "{note.selectedText}"
                  </div>

                  {/* Conteúdo da Anotação */}
                  <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed font-sans">
                    {note.content}
                  </p>

                  {/* Rodapé do Card com Data e Salto */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="size-3" />
                      <span>{dateStr}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleJumpToSentence(note.sentenceIndex)}
                      className="flex items-center gap-1 font-semibold text-accent hover:underline cursor-pointer"
                    >
                      <span>Ir para o trecho</span>
                      <ExternalLink className="size-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
