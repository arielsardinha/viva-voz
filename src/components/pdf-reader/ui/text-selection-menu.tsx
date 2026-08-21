"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Copy, Sparkles, Volume2, HelpCircle } from "lucide-react";
import { toast } from "sonner";

interface TextSelectionMenuProps {
  containerRef: React.RefObject<HTMLElement | null>;
  onAskAI?: (prompt: string) => void;
  onSpeakSelection?: (text: string) => void;
}

export function TextSelectionMenu({
  containerRef,
  onAskAI,
  onSpeakSelection,
}: TextSelectionMenuProps) {
  const [selectedText, setSelectedText] = useState("");
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      setPosition(null);
      setSelectedText("");
      return;
    }

    const text = selection.toString().trim();
    if (text.length < 3) {
      setPosition(null);
      return;
    }

    // Check if selection is within container
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
    // Garante que o centro do menu fique dentro dos limites da tela mobile
    const safeX = Math.max(120, Math.min(screenW - 120, rect.left + rect.width / 2));
    const safeY = rect.top < 60 ? rect.bottom + 45 : Math.max(50, rect.top - 10);

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

  const handleCopy = () => {
    void navigator.clipboard.writeText(selectedText);
    toast.success("Texto copiado para a área de transferência.");
    window.getSelection()?.removeAllRanges();
    setPosition(null);
  };

  const handleSummarize = () => {
    if (onAskAI) {
      onAskAI(`Por favor, resuma de forma clara e concisa o seguinte trecho:\n\n"${selectedText}"`);
    }
    window.getSelection()?.removeAllRanges();
    setPosition(null);
  };

  const handleExplain = () => {
    if (onAskAI) {
      onAskAI(`Explique os conceitos e o significado deste trecho:\n\n"${selectedText}"`);
    }
    window.getSelection()?.removeAllRanges();
    setPosition(null);
  };

  const handleSpeak = () => {
    if (onSpeakSelection) {
      onSpeakSelection(selectedText);
    }
    window.getSelection()?.removeAllRanges();
    setPosition(null);
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
      className="glass-panel animate-in fade-in zoom-in-95 duration-150 flex items-center gap-0.5 sm:gap-1 p-1 rounded-xl shadow-xl border border-border/80 max-w-[95vw]"
    >
      <button
        type="button"
        onClick={handleSummarize}
        className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent/15 hover:text-accent rounded-lg transition-colors"
      >
        <Sparkles className="size-3.5 text-accent" />
        <span>Resumir</span>
      </button>

      <button
        type="button"
        onClick={handleExplain}
        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent/15 hover:text-accent rounded-lg transition-colors"
      >
        <HelpCircle className="size-3.5 text-accent" />
        <span>Explicar</span>
      </button>

      {onSpeakSelection && (
        <button
          type="button"
          onClick={handleSpeak}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent/15 hover:text-accent rounded-lg transition-colors"
        >
          <Volume2 className="size-3.5 text-accent" />
          <span>Ouvir</span>
        </button>
      )}

      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground rounded-lg transition-colors"
        title="Copiar texto"
      >
        <Copy className="size-3.5" />
      </button>
    </div>
  );
}
