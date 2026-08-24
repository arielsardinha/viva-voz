"use client";

import Link from "next/link";
import {
  AudioLines,
  BookOpen,
  FolderArchive,
  Heart,
  MessageSquarePlus,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Zap,
} from "lucide-react";
import { DeveloperContactDialog } from "@/components/pdf-reader/developer-contact-dialog";

export function LeadInterestForm() {
  return (
    <section
      id="conversao"
      aria-labelledby="conversao-heading"
      className="relative py-16 sm:py-24 overflow-hidden"
    >
      {/* Glow de Fundo */}
      <div className="absolute inset-0 bg-grid-pattern opacity-25 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[350px] sm:size-[500px] rounded-full bg-gradient-to-r from-accent/15 via-purple-600/10 to-indigo-600/15 blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-border/80 bg-gradient-to-b from-card/90 via-card/70 to-card/95 p-6 sm:p-10 lg:p-12 shadow-2xl backdrop-blur-2xl text-center space-y-8">
          <div className="mx-auto max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3.5 py-1 text-xs font-bold text-accent">
              <Sparkles className="size-3.5" aria-hidden="true" />
              <span>Experimentação Instantânea</span>
            </div>

            <h2
              id="conversao-heading"
              className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground"
            >
              Pronto para transformar a maneira como você lê?
            </h2>

            <p className="text-xs sm:text-base text-muted-foreground leading-relaxed">
              Experimente a união entre voz neural, inteligência artificial e privacidade total.
            </p>
          </div>

          {/* Cards de Ação Direta */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 text-left">
            <Link
              href="/leitor"
              data-cy="cta-open-reader"
              data-testid="cta-open-reader"
              className="group flex flex-col justify-between p-5 rounded-2xl border border-accent/40 bg-accent/10 hover:bg-accent/20 hover:border-accent shadow-md transition-all cursor-pointer"
            >
              <div className="space-y-2">
                <div className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-xs">
                  <AudioLines className="size-4.5" />
                </div>
                <h3 className="text-sm font-bold text-foreground group-hover:text-accent transition-colors">
                  Começar a Usar o Viva-Voz Agora
                </h3>
                <p className="text-xs text-muted-foreground">
                  Carregue arquivos ou cole links para leitura em áudio com vozes neurais.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-bold text-accent">
                <span>Começar a Usar o Viva-Voz Agora</span>
                <ArrowRight className="size-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            <Link
              href="/leituras"
              data-cy="cta-open-library"
              data-testid="cta-open-library"
              className="group flex flex-col justify-between p-5 rounded-2xl border border-border/80 bg-card/60 hover:bg-card/90 hover:border-border transition-all cursor-pointer"
            >
              <div className="space-y-2">
                <div className="flex size-9 items-center justify-center rounded-xl bg-secondary text-foreground shadow-xs">
                  <FolderArchive className="size-4.5 text-indigo-400" />
                </div>
                <h3 className="text-sm font-bold text-foreground">
                  Biblioteca Local
                </h3>
                <p className="text-xs text-muted-foreground">
                  Acesse documentos salvos no seu navegador para leitura offline.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-bold text-foreground/80">
                <span>Ver Leituras</span>
                <ArrowRight className="size-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            <div className="group flex flex-col justify-between p-5 rounded-2xl border border-border/80 bg-card/60 hover:bg-card/90 hover:border-border transition-all">
              <div className="space-y-2">
                <div className="flex size-9 items-center justify-center rounded-xl bg-secondary text-foreground shadow-xs">
                  <MessageSquarePlus className="size-4.5 text-emerald-400" />
                </div>
                <h3 className="text-sm font-bold text-foreground">
                  Contato & Feedback
                </h3>
                <p className="text-xs text-muted-foreground">
                  Envie sugestões de melhorias ou relate problemas diretamente ao desenvolvedor.
                </p>
              </div>
              <div className="mt-4">
                <DeveloperContactDialog
                  trigger={
                    <button
                      type="button"
                      data-cy="cta-contact-dev"
                      data-testid="cta-contact-dev"
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      <span>Falar Conosco</span>
                      <ArrowRight className="size-3" />
                    </button>
                  }
                />
              </div>
            </div>
          </div>

          {/* Destaques de Confiança e Transparência */}
          <div className="pt-2 border-t border-border/60 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs text-muted-foreground font-medium">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-emerald-500" aria-hidden="true" />
              <span>Sem coleta de e-mails ou spam</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="size-4 text-amber-500" aria-hidden="true" />
              <span>100% Gratuito & Livre</span>
            </div>
            <div className="flex items-center gap-1.5">
              <BookOpen className="size-4 text-accent" aria-hidden="true" />
              <span>Múltiplos formatos suportados</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
