"use client";

import { useMemo } from "react";
import { StickyNote } from "lucide-react";
import type { TextHighlight } from "@/lib/domain/document-highlight.types";
import type { DocumentNote, NoteColor } from "@/lib/domain/document-note.types";
import { segmentSentenceText } from "@/lib/domain/highlight-text.utils";
import { cn } from "@/lib/utils";

interface HighlightedSentenceTextProps {
  text: string;
  highlights?: TextHighlight[];
  notes?: DocumentNote[];
  onOpenNote?: (note: DocumentNote) => void;
  className?: string;
}

const NOTE_COLOR_STYLES: Record<NoteColor, { badge: string; icon: string }> = {
  amber: {
    badge: "bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/40 hover:bg-amber-500/30",
    icon: "text-amber-600 dark:text-amber-400",
  },
  emerald: {
    badge: "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border-emerald-500/40 hover:bg-emerald-500/30",
    icon: "text-emerald-600 dark:text-emerald-400",
  },
  sky: {
    badge: "bg-sky-500/20 text-sky-800 dark:text-sky-200 border-sky-500/40 hover:bg-sky-500/30",
    icon: "text-sky-600 dark:text-sky-400",
  },
  purple: {
    badge: "bg-purple-500/20 text-purple-800 dark:text-purple-200 border-purple-500/40 hover:bg-purple-500/30",
    icon: "text-purple-600 dark:text-purple-400",
  },
  rose: {
    badge: "bg-rose-500/20 text-rose-800 dark:text-rose-200 border-rose-500/40 hover:bg-rose-500/30",
    icon: "text-rose-600 dark:text-rose-400",
  },
};

export function HighlightedSentenceText({
  text,
  highlights = [],
  notes = [],
  onOpenNote,
  className,
}: HighlightedSentenceTextProps) {
  const segments = useMemo(() => {
    return segmentSentenceText(text, highlights);
  }, [text, highlights]);

  const hasNotes = notes && notes.length > 0;
  const primaryNote = hasNotes ? notes[0] : null;
  const noteColor: NoteColor = primaryNote?.color && NOTE_COLOR_STYLES[primaryNote.color] ? primaryNote.color : "amber";
  const noteStyle = NOTE_COLOR_STYLES[noteColor];

  return (
    <span className={cn("inline-block", className)}>
      {segments.map((seg, idx) => {
        if (!seg.isHighlighted) {
          return <span key={idx}>{seg.text}</span>;
        }

        const colorClass = seg.color ? `highlight-${seg.color}` : "highlight-yellow";

        return (
          <mark
            key={idx}
            className={cn("highlight-mark", colorClass)}
            data-highlight-id={seg.highlightId}
          >
            {seg.text}
          </mark>
        );
      })}

      {/* Badge e Ícone com a Etiqueta de Cor Selecionada na Nota */}
      {hasNotes && primaryNote && (
        <span
          role="button"
          tabIndex={0}
          data-note-color={noteColor}
          onClick={(e) => {
            e.stopPropagation();
            onOpenNote?.(primaryNote);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              onOpenNote?.(primaryNote);
            }
          }}
          title={
            notes.length === 1
              ? `Ver anotação: "${primaryNote.title || primaryNote.content.slice(0, 35)}..."`
              : `${notes.length} anotações nesta frase`
          }
          aria-label="Abrir bloco de notas desta frase"
          className={cn(
            "inline-flex items-center gap-0.5 ml-1 px-1.5 py-0.5 rounded-md border text-[10px] font-bold cursor-pointer hover:scale-105 transition-transform select-none align-middle shadow-2xs",
            noteStyle.badge
          )}
        >
          <StickyNote className={cn("size-2.5 sm:size-3 fill-current/20", noteStyle.icon)} />
          {notes.length > 1 && <span>{notes.length}</span>}
        </span>
      )}
    </span>
  );
}
