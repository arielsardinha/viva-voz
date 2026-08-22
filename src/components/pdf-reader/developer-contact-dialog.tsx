"use client";

import { useState, useCallback, useRef, ReactNode } from "react";
import {
  MessageSquarePlus,
  Lightbulb,
  Palette,
  AudioWaveform,
  MessageCircle,
  Mail,
  Copy,
  Check,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/clipboard";
import {
  DEVELOPER_CONTACT_CONFIG,
  generateMailtoLink,
} from "@/lib/contact";

interface DeveloperContactDialogProps {
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DeveloperContactDialog({
  trigger,
  open,
  onOpenChange,
}: DeveloperContactDialogProps) {
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const contactConfig = DEVELOPER_CONTACT_CONFIG;

  const handleCopyEmail = useCallback(async () => {
    if (emailInputRef.current) {
      emailInputRef.current.select();
    }
    const success = await copyToClipboard(contactConfig.email, dialogContentRef.current);
    if (success) {
      setCopiedEmail(true);
      toast.success("E-mail do desenvolvedor copiado com sucesso!");
      setTimeout(() => setCopiedEmail(false), 2500);
    } else {
      toast.info("E-mail selecionado. Pressione Ctrl+C para copiar.");
    }
  }, [contactConfig.email]);

  const handleOpenMail = () => {
    const url = generateMailtoLink();
    window.location.href = url;
    toast.success("Abrindo seu aplicativo de e-mail...");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <button
            type="button"
            data-cy="developer-contact-trigger"
            aria-label="Entrar em contato com o desenvolvedor"
            title="Falar com o desenvolvedor, sugerir recursos ou feedback"
            className="flex items-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 rounded-2xl border border-border/80 bg-background/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all text-xs font-semibold shadow-xs cursor-pointer"
          >
            <MessageSquarePlus className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Contato</span>
          </button>
        )}
      </DialogTrigger>

      <DialogContent
        ref={dialogContentRef}
        className="max-w-md w-[calc(100vw-1.5rem)] sm:w-full p-0 overflow-hidden glass-panel border border-border/80 rounded-3xl shadow-2xl flex flex-col max-h-[90dvh]"
        data-webmcp-tool="contactDeveloper"
      >
        {/* Header Limpo */}
        <div className="px-5 pt-6 pb-2 text-center shrink-0">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight flex items-center justify-center gap-2">
              <span>Falar com o Desenvolvedor</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                E-mail Direto
              </span>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Informações e orientações para entrar em contato com o desenvolvedor do VivaVoz.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Corpo com Scroll Suave */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-2 space-y-4">
          {/* Card Unificado de Orientação: Quando mandar e-mail */}
          <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 dark:bg-indigo-950/40 p-4 space-y-3 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="flex size-7 items-center justify-center rounded-xl bg-indigo-500 text-white shrink-0 mt-0.5 shadow-xs">
                <Sparkles className="size-4 fill-white" aria-hidden="true" />
              </div>
              <p className="text-xs font-semibold text-indigo-950 dark:text-indigo-200 leading-relaxed">
                Sua experiência e suas ideias ajudam a moldar a evolução do VivaVoz. Sinta-se à vontade para enviar um e-mail para:
              </p>
            </div>

            <div className="border-t border-indigo-500/20 pt-2.5 space-y-2 text-[11px] text-indigo-900/90 dark:text-indigo-200/90">
              <div className="flex items-start gap-2">
                <Lightbulb className="size-3.5 text-indigo-500 shrink-0 mt-0.5" />
                <span><strong>Sugerir Novos Recursos:</strong> Ideias de ferramentas, novos modos de estudo, player ou áudio.</span>
              </div>
              <div className="flex items-start gap-2">
                <Palette className="size-3.5 text-indigo-500 shrink-0 mt-0.5" />
                <span><strong>Usabilidade & Acessibilidade:</strong> Dicas de layout, temas de cores, tamanhos de fonte ou atalhos.</span>
              </div>
              <div className="flex items-start gap-2">
                <AudioWaveform className="size-3.5 text-indigo-500 shrink-0 mt-0.5" />
                <span><strong>Vozes Neurais & Narração:</strong> Sugestões de entonação, vozes neurais e suporte a outros idiomas.</span>
              </div>
              <div className="flex items-start gap-2">
                <MessageCircle className="size-3.5 text-indigo-500 shrink-0 mt-0.5" />
                <span><strong>Dúvidas, Parcerias ou Feedback:</strong> Perguntas gerais, contato institucional ou trocar uma ideia sobre o projeto.</span>
              </div>
            </div>
          </div>

          {/* Ação 1: Botão Principal de Enviar E-mail */}
          <div className="space-y-1.5">
            <Button
              type="button"
              variant="default"
              data-cy="contact-email-btn"
              aria-label="Enviar E-mail para o Desenvolvedor"
              onClick={handleOpenMail}
              className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer transition-all hover:scale-[1.01]"
            >
              <Mail className="size-4 text-white" />
              <span>Enviar E-mail para o Desenvolvedor</span>
            </Button>
            <p className="text-[10px] text-center text-muted-foreground">
              Abre seu aplicativo padrão de e-mail pronto para escrever.
            </p>
          </div>

          {/* Ação 2: E-mail Direto com Input Interativo e Botão de Copiar */}
          <div className="rounded-2xl border border-border/70 bg-card/60 p-3.5 space-y-2 text-xs">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-foreground font-bold">
                <Mail className="size-3.5 text-indigo-500" />
                E-mail de Contato Direto
              </span>
              <span className="text-[10px] text-muted-foreground">Clique para selecionar</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={emailInputRef}
                readOnly
                value={contactConfig.email}
                aria-label="E-mail do desenvolvedor"
                onClick={(e) => e.currentTarget.select()}
                className="flex-1 bg-background/90 border border-border/60 text-xs px-3 py-2 rounded-xl text-foreground font-mono truncate select-all focus:ring-2 focus:ring-indigo-500/40 focus:outline-hidden"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                aria-label="Copiar E-mail"
                onClick={handleCopyEmail}
                className="h-9 px-3 rounded-xl gap-1 shrink-0 text-xs font-bold border-border/80 hover:bg-indigo-500/10 hover:border-indigo-500/40 cursor-pointer"
              >
                {copiedEmail ? (
                  <>
                    <Check className="size-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5 text-indigo-500" />
                    <span>Copiar</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Rodapé Seguro com Botão de Voltar */}
        <div className="p-4 sm:p-5 pt-2 border-t border-border/50 shrink-0 flex items-center justify-end pb-[calc(1rem+env(safe-area-inset-bottom,0px))] bg-card/30">
          <DialogClose asChild>
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto px-6 h-9 rounded-xl text-xs font-bold shadow-xs hover:bg-secondary/80 cursor-pointer"
            >
              Voltar ao início
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
