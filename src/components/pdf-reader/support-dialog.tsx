"use client";

import { useState, useEffect, useCallback, useRef, ReactNode } from "react";
import QRCode from "qrcode";
import {
  Heart,
  Copy,
  Check,
  KeyRound,
  QrCode as QrCodeIcon,
  ChevronDown,
  ChevronUp,
  AudioLines,
  Zap,
  BookOpen,
  Server,
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
import { VIVA_VOZ_DONATION_CONFIG } from "@/lib/pix";
import { copyToClipboard } from "@/lib/clipboard";
import { PixIcon } from "@/components/ui/pix-icon";

export { PixIcon };

interface SupportDialogProps {
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SupportDialog({ trigger, open, onOpenChange }: SupportDialogProps) {
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const keyInputRef = useRef<HTMLInputElement>(null);
  const payloadInputRef = useRef<HTMLInputElement>(null);

  const [qrCodeSvg, setQrCodeSvg] = useState<string>("");
  const [showQrCode, setShowQrCode] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const pixConfig = VIVA_VOZ_DONATION_CONFIG;
  const pixPayload = pixConfig.payloadPix;

  // Gerar SVG do QR Code de forma assíncrona
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
    const success = await copyToClipboard(pixPayload, dialogContentRef.current);
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
    const success = await copyToClipboard(pixConfig.pixKey, dialogContentRef.current);
    if (success) {
      setCopiedKey(true);
      toast.success("Chave Pix copiada com sucesso!");
      setTimeout(() => setCopiedKey(false), 2500);
    } else {
      toast.info("Chave Pix selecionada. Pressione Ctrl+C para copiar.");
    }
  }, [pixConfig.pixKey]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <button
            type="button"
            data-cy="support-project-btn"
            aria-label="Apoiar o desenvolvimento do VivaVoz"
            title="Contribuição voluntária para o VivaVoz"
            className="flex items-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-all text-xs font-bold shadow-xs hover:scale-[1.02] cursor-pointer"
          >
            <Heart className="size-3.5 fill-rose-500/30 text-rose-500" aria-hidden="true" />
            <span className="hidden sm:inline">Apoiar</span>
          </button>
        )}
      </DialogTrigger>

      <DialogContent
        ref={dialogContentRef}
        className="max-w-md w-[calc(100vw-1.5rem)] sm:w-full p-0 overflow-hidden glass-panel border border-border/80 rounded-3xl shadow-2xl flex flex-col max-h-[90dvh]"
        data-webmcp-tool="supportProject"
      >
        {/* Top Header Limpo */}
        <div className="px-5 pt-6 pb-2 text-center shrink-0">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight flex items-center justify-center gap-2">
              <span>Apoie o VivaVoz</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#32BCAD]/20 text-[#32BCAD] border border-[#32BCAD]/30">
                PIX
              </span>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Contribuição voluntária via Pix para apoiar o VivaVoz.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Corpo com Scroll Suave */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-2 space-y-4">
          {/* Card Unificado: Mensagem de Apoio + Motivos do porquê contribuir */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/40 p-4 space-y-3 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="flex size-7 items-center justify-center rounded-xl bg-emerald-500 text-white shrink-0 mt-0.5 shadow-xs">
                <Heart className="size-4 fill-white" aria-hidden="true" />
              </div>
              <p className="text-xs font-semibold text-emerald-950 dark:text-emerald-200 leading-relaxed">
                Sua contribuição voluntária ajuda a manter o VivaVoz 100% gratuito, rápido e com narrações de alta fidelidade.
              </p>
            </div>

            <div className="border-t border-emerald-500/20 pt-2.5 space-y-2 text-[11px] text-emerald-900/80 dark:text-emerald-200/80">
              <div className="flex items-start gap-2">
                <AudioLines className="size-3.5 text-[#32BCAD] shrink-0 mt-0.5" />
                <span><strong>Vozes Neurais de Estúdio:</strong> Cobre as cotas de áudio ultra-realista sem limites.</span>
              </div>
              <div className="flex items-start gap-2">
                <Zap className="size-3.5 text-[#32BCAD] shrink-0 mt-0.5" />
                <span><strong>100% Grátis & Sem Anúncios:</strong> Experiência de leitura rápida, limpa e acessível.</span>
              </div>
              <div className="flex items-start gap-2">
                <Server className="size-3.5 text-[#32BCAD] shrink-0 mt-0.5" />
                <span><strong>Servidores Rápidos:</strong> Hospedagem estável para carregar seus livros e notas instantaneamente.</span>
              </div>
              <div className="flex items-start gap-2">
                <BookOpen className="size-3.5 text-[#32BCAD] shrink-0 mt-0.5" />
                <span><strong>Apoio a Estudantes e Leitores:</strong> Desenvolvimento contínuo de novas ferramentas.</span>
              </div>
            </div>
          </div>

          {/* Ação 1: Botão Principal de Copiar Código Pix Copia e Cola */}
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
            <p className="text-[10px] text-center text-muted-foreground">
              Cole no aplicativo do seu banco para doar qualquer valor voluntário.
            </p>
          </div>

          {/* Ação 2: Chave Pix Direta com Input Interativo (sem a sigla EVP) */}
          <div className="rounded-2xl border border-border/70 bg-card/60 p-3.5 space-y-2 text-xs">
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
                <div className="p-3 rounded-2xl bg-white shadow-inner border border-slate-200/80 max-w-[190px] aspect-square">
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
        </div>

        {/* Rodapé Seguro com Botão de Voltar */}
        <div className="p-4 sm:p-5 pt-2 border-t border-border/50 shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          <DialogClose asChild>
            <Button
              type="button"
              variant="secondary"
              className="w-full h-10 rounded-2xl text-xs font-bold shadow-xs hover:bg-secondary/80 cursor-pointer"
            >
              Voltar ao início
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
