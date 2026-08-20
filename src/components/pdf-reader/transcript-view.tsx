"use client";

import { useEffect, useRef } from "react";
import type { Sentence } from "@/lib/pdf-text";
import { cn } from "@/lib/utils";

interface TranscriptViewProps {
  sentences: Sentence[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

export function TranscriptView({ sentences, currentIndex, onSelect }: TranscriptViewProps) {
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentIndex]);

  let lastPage = 0;

  return (
    <div className="h-[60vh] min-w-0 overflow-x-hidden overflow-y-auto rounded-2xl border border-border bg-card p-4 sm:p-6 md:h-[65vh]">
      <p className="text-sm leading-7 break-words hyphens-auto sm:text-base sm:leading-8 md:text-lg md:leading-9">
        {sentences.map((sentence) => {
          const isActive = sentence.index === currentIndex;
          const isRead = sentence.index < currentIndex;
          const showPageMark = sentence.page !== lastPage;
          lastPage = sentence.page;

          return (
            <span key={sentence.index}>
              {showPageMark && (
                <span className="my-4 flex items-center gap-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  <span className="h-px flex-1 bg-border" />
                  Página {sentence.page}
                  <span className="h-px flex-1 bg-border" />
                </span>
              )}
              <button
                type="button"
                ref={isActive ? activeRef : undefined}
                onClick={() => onSelect(sentence.index)}
                className={cn(
                  "max-w-full cursor-pointer rounded-md px-1 text-left break-words whitespace-normal transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground font-medium"
                    : isRead
                      ? "text-muted-foreground hover:bg-accent/10"
                      : "text-foreground hover:bg-accent/10",
                )}
              >
                {sentence.text}
              </button>{" "}
            </span>
          );
        })}
      </p>
    </div>
  );
}
