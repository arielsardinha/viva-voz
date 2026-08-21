"use client";

import { useEffect, useRef } from "react";

export interface MediaSessionOptions {
  title?: string;
  subtitle?: string;
  isPlaying: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onSeekForward?: () => void;
  onSeekBackward?: () => void;
}

export function useMediaSession({
  title = "VivaVoz — Leitura em Áudio",
  subtitle = "Narração Inteligente",
  isPlaying,
  onPlay,
  onPause,
  onPrevious,
  onNext,
  onSeekForward,
  onSeekBackward,
}: MediaSessionOptions) {
  const handlersRef = useRef({
    onPlay,
    onPause,
    onPrevious,
    onNext,
    onSeekForward,
    onSeekBackward,
  });

  // Manter referências atualizadas sem disparar re-bind desnecessário
  useEffect(() => {
    handlersRef.current = {
      onPlay,
      onPause,
      onPrevious,
      onNext,
      onSeekForward,
      onSeekBackward,
    };
  });

  // Atualizar metadata na Media Session
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) {
      return;
    }

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title || "VivaVoz — Leitor em Áudio",
        artist: "VivaVoz",
        album: subtitle || "Documento em Leitura",
        artwork: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      });
    } catch (e) {
      console.debug("[MediaSession] Falha ao definir metadata:", e);
    }
  }, [title, subtitle]);

  // Atualizar playbackState
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) {
      return;
    }

    try {
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    } catch (e) {
      console.debug("[MediaSession] Falha ao definir playbackState:", e);
    }
  }, [isPlaying]);

  // Configurar action handlers
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) {
      return;
    }

    const actionMap: Array<[MediaSessionAction, () => void | undefined]> = [
      ["play", () => handlersRef.current.onPlay?.()],
      ["pause", () => handlersRef.current.onPause?.()],
      ["previoustrack", () => handlersRef.current.onPrevious?.()],
      ["nexttrack", () => handlersRef.current.onNext?.()],
      ["seekforward", () => (handlersRef.current.onSeekForward ? handlersRef.current.onSeekForward() : handlersRef.current.onNext?.())],
      ["seekbackward", () => (handlersRef.current.onSeekBackward ? handlersRef.current.onSeekBackward() : handlersRef.current.onPrevious?.())],
    ];

    actionMap.forEach(([action, handler]) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Ação não suportada pelo navegador do cliente
      }
    });

    return () => {
      actionMap.forEach(([action]) => {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {}
      });
    };
  }, []);
}
