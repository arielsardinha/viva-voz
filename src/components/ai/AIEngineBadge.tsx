"use client";

import React, { useState } from "react";
import { Zap, Cloud, AlertCircle, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFirebaseAI } from "@/hooks/useFirebaseAI";
import { AIEngineModal } from "./AIEngineModal";

export function AIEngineBadge() {
  const [isOpen, setIsOpen] = useState(false);
  const { activeEngine, isOnline, onDeviceStatus } = useFirebaseAI();

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="h-8 gap-1 sm:gap-1.5 px-2 sm:px-2.5 text-xs font-medium transition-all shadow-xs border-border/80 hover:bg-accent/80"
        data-cy="ai-engine-badge"
        data-webmcp-tool="viewAIEngineStatus"
        aria-label={`Motor de IA atual: ${
          activeEngine === "gemini-nano"
            ? "Gemini Nano Local"
            : activeEngine === "vertex"
            ? "Vertex AI Nuvem"
            : "Desconectado"
        }`}
      >
        {activeEngine === "gemini-nano" && (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            <span className="hidden sm:inline font-semibold text-amber-600 dark:text-amber-400">Gemini Nano</span>
            {!isOnline && (
              <WifiOff className="h-3 w-3 text-muted-foreground ml-0.5" aria-label="Offline" />
            )}
          </>
        )}

        {activeEngine === "vertex" && (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Cloud className="h-3.5 w-3.5 text-emerald-500" />
            <span className="hidden sm:inline font-semibold text-emerald-600 dark:text-emerald-400">Vertex AI</span>
          </>
        )}

        {activeEngine === "disconnected" && (
          <>
            <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="hidden sm:inline text-muted-foreground">Configurar IA</span>
          </>
        )}
      </Button>

      <AIEngineModal
        open={isOpen}
        onOpenChange={setIsOpen}
        activeEngine={activeEngine}
        isOnline={isOnline}
        onDeviceStatus={onDeviceStatus}
      />
    </>
  );
}
