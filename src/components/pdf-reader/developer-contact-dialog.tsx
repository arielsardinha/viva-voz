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
  Code2,
  GitPullRequest,
  ExternalLink,
  Terminal,
  Layers,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/clipboard";
import {
  DEVELOPER_CONTACT_CONFIG,
  generateMailtoLink,
} from "@/lib/contact";
import { GithubIcon } from "@/components/ui/github-icon";

interface DeveloperContactDialogProps {
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultTab?: "contact" | "contribute";
}

export function DeveloperContactDialog({
  trigger,
  open,
  onOpenChange,
  defaultTab = "contact",
}: DeveloperContactDialogProps) {
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const cloneCmdInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<"contact" | "contribute">(defaultTab);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedCloneCmd, setCopiedCloneCmd] = useState(false);

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

  const handleCopyCloneCmd = useCallback(async () => {
    if (cloneCmdInputRef.current) {
      cloneCmdInputRef.current.select();
    }
    const success = await copyToClipboard(contactConfig.cloneCommand, dialogContentRef.current);
    if (success) {
      setCopiedCloneCmd(true);
      toast.success("Comando git clone copiado com sucesso!");
      setTimeout(() => setCopiedCloneCmd(false), 2500);
    } else {
      toast.info("Comando selecionado. Pressione Ctrl+C para copiar.");
    }
  }, [contactConfig.cloneCommand]);

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
            title="Falar com o desenvolvedor, sugerir recursos ou contribuir com o projeto"
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
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as "contact" | "contribute")}
          className="w-full flex-1 flex flex-col min-h-0"
        >
          {/* Header com Navegação de Abas */}
          <div className="px-5 pt-5 pb-2 text-center shrink-0">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight flex items-center justify-center gap-2">
                <span>Falar com o Desenvolvedor</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                  Comunidade & Contato
                </span>
              </DialogTitle>
              <DialogDescription className="sr-only">
                Canais de contato direto com o desenvolvedor e orientações para contribuir com o projeto de código aberto VivaVoz.
              </DialogDescription>
            </DialogHeader>

            {/* Alternador de Abas */}
            <div className="mt-3 flex justify-center">
              <TabsList
                data-cy="developer-dialog-tabs"
                className="grid grid-cols-2 w-full max-w-xs h-9 p-1 rounded-2xl bg-muted/80 border border-border/60"
              >
                <TabsTrigger
                  value="contact"
                  onClick={() => setActiveTab("contact")}
                  data-cy="tab-contact-trigger"
                  className="rounded-xl text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <Mail className="size-3.5 shrink-0 text-indigo-500" />
                  <span>Contato</span>
                </TabsTrigger>
                <TabsTrigger
                  value="contribute"
                  onClick={() => setActiveTab("contribute")}
                  data-cy="tab-contribute-trigger"
                  className="rounded-xl text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <GitPullRequest className="size-3.5 shrink-0 text-emerald-500" />
                  <span>Contribuir</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          {/* ABA 1: Falar com o Desenvolvedor / Contato Direto */}
          <TabsContent
            value="contact"
            tabIndex={-1}
            className="flex-1 overflow-y-auto px-4 sm:px-6 py-2 space-y-4 focus-visible:outline-hidden mt-0"
          >
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
                className="w-full h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer transition-all hover:scale-[1.01]"
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
          </TabsContent>

          {/* ABA 2: Contribuir com o Projeto */}
          <TabsContent
            value="contribute"
            tabIndex={-1}
            className="flex-1 overflow-y-auto px-4 sm:px-6 py-2 space-y-4 focus-visible:outline-hidden mt-0"
          >
            {/* Card de Boas-Vindas Open Source */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/40 p-4 space-y-3 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="flex size-7 items-center justify-center rounded-xl bg-emerald-600 text-white shrink-0 mt-0.5 shadow-xs">
                  <GithubIcon className="size-4 fill-white" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                    Projeto 100% Livre & Código Aberto
                  </h3>
                  <p className="text-[11px] text-emerald-900/90 dark:text-emerald-300/90 leading-relaxed">
                    O VivaVoz é construído de forma transparente e comunitária. Toda colaboração é bem-vinda para tornar a leitura acessível a todos.
                  </p>
                </div>
              </div>

              {/* Pilares de Contribuição */}
              <div className="border-t border-emerald-500/20 pt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-emerald-900/90 dark:text-emerald-200/90">
                <div className="flex items-start gap-2 bg-emerald-500/5 dark:bg-emerald-900/20 p-2 rounded-xl border border-emerald-500/15">
                  <Code2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Código & Features:</strong> Next.js, React 19, TypeScript e novos leitores.</span>
                </div>
                <div className="flex items-start gap-2 bg-emerald-500/5 dark:bg-emerald-900/20 p-2 rounded-xl border border-emerald-500/15">
                  <Palette className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Design & A11y:</strong> Acessibilidade para leitores de tela e modos visuais.</span>
                </div>
                <div className="flex items-start gap-2 bg-emerald-500/5 dark:bg-emerald-900/20 p-2 rounded-xl border border-emerald-500/15">
                  <Sparkles className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>IA & Vozes:</strong> Motores de TTS, OCR e inteligência multimodal.</span>
                </div>
                <div className="flex items-start gap-2 bg-emerald-500/5 dark:bg-emerald-900/20 p-2 rounded-xl border border-emerald-500/15">
                  <GitPullRequest className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Issues & Ideias:</strong> Sugira melhorias e participe do roadmap.</span>
                </div>
              </div>
            </div>

            {/* Ações Principais no GitHub */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <a
                href={contactConfig.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-cy="github-repo-link"
                className="flex items-center justify-center gap-2 h-11 px-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold shadow-md shadow-slate-900/20 transition-all hover:scale-[1.01] cursor-pointer"
              >
                <GithubIcon className="size-4 fill-white shrink-0" />
                <span>Repositório GitHub</span>
                <ExternalLink className="size-3 opacity-70 ml-auto" />
              </a>

              <a
                href={contactConfig.githubIssuesUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-cy="github-issues-link"
                className="flex items-center justify-center gap-2 h-11 px-3.5 rounded-2xl border border-border/80 bg-background hover:bg-secondary text-foreground text-xs font-bold shadow-xs transition-all hover:scale-[1.01] cursor-pointer"
              >
                <GitPullRequest className="size-4 text-emerald-500 shrink-0" />
                <span>Ver Issues & Ideias</span>
                <ExternalLink className="size-3 opacity-70 ml-auto" />
              </a>
            </div>

            {/* Clonar Repositório com Input e Botão de Copiar */}
            <div className="rounded-2xl border border-border/70 bg-card/60 p-3.5 space-y-2 text-xs">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-foreground font-bold">
                  <Terminal className="size-3.5 text-emerald-500" />
                  Clonar Repositório (Git)
                </span>
                <span className="text-[10px] text-muted-foreground">Copiar comando</span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  ref={cloneCmdInputRef}
                  readOnly
                  value={contactConfig.cloneCommand}
                  aria-label="Comando de clone do Git"
                  onClick={(e) => e.currentTarget.select()}
                  className="flex-1 bg-background/90 border border-border/60 text-[11px] sm:text-xs px-3 py-2 rounded-xl text-foreground font-mono truncate select-all focus:ring-2 focus:ring-emerald-500/40 focus:outline-hidden"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-cy="copy-clone-cmd-btn"
                  aria-label="Copiar comando de clone"
                  onClick={handleCopyCloneCmd}
                  className="h-9 px-3 rounded-xl gap-1 shrink-0 text-xs font-bold border-border/80 hover:bg-emerald-500/10 hover:border-emerald-500/40 cursor-pointer"
                >
                  {copiedCloneCmd ? (
                    <>
                      <Check className="size-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5 text-emerald-500" />
                      <span>Copiar</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Como Começar (3 passos rápidos) */}
            <div className="rounded-2xl border border-border/50 bg-secondary/20 p-3 text-[11px] space-y-1.5 text-muted-foreground">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Layers className="size-3.5 text-indigo-500" />
                <span>Como enviar sua primeira contribuição:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] pl-1">
                <li>Faça um <strong>Fork</strong> do repositório no GitHub</li>
                <li>Crie uma <strong>Branch</strong> para sua alteração</li>
                <li>Abra um <strong>Pull Request</strong> descrevendo sua melhoria</li>
              </ol>
            </div>
          </TabsContent>
        </Tabs>

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
