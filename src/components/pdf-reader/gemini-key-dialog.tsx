"use client";

import { useState, type ReactNode } from "react";
import {
  AudioWaveform,
  Camera,
  ExternalLink,
  Lightbulb,
  ShieldCheck,
  Sparkle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface GeminiKeyDialogProps {
  apiKey: string | null;
  onChange: (key: string | null) => void;
  compact?: boolean;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  variant?: "default" | "audio" | "icon";
  className?: string;
}

export function GeminiKeyDialog({
  apiKey,
  onChange,
  compact = false,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  variant = "default",
  className,
}: GeminiKeyDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [value, setValue] = useState("");

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (setControlledOpen ?? (() => {})) : setInternalOpen;

  const hasKey = Boolean(apiKey && apiKey.length >= 10);

  const save = () => {
    const trimmed = value.trim();
    if (trimmed.length < 10) {
      toast.error("Informe uma chave válida do Google AI Studio.");
      return;
    }
    onChange(trimmed);
    setValue("");
    setOpen(false);
    toast.success("Conta Gemini conectada neste navegador.");
  };

  const defaultTrigger = (
    <button
      type="button"
      data-cy="gemini-key-trigger"
      title={
        variant === "audio"
          ? hasKey
            ? "Voz IA (Google Gemini) conectada"
            : "Conectar Som com IA (Google Gemini TTS) - Enviar token"
          : hasKey
            ? "Chave Gemini conectada"
            : "Conectar chave Gemini"
      }
      aria-label={
        variant === "audio"
          ? hasKey
            ? "Voz IA (Google Gemini) conectada"
            : "Conectar Som com IA (Google Gemini TTS) - Enviar token"
          : hasKey
            ? "Chave Gemini conectada"
            : "Conectar chave Gemini"
      }
      className={cn(
        "inline-flex items-center justify-center transition-all cursor-pointer",
        variant === "icon"
          ? cn(
              "size-8 sm:size-9 rounded-full border text-xs font-semibold shadow-xs",
              hasKey
                ? "border-accent/40 bg-accent/15 text-accent hover:bg-accent/25"
                : "border-accent/50 bg-accent/10 text-accent hover:bg-accent/20 animate-pulse"
            )
          : variant === "audio"
            ? cn(
                "gap-1.5 h-7 sm:h-8 rounded-full border text-[11px] sm:text-xs font-semibold px-2 sm:px-3 shadow-xs",
                hasKey
                  ? "border-accent/40 bg-accent/10 text-accent hover:bg-accent/15"
                  : "border-accent/60 bg-accent/15 text-accent hover:bg-accent/25 font-bold"
              )
            : cn(
                "gap-1.5 h-8 sm:h-9 rounded-2xl border text-xs font-semibold px-2.5 sm:px-3 shadow-xs",
                hasKey
                  ? "border-accent/40 bg-accent/10 text-accent hover:bg-accent/15"
                  : "border-border/80 bg-background/80 text-muted-foreground hover:bg-secondary hover:text-foreground"
              ),
        className
      )}
    >
      {variant === "audio" ? (
        <Sparkles
          className={cn("size-3.5 shrink-0", hasKey ? "text-accent fill-accent/20" : "text-accent")}
          aria-hidden="true"
        />
      ) : (
        <Sparkle
          className={cn("size-3.5 shrink-0", hasKey ? "text-accent fill-accent/20" : "")}
          aria-hidden="true"
        />
      )}

      {variant !== "icon" && (
        <span className={cn(compact ? "hidden" : "hidden sm:inline")}>
          {variant === "audio"
            ? hasKey
              ? "Voz IA Ativa"
              : "Voz IA (Conectar)"
            : hasKey
              ? "Gemini Conectado"
              : "Conectar Gemini"}
        </span>
      )}

      {hasKey && (
        <span
          className="size-1.5 rounded-full bg-emerald-500 shrink-0"
          title="Ativo"
          aria-label="Status: Ativo"
        />
      )}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>{defaultTrigger}</DialogTrigger>
      )}

      <DialogContent className="max-w-md w-[calc(100vw-1.5rem)] sm:w-full p-0 overflow-hidden glass-panel border border-border/80 rounded-3xl shadow-2xl flex flex-col max-h-[90dvh]">
        {/* Header Limpo */}
        <div className="px-5 pt-6 pb-2 text-center shrink-0">
          <DialogHeader className="space-y-1">
            <DialogTitle id="gemini-dialog-title" className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight flex items-center justify-center gap-2 flex-wrap">
              <span>Conectar conta do Gemini (Google AI Studio)</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30">
                Vertex / Gemini
              </span>
            </DialogTitle>
            <DialogDescription id="gemini-dialog-desc" className="text-xs text-muted-foreground max-w-sm mx-auto">
              Conecte sua chave gratuita do Google AI Studio para ativar leitura multimodal, narração neural e assistente de estudos.
            </DialogDescription>
          </DialogHeader>
        </div>


        {/* Corpo com Scroll Suave */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-2 space-y-4">
          {/* Card de Benefícios (Estilo Inspirado nos Cards de Apoio e Contato) */}
          <div className="rounded-2xl border border-accent/30 bg-accent/10 dark:bg-accent/5 p-4 space-y-3 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="flex size-7 items-center justify-center rounded-xl bg-accent text-accent-foreground shrink-0 mt-0.5 shadow-xs">
                <Sparkles className="size-4 fill-current" aria-hidden="true" />
              </div>
              <p className="text-xs font-semibold text-foreground leading-relaxed">
                Por que ativar sua chave de IA no VivaVoz? Veja os benefícios:
              </p>
            </div>

            <div className="border-t border-accent/20 pt-2.5 space-y-2 text-[11px] text-muted-foreground">
              <div className="flex items-start gap-2">
                <Camera className="size-3.5 text-accent shrink-0 mt-0.5" />
                <span>
                  <strong className="text-foreground">Leitura de Fotos & OCR Multimodal:</strong> Converta páginas de livros físicos, anotações, capturas de tela e PDFs digitalizados em texto legível.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <AudioWaveform className="size-3.5 text-accent shrink-0 mt-0.5" />
                <span>
                  <strong className="text-foreground">Narração Neural com Vozes Humanas (TTS):</strong> Vozes neurais expressivas e naturais de última geração para seus documentos.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Lightbulb className="size-3.5 text-accent shrink-0 mt-0.5" />
                <span>
                  <strong className="text-foreground">Assistente de Estudo e Chat Interativo:</strong> Resumos, explicações didáticas e respostas sobre qualquer trecho do documento em tempo real.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-foreground">100% Gratuito & Seguro (BYOK):</strong> Sua chave fica armazenada com segurança em cookie HttpOnly no seu navegador e não é compartilhada.
                </span>
              </div>
            </div>
          </div>

          {/* Passo a Passo */}
          <form
            data-webmcp-tool="configureGeminiApiKey"
            data-webmcp-action="saveApiKey"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
            className="space-y-3"
          >
            <div className="rounded-2xl border border-border/70 bg-card/60 p-3.5 space-y-2.5 text-xs">
              <span className="text-[11px] font-bold text-foreground uppercase tracking-wider block">
                Como obter sua chave gratuita (3 passos):
              </span>

              <ol className="text-muted-foreground space-y-2 text-xs">
                <li className="flex items-start gap-2">
                  <span
                    className="bg-accent/15 text-accent flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                    aria-hidden="true"
                  >
                    1
                  </span>
                  <span>
                    Acesse o{" "}
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:underline font-semibold inline-flex items-center gap-0.5"
                    >
                      Google AI Studio
                      <ExternalLink className="size-3 inline" aria-hidden="true" />
                    </a>{" "}
                    e faça login com sua conta Google.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span
                    className="bg-accent/15 text-accent flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                    aria-hidden="true"
                  >
                    2
                  </span>
                  <span>
                    Clique no botão <strong className="text-foreground">Get API key</strong> e crie uma nova chave.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span
                    className="bg-accent/15 text-accent flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                    aria-hidden="true"
                  >
                    3
                  </span>
                  <span>Cole a chave gerada abaixo e clique em Salvar:</span>
                </li>
              </ol>

              <div className="pt-1">
                <Input
                  id="gemini-key-input"
                  name="geminiApiKey"
                  data-cy="gemini-key-input"
                  type="password"
                  placeholder="AIza..."
                  value={value}
                  aria-label="Chave de API do Google AI Studio"
                  aria-describedby="gemini-dialog-desc"
                  onChange={(event) => setValue(event.target.value)}
                  autoComplete="off"
                  className="rounded-xl border-border/80 text-xs font-mono"
                />
              </div>
            </div>

            {/* Ações */}
            <div className="pt-1 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="h-9 px-4 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                data-cy="gemini-key-save-btn"
                className="h-9 px-5 rounded-xl bg-accent text-accent-foreground text-xs font-bold shadow-md shadow-accent/20 cursor-pointer"
              >
                Salvar chave
              </Button>
            </div>
          </form>
        </div>

        {/* Rodapé Seguro com Safe-Area */}
        <div className="p-4 pt-2 border-t border-border/50 shrink-0 flex items-center justify-between pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] bg-card/30 text-[11px] text-muted-foreground">
          <span>Modelo BYOK (Traga sua própria chave)</span>
          <span className="text-accent font-semibold">100% Gratuito</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
