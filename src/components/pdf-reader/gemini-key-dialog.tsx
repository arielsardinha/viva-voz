"use client";

import { useState, type ReactNode } from "react";
import { ExternalLink, Mic, Sparkle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

      <DialogContent>
        <DialogHeader>
          <DialogTitle id="gemini-dialog-title">Conectar conta do Gemini (Google AI Studio)</DialogTitle>
          <DialogDescription id="gemini-dialog-desc">
            Siga os 3 passos abaixo para conectar sua chave do Google AI Studio (gratuita ou paga) — a chave habilita tanto a narração com <strong>Vozes Neurais (TTS)</strong> quanto o <strong>Assistente de Estudo</strong> e fica salva apenas neste navegador.
          </DialogDescription>
        </DialogHeader>

        <form
          data-webmcp-tool="configureGeminiApiKey"
          data-webmcp-action="saveApiKey"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="space-y-4"
        >
          <ol className="text-muted-foreground space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <span
                className="bg-muted text-foreground flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
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
                  className="text-primary hover:underline font-semibold inline-flex items-center gap-0.5"
                >
                  Google AI Studio
                  <ExternalLink className="size-3 inline" aria-hidden="true" />
                </a>{" "}
                e faça login com sua conta Google.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span
                className="bg-muted text-foreground flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                aria-hidden="true"
              >
                2
              </span>
              <span>
                Clique em <strong className="text-foreground">Get API key</strong> e crie uma nova chave.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span
                className="bg-muted text-foreground flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                aria-hidden="true"
              >
                3
              </span>
              <span>Cole a chave gerada abaixo e clique em Salvar:</span>
            </li>
          </ol>

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
          />

          <DialogFooter className="gap-2 sm:justify-between pt-2">
            {hasKey ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                  toast.success("Conta Gemini desconectada.");
                }}
              >
                Desconectar
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" data-cy="gemini-key-save-btn">
              Salvar chave
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
