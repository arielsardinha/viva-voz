"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import {
  Heart,
  Copy,
  Check,
  KeyRound,
  QrCode as QrCodeIcon,
  ArrowLeft,
  Server,
  AudioLines,
  Zap,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Star,
  GitPullRequest,
  Lightbulb,
  Bug,
  Share2,
  ExternalLink,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { VIVA_VOZ_DONATION_CONFIG } from "@/lib/pix";
import { VIVA_VOZ_GITHUB_CONFIG } from "@/lib/github";
import { copyToClipboard } from "@/lib/clipboard";
import { PixIcon } from "@/components/ui/pix-icon";
import { GithubIcon } from "@/components/ui/github-icon";

export function SupportView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const keyInputRef = useRef<HTMLInputElement>(null);
  const payloadInputRef = useRef<HTMLInputElement>(null);
  const repoInputRef = useRef<HTMLInputElement>(null);

  const [qrCodeSvg, setQrCodeSvg] = useState<string>("");
  const [showQrCode, setShowQrCode] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedRepoUrl, setCopiedRepoUrl] = useState(false);
  const [activeTab, setActiveTab] = useState<"pix" | "dev">("pix");

  const pixConfig = VIVA_VOZ_DONATION_CONFIG;
  const pixPayload = pixConfig.payloadPix;
  const githubConfig = VIVA_VOZ_GITHUB_CONFIG;

  useEffect(() => {
    QRCode.toString(pixPayload, {
      type: "svg",
      margin: 1,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then((svgString) => {
        setQrCodeSvg(svgString);
      })
      .catch((err) => {
        console.error("Erro ao gerar QR Code:", err);
      });
  }, [pixPayload]);

  const handleCopyPayload = useCallback(async () => {
    if (payloadInputRef.current) {
      payloadInputRef.current.select();
    }
    const success = await copyToClipboard(pixPayload, containerRef.current);
    if (success) {
      setCopiedPayload(true);
      toast.success("Código Pix copiado! Cole no aplicativo do seu banco.");
      setTimeout(() => setCopiedPayload(false), 2500);
    } else {
      toast.info("Código Pix selecionado. Pressione Ctrl+C para copiar.");
    }
  }, [pixPayload]);

  const handleCopyKey = useCallback(async () => {
    if (keyInputRef.current) {
      keyInputRef.current.select();
    }
    const success = await copyToClipboard(pixConfig.pixKey, containerRef.current);
    if (success) {
      setCopiedKey(true);
      toast.success("Chave Pix copiada com sucesso!");
      setTimeout(() => setCopiedKey(false), 2500);
    } else {
      toast.info("Chave Pix selecionada. Pressione Ctrl+C para copiar.");
    }
  }, [pixConfig.pixKey]);

  const handleCopyRepoUrl = useCallback(async () => {
    if (repoInputRef.current) {
      repoInputRef.current.select();
    }
    const success = await copyToClipboard(githubConfig.repositoryUrl, containerRef.current);
    if (success) {
      setCopiedRepoUrl(true);
      toast.success("Link do repositório no GitHub copiado!");
      setTimeout(() => setCopiedRepoUrl(false), 2500);
    } else {
      toast.info("Link selecionado. Pressione Ctrl+C para copiar.");
    }
  }, [githubConfig.repositoryUrl]);

  return (
    <main
      data-webmcp-tool="supportProject"
      className="min-h-[calc(100dvh-4rem)] flex flex-col items-center justify-start p-4 sm:p-6 md:p-10 pb-16 max-w-2xl mx-auto space-y-6"
    >
      {/* Botão de Navegação Voltar */}
      <div className="w-full flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors py-1 px-3 rounded-xl hover:bg-secondary/80 border border-border/40"
        >
          <ArrowLeft className="size-4" />
          <span>Voltar ao Leitor</span>
        </Link>
      </div>

      {/* Hero Header Limpo */}
      <div className="text-center space-y-2 max-w-xl">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center justify-center gap-2">
          <span>Apoie o VivaVoz</span>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#32BCAD]/20 text-[#32BCAD] border border-[#32BCAD]/30">
            Livre & Aberto
          </span>
        </h1>
      </div>

      {/* Container Principal */}
      <div
        ref={containerRef}
        className="w-full glass-panel border border-border/80 rounded-3xl p-4 sm:p-7 shadow-xl space-y-5 flex flex-col"
      >
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as "pix" | "dev")}
          className="w-full flex flex-col space-y-5"
        >
          {/* Seletor de Abas */}
          <TabsList className="grid grid-cols-2 w-full h-11 p-1 bg-secondary/60 rounded-2xl border border-border/60">
            <TabsTrigger
              value="pix"
              onClick={() => setActiveTab("pix")}
              className="rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all"
            >
              <PixIcon className="size-4 text-[#32BCAD]" />
              <span>Doação Pix</span>
            </TabsTrigger>
            <TabsTrigger
              value="dev"
              onClick={() => setActiveTab("dev")}
              className="rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all"
            >
              <GithubIcon className="size-4 text-foreground" />
              <span>Desenvolvimento</span>
            </TabsTrigger>
          </TabsList>

          {/* Conteúdo Aba Pix */}
          <TabsContent value="pix" className="space-y-5 focus-visible:outline-hidden mt-0">
            {/* Card Unificado: Mensagem de Apoio + Motivos da Contribuição */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/40 p-4 space-y-3.5 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500 text-white shrink-0 shadow-xs">
                  <Heart className="size-4 fill-white" aria-hidden="true" />
                </div>
                <p className="text-xs sm:text-sm font-semibold text-emerald-950 dark:text-emerald-200 leading-relaxed">
                  Sua contribuição voluntária ajuda a manter o VivaVoz 100% gratuito, rápido e com narrações de alta fidelidade.
                </p>
              </div>

              <div className="border-t border-emerald-500/20 pt-3 space-y-2 text-xs text-emerald-900/80 dark:text-emerald-200/80">
                <div className="flex items-start gap-2.5">
                  <AudioLines className="size-4 text-[#32BCAD] shrink-0 mt-0.5" />
                  <span><strong>Vozes Neurais de Estúdio:</strong> Cobre as cotas de áudio ultra-realista sem limites.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Sparkles className="size-4 text-[#32BCAD] shrink-0 mt-0.5" />
                  <span><strong>Consultas com IA:</strong> Mantém o assistente inteligente ativo para responder perguntas e resumir documentos.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Zap className="size-4 text-[#32BCAD] shrink-0 mt-0.5" />
                  <span><strong>100% Grátis & Sem Anúncios:</strong> Experiência de leitura rápida, limpa e acessível.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Server className="size-4 text-[#32BCAD] shrink-0 mt-0.5" />
                  <span><strong>Servidores Rápidos:</strong> Hospedagem estável para carregar seus livros e notas instantaneamente.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <BookOpen className="size-4 text-[#32BCAD] shrink-0 mt-0.5" />
                  <span><strong>Apoio a Estudantes e Leitores:</strong> Desenvolvimento contínuo de novas ferramentas.</span>
                </div>
              </div>
            </div>

            {/* Botão de Destaque: Copiar Código Pix Copia e Cola */}
            <div className="space-y-1.5">
              <Button
                type="button"
                variant="default"
                aria-label="Copiar Código Pix"
                onClick={handleCopyPayload}
                className="w-full h-12 rounded-2xl bg-[#32BCAD] hover:bg-[#2ca89b] text-white font-bold shadow-md shadow-[#32BCAD]/20 flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer transition-all hover:scale-[1.01]"
              >
                {copiedPayload ? (
                  <>
                    <Check className="size-4 text-white" />
                    <span>Código Pix Copiado!</span>
                  </>
                ) : (
                  <>
                    <PixIcon className="size-4 text-white" />
                    <span>Copiar Código Pix (Copia e Cola)</span>
                  </>
                )}
              </Button>
              <p className="text-[11px] text-center text-muted-foreground">
                Basta copiar o código acima e colar na opção &quot;Pix Copia e Cola&quot; do seu aplicativo bancário.
              </p>
            </div>

            {/* Card de Dados da Chave Pix com Input Selecionável (sem sigla EVP) */}
            <div className="w-full rounded-2xl border border-border/70 bg-card/60 p-3.5 space-y-2.5 text-xs">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-foreground font-bold">
                  <KeyRound className="size-3.5 text-[#32BCAD]" />
                  Chave Pix Aleatória
                </span>
                <span className="text-[10px] text-muted-foreground">Clique para selecionar</span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  ref={keyInputRef}
                  readOnly
                  value={pixConfig.pixKey}
                  aria-label="Chave Pix Aleatória"
                  onClick={(e) => e.currentTarget.select()}
                  className="flex-1 bg-background/90 border border-border/60 text-xs px-3 py-2 rounded-xl text-foreground font-mono truncate select-all focus:ring-2 focus:ring-[#32BCAD]/40 focus:outline-hidden"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-label="Copiar Chave Pix"
                  onClick={handleCopyKey}
                  className="h-9 px-3 rounded-xl gap-1 shrink-0 text-xs font-bold border-border/80 hover:bg-[#32BCAD]/10 hover:border-[#32BCAD]/40 cursor-pointer"
                >
                  {copiedKey ? (
                    <>
                      <Check className="size-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">Copiada!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5 text-[#32BCAD]" />
                      <span>Copiar</span>
                    </>
                  )}
                </Button>
              </div>

              <input
                ref={payloadInputRef}
                readOnly
                value={pixPayload}
                aria-label="Código Pix Copia e Cola"
                className="sr-only"
              />
            </div>

            {/* Opção Alternativa: Ver QR Code Opcional (Expansível) */}
            <div className="rounded-2xl border border-border/60 bg-secondary/30 overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => setShowQrCode((prev) => !prev)}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <QrCodeIcon className="size-3.5 text-[#32BCAD]" />
                  <span>{showQrCode ? "Ocultar QR Code" : "Prefere escanear com a câmera? Ver QR Code"}</span>
                </span>
                {showQrCode ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              </button>

              {showQrCode && (
                <div
                  data-testid="pix-qrcode-container"
                  className="p-4 pt-1 flex flex-col items-center justify-center animate-in fade-in-50 duration-200"
                >
                  <div className="p-3 rounded-2xl bg-white shadow-inner border border-slate-200/80 max-w-[200px] aspect-square">
                    {qrCodeSvg ? (
                      <div
                        className="w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:block"
                        dangerouslySetInnerHTML={{ __html: qrCodeSvg }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                        <QrCodeIcon className="size-8 animate-pulse" />
                        <span className="text-[11px] font-medium">Gerando...</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-2">
                    Abra o app do seu banco e aponte para o QR Code acima.
                  </span>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Conteúdo Aba Desenvolvimento */}
          <TabsContent value="dev" className="space-y-5 focus-visible:outline-hidden mt-0">
            {/* Card de Apoio Open Source */}
            <div className="rounded-2xl border border-border/70 bg-secondary/30 p-4 sm:p-5 space-y-3.5 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="flex size-8 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-slate-800 shrink-0 shadow-xs">
                  <GithubIcon className="size-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-bold text-foreground">Código Aberto & Comunidade</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-900/10 dark:bg-slate-100/10 text-foreground border border-border/60">
                      Open Source
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    O VivaVoz é desenvolvido de forma transparente e comunitária. Você pode impulsionar o projeto através do GitHub:
                  </p>
                </div>
              </div>

              <div className="border-t border-border/50 pt-3 space-y-2.5 text-xs text-muted-foreground">
                <div className="flex items-start gap-2.5">
                  <Star className="size-4 text-amber-500 shrink-0 mt-0.5 fill-amber-500/20" />
                  <span><strong className="text-foreground">Deixar uma Estrela (Star):</strong> Dê destaque ao repositório para que mais pessoas conheçam a ferramenta.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Lightbulb className="size-4 text-[#32BCAD] shrink-0 mt-0.5" />
                  <span><strong className="text-foreground">Sugerir Ideias & Recursos:</strong> Abra issues com propostas de novos modos de estudo, player e temas.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Bug className="size-4 text-rose-500 shrink-0 mt-0.5" />
                  <span><strong className="text-foreground">Relatar Problemas:</strong> Reporte bugs e melhorias para mantermos o leitor rápido e confiável.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <GitPullRequest className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong className="text-foreground">Contribuir com Código:</strong> Envie Pull Requests para aprimorar o frontend em Next.js e TypeScript.</span>
                </div>
              </div>
            </div>

            {/* Botão de Destaque Principal: Repositório GitHub */}
            <div className="space-y-1.5">
              <a
                href={githubConfig.repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Acessar repositório do VivaVoz no GitHub"
                className="w-full h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold shadow-md shadow-slate-900/15 flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer transition-all hover:scale-[1.01]"
              >
                <GithubIcon className="size-4" />
                <span>Ver Repositório no GitHub</span>
                <ExternalLink className="size-3.5 opacity-75" />
              </a>
              <p className="text-[11px] text-center text-muted-foreground">
                Acesse o repositório oficial para favoritar com estrela ⭐ ou acompanhar releases.
              </p>
            </div>

            {/* Card de Cópia da URL do Repositório */}
            <div className="w-full rounded-2xl border border-border/70 bg-card/60 p-3.5 space-y-2.5 text-xs">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-foreground font-bold">
                  <Share2 className="size-3.5 text-foreground" />
                  Link do Repositório Oficial
                </span>
                <span className="text-[10px] text-muted-foreground">Clique para selecionar</span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  ref={repoInputRef}
                  readOnly
                  value={githubConfig.repositoryUrl}
                  aria-label="Link do Repositório no GitHub"
                  onClick={(e) => e.currentTarget.select()}
                  className="flex-1 bg-background/90 border border-border/60 text-xs px-3 py-2 rounded-xl text-foreground font-mono truncate select-all focus:ring-2 focus:ring-foreground/20 focus:outline-hidden"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-label="Copiar Link do GitHub"
                  onClick={handleCopyRepoUrl}
                  className="h-9 px-3 rounded-xl gap-1 shrink-0 text-xs font-bold border-border/80 hover:bg-secondary cursor-pointer"
                >
                  {copiedRepoUrl ? (
                    <>
                      <Check className="size-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5 text-muted-foreground" />
                      <span>Copiar</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Ações Rápidas de Apoio */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <a
                href={githubConfig.issuesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 p-3 rounded-xl border border-border/70 bg-secondary/40 hover:bg-secondary text-xs font-semibold text-foreground transition-colors text-center"
              >
                <Lightbulb className="size-3.5 text-[#32BCAD]" />
                <span>Abrir Issue / Ideia</span>
              </a>
              <a
                href={githubConfig.starsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 p-3 rounded-xl border border-border/70 bg-secondary/40 hover:bg-secondary text-xs font-semibold text-foreground transition-colors text-center"
              >
                <Star className="size-3.5 text-amber-500 fill-amber-500/20" />
                <span>Ver Stars no GitHub</span>
              </a>
            </div>
          </TabsContent>
        </Tabs>

        <div className="p-3.5 rounded-2xl bg-secondary/50 border border-border/60 text-center">
          <p className="text-xs text-muted-foreground">
            Muito obrigado por apoiar o desenvolvimento do VivaVoz! ❤️
          </p>
        </div>
      </div>
    </main>
  );
}
