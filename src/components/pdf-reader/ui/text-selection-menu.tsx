"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Copy, HelpCircle, Highlighter, Eraser, ChevronDown, StickyNote, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/clipboard";
import {
  HIGHLIGHT_COLORS,
  type HighlightColor,
} from "@/lib/domain/document-highlight.types";
import { cn } from "@/lib/utils";

interface TextSelectionMenuProps {
  containerRef: React.RefObject<HTMLElement | null>;
  onAskAI?: (prompt: string) => void;
  onSpeakSelection?: (text: string) => void;
  onHighlight?: (color: HighlightColor, text: string) => void;
  onRemoveHighlight?: (text: string) => void;
  onAddNote?: (text: string) => void;
}

export function TextSelectionMenu({
  containerRef,
  onAskAI,
  onSpeakSelection,
  onHighlight,
  onRemoveHighlight,
  onAddNote,
}: TextSelectionMenuProps) {
  const [selectedText, setSelectedText] = useState("");
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [showColorPalette, setShowColorPalette] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      setPosition(null);
      setSelectedText("");
      setShowColorPalette(false);
      return;
    }

    const text = selection.toString().trim();
    if (text.length < 2) {
      setPosition(null);
      return;
    }

    // Verifica se a seleção está contida no container do leitor
    if (containerRef.current) {
      const anchorNode = selection.anchorNode;
      if (anchorNode && !containerRef.current.contains(anchorNode)) {
        setPosition(null);
        return;
      }
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    const screenW = typeof window !== "undefined" ? window.innerWidth : 360;
    // Garante que o centro do menu fique dentro dos limites da tela mobile (mínimo 370px)
    const safeX = Math.max(140, Math.min(screenW - 140, rect.left + rect.width / 2));
    const safeY = rect.top < 70 ? rect.bottom + 50 : Math.max(55, rect.top - 12);

    setSelectedText(text);
    setPosition({
      x: safeX,
      y: safeY,
    });
  }, [containerRef]);

  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [handleSelectionChange]);

  if (!position || !selectedText) return null;

  const handleCopy = async () => {
    const success = await copyToClipboard(selectedText, menuRef.current);
    if (success) {
      toast.success("Texto copiado para a área de transferência.");
    } else {
      toast.error("Não foi possível copiar o texto automaticamente.");
    }
    window.getSelection()?.removeAllRanges();
    setPosition(null);
    setShowColorPalette(false);
  };

  const handleSpeak = () => {
    if (onSpeakSelection) {
      onSpeakSelection(selectedText);
    }
    window.getSelection()?.removeAllRanges();
    setPosition(null);
    setShowColorPalette(false);
  };

  const handleExplain = () => {
    if (onAskAI) {
      onAskAI(`Explique os conceitos e o significado deste trecho:\n\n"${selectedText}"`);
    }
    window.getSelection()?.removeAllRanges();
    setPosition(null);
    setShowColorPalette(false);
  };

  const handleSelectColor = (color: HighlightColor) => {
    if (onHighlight) {
      onHighlight(color, selectedText);
      toast.success("Trecho marcado com sucesso.");
    }
    window.getSelection()?.removeAllRanges();
    setPosition(null);
    setShowColorPalette(false);
  };

  const handleClearHighlight = () => {
    if (onRemoveHighlight) {
      onRemoveHighlight(selectedText);
      toast.success("Marcação removida.");
    }
    window.getSelection()?.removeAllRanges();
    setPosition(null);
    setShowColorPalette(false);
  };

  const handleAddNote = () => {
    if (onAddNote) {
      onAddNote(selectedText);
    }
    window.getSelection()?.removeAllRanges();
    setPosition(null);
    setShowColorPalette(false);
  };

  return (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "translate(-50%, -100%)",
        zIndex: 50,
      }}
      className="glass-panel animate-in fade-in zoom-in-95 duration-150 flex flex-col items-center gap-1 p-1 rounded-2xl shadow-xl border border-border/80 max-w-[96vw]"
    >
      {/* Barra Principal de Ações */}
      <div className="flex items-center gap-0.5 sm:gap-1 flex-wrap justify-center">
        {/* Opção Marcar Piloto */}
        <button
          type="button"
          onClick={() => setShowColorPalette(!showColorPalette)}
          className={cn(
            "flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer",
            showColorPalette
              ? "bg-accent/20 text-accent font-semibold"
              : "text-foreground hover:bg-accent/15 hover:text-accent"
          )}
          title="Marcar piloto com cor personalizada"
          aria-label="Marcar piloto"
        >
          <Highlighter className="size-3.5 text-amber-500" />
          <span>Marcar Piloto</span>
          <ChevronDown
            className={cn(
              "size-3 opacity-70 transition-transform duration-200",
              showColorPalette && "rotate-180"
            )}
          />
        </button>

        {/* Opção Ouvir Trecho */}
        {onSpeakSelection && (
          <button
            type="button"
            onClick={handleSpeak}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent/15 hover:text-accent rounded-lg transition-colors cursor-pointer"
            title="Ouvir este trecho com voz neural"
            aria-label="Ouvir trecho"
          >
            <Volume2 className="size-3.5 text-primary" />
            <span>Ouvir</span>
          </button>
        )}

        {/* Opção Bloco de Notas */}
        {onAddNote && (
          <button
            type="button"
            onClick={handleAddNote}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-amber-500/15 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg transition-colors cursor-pointer"
            title="Adicionar anotação no Bloco de Notas"
            aria-label="Bloco de notas"
          >
            <StickyNote className="size-3.5 text-amber-500" />
            <span>Bloco de Notas</span>
          </button>
        )}

        {/* Opção Explicar com IA */}
        <button
          type="button"
          onClick={handleExplain}
          className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent/15 hover:text-accent rounded-lg transition-colors cursor-pointer"
        >
          <HelpCircle className="size-3.5 text-accent" />
          <span>Explicar</span>
        </button>

        {/* Opção Copiar Texto */}
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground rounded-lg transition-colors cursor-pointer"
          title="Copiar texto"
          aria-label="Copiar texto"
        >
          <Copy className="size-3.5" />
        </button>
      </div>

      {/* Paleta de Cores de Marcador Piloto */}
      {showColorPalette && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-secondary/80 rounded-xl border border-border/70 animate-in fade-in slide-in-from-top-1 duration-150">
          <span className="text-[10px] font-semibold text-muted-foreground mr-0.5">Cor:</span>
          {HIGHLIGHT_COLORS.map((color) => (
            <button
              key={color.id}
              type="button"
              onClick={() => handleSelectColor(color.id)}
              className={cn(
                "size-5 sm:size-5.5 rounded-full transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-accent/80 cursor-pointer shadow-xs border border-white/40",
                color.dotClass
              )}
              title={`Marcar com ${color.label}`}
              aria-label={`Marcar com ${color.label}`}
            />
          ))}

          <div className="h-4 w-px bg-border/80 mx-0.5" />

          <button
            type="button"
            onClick={handleClearHighlight}
            className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors cursor-pointer"
            title="Remover marcação"
            aria-label="Remover marcação"
          >
            <Eraser className="size-3" />
            <span className="hidden sm:inline">Desmarcar</span>
          </button>
        </div>
      )}
    </div>
  );
}
