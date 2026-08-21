"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface WaveformVisualizerProps {
  isPlaying: boolean;
  isBuffering?: boolean;
  barCount?: number;
  className?: string;
  color?: string;
}

export function WaveformVisualizer({
  isPlaying,
  isBuffering = false,
  barCount = 36,
  className,
}: WaveformVisualizerProps) {
  const bars = useRef<number[]>(
    Array.from({ length: barCount }, (_, i) => {
      // Natural sinusoidal envelope for realistic waveform shape
      const progress = i / (barCount - 1);
      const envelope = Math.sin(progress * Math.PI);
      return Math.max(0.15, envelope * 0.7);
    })
  );

  return (
    <div
      className={cn(
        "flex h-8 items-center justify-center gap-[3px] overflow-hidden px-2",
        className
      )}
      aria-hidden="true"
    >
      {bars.current.map((baseHeight, i) => {
        const animationDelay = `${(i * 0.045) % 0.8}s`;
        const animationDuration = `${0.6 + ((i % 5) * 0.15)}s`;

        return (
          <span
            key={i}
            className={cn(
              "w-[3px] rounded-full transition-all duration-200",
              isPlaying
                ? "bg-gradient-to-t from-accent to-accent/60 shadow-[0_0_8px_rgba(99,102,241,0.4)]"
                : "bg-muted-foreground/30",
              isBuffering && "animate-pulse bg-accent/40"
            )}
            style={{
              height: isPlaying
                ? `${Math.max(15, Math.min(100, (baseHeight * 80) + (Math.sin(i * 0.8) * 15)))}%`
                : `${Math.max(12, baseHeight * 35)}%`,
              animation: isPlaying
                ? `soundWave ${animationDuration} ease-in-out infinite alternate`
                : undefined,
              animationDelay,
            }}
          />
        );
      })}

      <style jsx>{`
        @keyframes soundWave {
          0% {
            transform: scaleY(0.25);
          }
          50% {
            transform: scaleY(1);
          }
          100% {
            transform: scaleY(0.4);
          }
        }
      `}</style>
    </div>
  );
}
