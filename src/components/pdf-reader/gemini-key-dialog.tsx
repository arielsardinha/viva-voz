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

interface GeminiKeyDialogProps {
  apiKey: string | null;
  onChange: (key: string | null) => void;
}

export function GeminiKeyDialog({ apiKey, onChange }: GeminiKeyDialogProps) {
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
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
          <Sparkle className="size-3.5" />
          {apiKey ? "Conta Gemini conectada" : "Conectar minha conta Gemini"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conectar conta do Gemini (Google AI Studio)</DialogTitle>
          <DialogDescription>
            Siga os 3 passos abaixo para conectar sua chave do Google AI Studio (gratuita ou paga) — a chave fica salva apenas neste navegador.
          </DialogDescription>
        </DialogHeader>

        <ol className="text-muted-foreground space-y-3 text-sm">
          <li className="flex gap-2">
            <span className="bg-accent/15 text-accent flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold">
              1
            </span>
            <span className="min-w-0">
              Entre com sua conta Google no Google AI Studio (mesma conta do plano pago).
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-accent mt-2 inline-flex items-center gap-1.5 rounded-lg border border-current px-3 py-1.5 text-xs font-semibold"
              >
                <ExternalLink className="size-3.5" /> Entrar com o Google e abrir o AI Studio
              </a>
            </span>
          </li>
          <li className="flex gap-2">
            <span className="bg-accent/15 text-accent flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold">
              2
            </span>
            <span className="min-w-0">
              Clique em <strong>Create API key</strong> e copie a chave gerada (começa com
              “AIza…”).
            </span>
          </li>
          <li className="flex gap-2">
            <span className="bg-accent/15 text-accent flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold">
              3
            </span>
            <span className="min-w-0">Cole a chave no campo abaixo e salve.</span>
          </li>
        </ol>

        <Input
          type="password"
          placeholder="AIza..."
          value={value}
          onChange={(event) => setValue(event.target.value)}
          autoComplete="off"
        />
        <DialogFooter className="gap-2 sm:justify-between">
          {apiKey ? (
            <Button
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
          <Button onClick={save}>Salvar chave</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
