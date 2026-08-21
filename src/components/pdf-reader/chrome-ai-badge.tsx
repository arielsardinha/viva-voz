"use client";

import { useState, useRef, useEffect } from "react";
import {
  Cpu,
  Cloud,
  HelpCircle,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  DownloadCloud,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useChromeAi } from "@/hooks/use-chrome-ai";
import type { ChromeAiAvailability } from "@/lib/client/chrome-ai";

interface ChromeAiBadgeProps {
  hasCloudKey: boolean;
  chromeAiStatus?: ChromeAiAvailability;
  onStatusChange?: (status: ChromeAiAvailability) => void;
}

const CHROME_FLAG_URL = "chrome://flags/#prompt-api-for-gemini-nano";

export function ChromeAiBadge({
  hasCloudKey,
  chromeAiStatus: externalStatus,
  onStatusChange,
}: ChromeAiBadgeProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Hook que monitora eventos de foco na janela, visibilidade e faz auto-polling inteligente
  const {
    status: internalStatus,
    isChecking,
    isDownloading,
    checkNow,
  } = useChromeAi({
    pollIntervalMs: open ? 2500 : 5000,
    onStatusChange,
  });

  const effectiveStatus = externalStatus ?? internalStatus;
  const isLocalActive = !hasCloudKey && effectiveStatus === "readily";
  const isCloudActive = hasCloudKey;
  const isPendingDownload = !hasCloudKey && effectiveStatus === "after-download";

  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const handleCopyFlag = async () => {
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    try {
      await navigator.clipboard.writeText(CHROME_FLAG_URL);
      setCopied(true);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback simples caso permissão de clipboard seja restrita
      const textarea = document.createElement("textarea");
      textarea.value = CHROME_FLAG_URL;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-cy="chrome-ai-badge-btn"
          aria-label="Informações sobre o motor de inteligência artificial ativo"
          className="inline-flex items-center gap-1.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all hover:opacity-90 active:scale-95 cursor-pointer"
        >
          {isCloudActive ? (
            <Badge
              variant="outline"
              className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 text-[10px] font-medium gap-1 py-0.5 px-2"
            >
              <Cloud className="size-3" aria-hidden="true" />
              <span>Gemini 2.5 Flash</span>
            </Badge>
          ) : isLocalActive ? (
            <Badge
              variant="outline"
              className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-medium gap-1 py-0.5 px-2 shadow-xs ring-1 ring-emerald-500/20"
            >
              <Cpu className="size-3" aria-hidden="true" />
              <span className="flex items-center gap-1">
                Gemini Nano
                <span className="inline-flex size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </span>
            </Badge>
          ) : isPendingDownload ? (
            <Badge
              variant="outline"
              className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px] font-medium gap-1 py-0.5 px-2"
            >
              <DownloadCloud className="size-3 animate-bounce" aria-hidden="true" />
              <span>Baixando Modelo...</span>
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-medium gap-1 py-0.5 px-2"
            >
              <HelpCircle className="size-3" aria-hidden="true" />
              <span>IA Não Conectada</span>
            </Badge>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-[330px] sm:w-[360px] p-4 text-xs space-y-3 bg-popover text-popover-foreground shadow-xl rounded-2xl border border-border"
      >
        {/* Cabeçalho do Popover */}
        <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <Sparkles className="size-4 text-accent" aria-hidden="true" />
            <span className="text-sm">Motor de Inteligência Artificial</span>
          </div>

          <button
            type="button"
            onClick={() => void checkNow()}
            disabled={isChecking}
            title="Verificar status novamente"
            aria-label="Verificar disponibilidade da IA no navegador"
            className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 px-2 py-1 rounded-lg hover:bg-secondary cursor-pointer"
          >
            <RefreshCw
              className={`size-3.5 ${isChecking ? "animate-spin text-accent" : ""}`}
              aria-hidden="true"
            />
            <span>{isChecking ? "Verificando..." : "Verificar"}</span>
          </button>
        </div>

        {/* Estado 1: Nuvem Conectada */}
        {isCloudActive && (
          <div className="space-y-1.5 rounded-xl bg-sky-500/5 p-3 border border-sky-500/20 text-muted-foreground">
            <p className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-semibold text-xs">
              <CheckCircle2 className="size-4 shrink-0" />
              Conectado ao Gemini 2.5 Flash
            </p>
            <p className="leading-relaxed">
              Utilizando sua chave pessoal do Google AI Studio para respostas rápidas, completas e narração inteligente.
            </p>
          </div>
        )}

        {/* Estado 2: Gemini Nano Local Ativo */}
        {isLocalActive && (
          <div className="space-y-1.5 rounded-xl bg-emerald-500/5 p-3 border border-emerald-500/20 text-muted-foreground">
            <p className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
              <CheckCircle2 className="size-4 shrink-0" />
              Gemini Nano Local Ativo e Pronto!
            </p>
            <p className="leading-relaxed">
              Executando 100% no seu navegador via Chrome Built-in AI. Sem custo de API, com privacidade total e funcionando offline.
            </p>
          </div>
        )}

        {/* Estado 3: Baixando Modelo em Background */}
        {isPendingDownload && (
          <div className="space-y-2 rounded-xl bg-blue-500/5 p-3 border border-blue-500/20 text-muted-foreground">
            <p className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold text-xs">
              <DownloadCloud className="size-4 shrink-0 animate-bounce" />
              Flag Habilitada — Baixando Modelo
            </p>
            <p className="leading-relaxed">
              A Prompt API foi reconhecida! O Chrome está finalizando o download dos componentes do Gemini Nano (~1.5GB). O VivaVoz ativará a IA automaticamente assim que o download terminar.
            </p>
            <div className="text-[11px] bg-background/80 p-2 rounded-lg border border-border/80">
              <span className="font-semibold text-foreground">Dica para acompanhar:</span> acesse{" "}
              <code className="text-accent font-mono">chrome://components</code> e clique em <em>Check for update</em> no componente <strong>Optimization Guide On Device Model</strong>.
            </div>
          </div>
        )}

        {/* Estado 4: IA Não Conectada — Instruções Detalhadas e Auto-identificação */}
        {!isCloudActive && !isLocalActive && !isPendingDownload && (
          <div className="space-y-3">
            <div className="rounded-xl bg-amber-500/10 p-2.5 border border-amber-500/20">
              <p className="font-semibold text-amber-700 dark:text-amber-400 text-xs">
                Como ativar a IA Local Gratuita (Gemini Nano):
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Siga os 3 passos simples abaixo no seu Google Chrome:
              </p>
            </div>

            <ol className="space-y-2.5 text-muted-foreground text-[11px] pl-1">
              <li className="flex items-start gap-2">
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent font-bold text-[10px]">
                  1
                </span>
                <div className="flex-1 space-y-1">
                  <span>
                    Acesse a flag de IA no Chrome colando na barra de endereço:
                  </span>
                  <div className="flex items-center gap-1 mt-1">
                    <code className="flex-1 bg-muted px-2 py-1 rounded text-[10px] font-mono break-all text-foreground border border-border select-all">
                      {CHROME_FLAG_URL}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyFlag}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-secondary text-foreground hover:bg-secondary/80 border border-border text-[10px] font-medium transition-colors cursor-pointer shrink-0"
                      title="Copiar link da flag"
                      aria-label="Copiar link da flag do Chrome"
                    >
                      {copied ? (
                        <>
                          <Check className="size-3 text-emerald-500" />
                          <span className="text-emerald-500 font-semibold">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </li>

              <li className="flex items-start gap-2">
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent font-bold text-[10px]">
                  2
                </span>
                <div className="flex-1">
                  <span>
                    Na opção <strong>Prompt API</strong>, altere o seletor de{" "}
                    <span className="bg-muted px-1 py-0.5 rounded text-foreground font-mono">Default</span> para{" "}
                    <span className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1 py-0.5 rounded font-semibold font-mono">
                      Enabled
                    </span>.
                  </span>
                </div>
              </li>

              <li className="flex items-start gap-2">
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent font-bold text-[10px]">
                  3
                </span>
                <div className="flex-1">
                  <span>
                    Clique no botão azul <strong>Relaunch</strong> (Reiniciar) que aparece no canto inferior do navegador.
                  </span>
                </div>
              </li>
            </ol>

            <div className="rounded-xl bg-secondary/70 p-2.5 border border-border/80 text-[11px] space-y-1">
              <p className="flex items-center gap-1 font-semibold text-foreground">
                <Sparkles className="size-3.5 text-accent" />
                Detecção Automática
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Ao reiniciar o Chrome ou retornar a esta aba, o VivaVoz <strong>detectará a ativação automaticamente</strong> em tempo real, sem necessidade de recarregar a página!
              </p>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
