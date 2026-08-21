"use client";

import { useState } from "react";
import { ExternalLink, Sparkle } from "lucide-react";
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

interface GeminiKeyDialogProps {
  apiKey: string | null;
  onChange: (key: string | null) => void;
}

export function GeminiKeyDialog({
  apiKey,
  onChange,
  compact = false,
}: GeminiKeyDialogProps & { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          data-cy="gemini-key-trigger"
          title={apiKey ? "Chave Gemini conectada" : "Conectar chave Gemini"}
          aria-label={apiKey ? "Chave Gemini conectada" : "Conectar chave Gemini"}
          className={cn(
            "inline-flex items-center gap-1.5 h-8 sm:h-9 rounded-2xl border text-xs font-semibold transition-all px-2.5 sm:px-3 shadow-xs cursor-pointer",
            apiKey
              ? "border-accent/40 bg-accent/10 text-accent hover:bg-accent/15"
              : "border-border/80 bg-background/80 text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          <Sparkle className={cn("size-3.5 shrink-0", apiKey ? "text-accent fill-accent/20" : "")} aria-hidden="true" />
          <span className={cn(compact ? "hidden" : "hidden sm:inline")}>
            {apiKey ? "Gemini Conectado" : "Conectar Gemini"}
          </span>
          {apiKey && (
            <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" title="Ativo" aria-label="Status: Ativo" />
          )}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle id="gemini-dialog-title">Conectar conta do Gemini (Google AI Studio)</DialogTitle>
          <DialogDescription id="gemini-dialog-desc">
            Siga os 3 passos abaixo para conectar sua chave do Google AI Studio (gratuita ou paga) — a chave fica salva apenas neste navegador.
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
              <span className="bg-muted text-foreground flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold" aria-hidden="true">
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
              <span className="bg-muted text-foreground flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold" aria-hidden="true">
                2
              </span>
              <span>
                Clique em <strong className="text-foreground">Get API key</strong> e crie uma nova chave.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-muted text-foreground flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold" aria-hidden="true">
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
            {apiKey ? (
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

