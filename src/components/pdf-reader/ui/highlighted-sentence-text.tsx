"use client";

import { useMemo } from "react";
import type { TextHighlight } from "@/lib/domain/document-highlight.types";
import { segmentSentenceText } from "@/lib/domain/highlight-text.utils";
import { cn } from "@/lib/utils";

interface HighlightedSentenceTextProps {
  text: string;
  highlights?: TextHighlight[];
  className?: string;
}

export function HighlightedSentenceText({
  text,
  highlights = [],
  className,
}: HighlightedSentenceTextProps) {
  const segments = useMemo(() => {
    return segmentSentenceText(text, highlights);
  }, [text, highlights]);

  if (segments.length === 1 && !segments[0].isHighlighted) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
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
    </span>
  );
}
