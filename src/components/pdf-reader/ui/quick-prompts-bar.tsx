"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

interface QuickPromptsBarProps {
  prompts: readonly string[];
  disabled?: boolean;
  onSelectPrompt: (prompt: string) => void;
}

const SCROLL_STEP_PX = 180;

/**
 * Barra de sugestões rápidas com rolagem horizontal acessível via mouse (wheel vertical
 * convertido em horizontal, setas de navegação lateral e barra de rolagem fina arrastável) e touch.
 */
export function QuickPromptsBar({
  prompts,
  disabled = false,
  onSelectPrompt,
}: QuickPromptsBarProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollerRef.current;
    if (!el) return;

    window.addEventListener("resize", updateScrollState);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(updateScrollState);
      observer.observe(el);
    }

    return () => {
      window.removeEventListener("resize", updateScrollState);
      observer?.disconnect();
    };
  }, [prompts, updateScrollState]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const handleNativeWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;

      const canAdvance = e.deltaY > 0 && el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
      const canRetreat = e.deltaY < 0 && el.scrollLeft > 1;
      if (!canAdvance && !canRetreat) return;

      e.preventDefault();
      el.scrollLeft += e.deltaY;
      updateScrollState();
    };

    el.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleNativeWheel);
  }, [updateScrollState]);

  const scrollByAmount = (delta: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    if (typeof el.scrollBy === "function") {
      el.scrollBy({ left: delta, behavior: "smooth" });
    } else {
      el.scrollLeft = Math.max(
        0,
        Math.min(el.scrollWidth - el.clientWidth, el.scrollLeft + delta),
      );
    }
    updateScrollState();
  };

  return (
    <div className="relative flex items-center gap-1.5 px-3 sm:px-4 pt-1 pb-2 min-w-0">
      {canScrollLeft && (
        <button
          type="button"
          data-cy="quick-prompts-scroll-left"
          aria-label="Rolar sugestões para a esquerda"
          title="Rolar sugestões para a esquerda"
          onClick={() => scrollByAmount(-SCROLL_STEP_PX)}
          className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-xs transition-colors hover:bg-accent/10 hover:text-accent cursor-pointer"
        >
          <ChevronLeft className="size-3.5" aria-hidden="true" />
        </button>
      )}

      <div
        ref={scrollerRef}
        data-cy="quick-prompts-scroller"
        onScroll={updateScrollState}
        className="flex flex-1 min-w-0 items-center gap-2 overflow-x-auto horizontal-thin-scrollbar pb-1.5"
      >
        {prompts.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onSelectPrompt(q)}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-full bg-card hover:bg-accent/10 hover:text-accent border border-border text-foreground transition-colors disabled:opacity-50 shrink-0 cursor-pointer"
          >
            <Sparkles className="size-3.5 text-accent" aria-hidden="true" />
            <span>{q}</span>
          </button>
        ))}
      </div>

      {canScrollRight && (
        <button
          type="button"
          data-cy="quick-prompts-scroll-right"
          aria-label="Rolar sugestões para a direita"
          title="Rolar sugestões para a direita"
          onClick={() => scrollByAmount(SCROLL_STEP_PX)}
          className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-xs transition-colors hover:bg-accent/10 hover:text-accent cursor-pointer"
        >
          <ChevronRight className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
