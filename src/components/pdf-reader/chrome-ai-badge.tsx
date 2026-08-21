"use client";

import { useState } from "react";
import { Cpu, Cloud, HelpCircle, Sparkles, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ChromeAiAvailability } from "@/lib/client/chrome-ai";

interface ChromeAiBadgeProps {
  hasCloudKey: boolean;
  chromeAiStatus: ChromeAiAvailability;
}

export function ChromeAiBadge({ hasCloudKey, chromeAiStatus }: ChromeAiBadgeProps) {
  const [open, setOpen] = useState(false);

  const isLocalActive = !hasCloudKey && chromeAiStatus === "readily";
  const isCloudActive = hasCloudKey;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Informações sobre o motor de inteligência artificial ativo"
          className="inline-flex items-center gap-1.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring transition-opacity hover:opacity-80"
        >
          {isCloudActive ? (
            <Badge
              variant="outline"
              className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 text-[10px] font-medium gap-1 py-0.5 px-2 cursor-pointer"
            >
              <Cloud className="size-3" aria-hidden="true" />
              <span>Gemini 2.5 Flash</span>
            </Badge>
          ) : isLocalActive ? (
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-medium gap-1 py-0.5 px-2 cursor-pointer"
            >
              <Cpu className="size-3" aria-hidden="true" />
              <span>Gemini Nano (Local / Grátis)</span>
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] font-medium gap-1 py-0.5 px-2 cursor-pointer"
            >
              <HelpCircle className="size-3" aria-hidden="true" />
              <span>IA Não Conectada</span>
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-72 sm:w-80 p-3 text-xs space-y-2 bg-popover text-popover-foreground shadow-md rounded-lg border border-border"
      >
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
          <span>Motor de Inteligência Artificial</span>
        </div>

        {isCloudActive && (
          <div className="space-y-1 text-muted-foreground">
            <p className="flex items-center gap-1 text-sky-600 dark:text-sky-400 font-medium">
              <CheckCircle2 className="size-3" />
              Conectado ao Gemini na Nuvem
            </p>
            <p>
              Respostas com máxima capacidade e velocidade através da API do Google AI Studio.
            </p>
          </div>
        )}

        {isLocalActive && (
          <div className="space-y-1 text-muted-foreground">
            <p className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="size-3" />
              Gemini Nano Local Ativo
            </p>
            <p>
              Executando 100% no seu navegador via Chrome Built-in AI. Zero custo, privado e funciona offline.
            </p>
          </div>
        )}

        {!isCloudActive && !isLocalActive && (
          <div className="space-y-1.5 text-muted-foreground">
            <p className="text-amber-600 dark:text-amber-400 font-medium">
              Nenhuma IA conectada no momento
            </p>
            <p>
              Você pode conectar uma chave gratuita do Google AI Studio no botão de chave ao lado, ou ativar o Gemini Nano no Chrome via:
            </p>
            <code className="block bg-muted p-1.5 rounded text-[11px] select-all font-mono break-all text-foreground">
              chrome://flags/#prompt-api-for-gemini-nano
            </code>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
