"use client";

import { useEffect, useId, useState } from "react";
import { KeyRound, Sparkles, Volume2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { VoiceOption } from "@/lib/tts-engines";

export interface ZenQuotaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  systemVoices: VoiceOption[];
  currentVoice: string;
  onContinueWithFree: (selectedVoice: string) => void;
  onOpenGeminiKey?: () => void;
}

export function ZenQuotaDialog({
  open,
  onOpenChange,
  systemVoices,
  currentVoice,
  onContinueWithFree,
  onOpenGeminiKey,
}: ZenQuotaDialogProps) {
  const selectId = useId();
  const [selectedVoice, setSelectedVoice] = useState(currentVoice);

  // Sincroniza estado quando o diálogo for aberto
  useEffect(() => {
    if (open) {
      const defaultSystemVoice =
        currentVoice ||
        systemVoices.find((v) => v.id.toLowerCase().includes("pt"))?.id ||
        systemVoices[0]?.id ||
        "";
      setSelectedVoice(defaultSystemVoice);
    }
  }, [open, currentVoice, systemVoices]);

  const handleContinue = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onContinueWithFree(selectedVoice);
    onOpenChange(false);
  };

  const handleOpenGeminiKey = () => {
    onOpenChange(false);
    onOpenGeminiKey?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[92vw] max-w-md rounded-2xl sm:rounded-3xl border border-border/80 bg-background/95 backdrop-blur-xl p-4 sm:p-6 shadow-2xl max-h-[85dvh] flex flex-col overflow-hidden font-sans"
      >
        <DialogHeader className="shrink-0 text-left space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500 border border-amber-500/20 shadow-xs shrink-0">
              <Sparkles className="size-5" aria-hidden="true" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground leading-snug">
                Limite de Tokens Atingido
              </DialogTitle>
              <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                Modo Zen Imersivo Pausado
              </span>
            </div>
          </div>

          <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-1">
            A cota de narração com IA da sua conta Gemini foi atingida ou o limite temporário foi excedido. Deseja continuar sua leitura focada utilizando as <strong>vozes gratuitas do sistema</strong>?
          </DialogDescription>
        </DialogHeader>

        <form
          data-webmcp-tool="configureFreeAudioFallback"
          data-webmcp-action="applyFreeVoice"
          onSubmit={handleContinue}
          className="flex-1 overflow-y-auto space-y-4 py-2 pr-1"
        >
          {/* Seletor de Voz Gratuita do Sistema */}
          <div className="space-y-1.5">
            <label
              htmlFor={selectId}
              className="flex items-center gap-1.5 text-xs font-semibold text-foreground"
            >
              <Volume2 className="size-3.5 text-accent shrink-0" aria-hidden="true" />
              <span>Voz gratuita do sistema</span>
            </label>
            <div className="relative">
              <select
                id={selectId}
                name="selectedVoice"
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                aria-label="Voz gratuita do sistema"
                className="w-full appearance-none rounded-xl border border-border bg-secondary/60 px-3 py-2.5 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer transition-all hover:bg-secondary truncate"
              >
                {systemVoices.length === 0 ? (
                  <option value="">Voz padrão do navegador</option>
                ) : (
                  systemVoices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))
                )}
              </select>
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Vozes processadas localmente pelo seu dispositivo (sem consumo de tokens).
            </p>
          </div>
        </form>

        <DialogFooter className="shrink-0 pt-3 border-t border-border/40 flex flex-col-reverse sm:flex-row gap-2 sm:justify-between items-stretch sm:items-center pb-1">
          <div className="flex items-center gap-1.5 justify-start">
            {onOpenGeminiKey && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleOpenGeminiKey}
                className="h-8 text-xs text-muted-foreground hover:text-accent gap-1.5 px-2 cursor-pointer"
              >
                <KeyRound className="size-3.5" aria-hidden="true" />
                <span>Inserir outra chave Gemini</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-9 rounded-xl text-xs cursor-pointer"
            >
              Pausar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => handleContinue()}
              className="h-9 rounded-xl bg-accent text-accent-foreground font-semibold text-xs px-4 shadow-sm hover:opacity-90 cursor-pointer"
            >
              Continuar no Gratuito
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
