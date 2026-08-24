"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Download,
  Share2,
  PlusSquare,
  Sparkles,
  WifiOff,
  Zap,
  Smartphone,
  CheckCircle2,
} from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { toast } from "sonner";

interface PwaInstallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PwaInstallDialog({ open, onOpenChange }: PwaInstallDialogProps) {
  const { isIos, promptInstall, isInstalled } = usePwaInstall();
  const [isInstalling, setIsInstalling] = useState(false);

  const handleInstallClick = async () => {
    setIsInstalling(true);
    try {
      const outcome = await promptInstall();
      if (outcome === "accepted") {
        toast.success("VivaVoz instalado com sucesso! Aproveite a leitura.");
        onOpenChange(false);
      } else if (outcome === "dismissed") {
        toast.info("Instalação adiada. Você pode instalar quando quiser.");
      }
    } catch {
      toast.error("Não foi possível iniciar a instalação automática.");
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md max-h-[85dvh] flex flex-col p-0 overflow-hidden border-border/60 bg-background/95 backdrop-blur-xl shadow-2xl"
        data-webmcp-tool="installVivaVozPwa"
      >
        <div className="relative bg-gradient-to-br from-primary/20 via-primary/5 to-transparent p-6 pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/25 shrink-0">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                Instalar o VivaVoz
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Experiência de aplicativo nativo no seu dispositivo
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Benefícios */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="flex sm:flex-col items-center sm:items-start gap-2.5 p-2.5 rounded-xl bg-card border border-border/50 text-xs">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                <WifiOff className="w-4 h-4" />
              </div>
              <div>
                <strong className="block font-semibold">100% Offline</strong>
                <span className="text-muted-foreground text-[11px]">Leia e ouça mesmo sem sinal</span>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-start gap-2.5 p-2.5 rounded-xl bg-card border border-border/50 text-xs">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <strong className="block font-semibold">Ultra Rápido</strong>
                <span className="text-muted-foreground text-[11px]">Abertura instantânea</span>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-start gap-2.5 p-2.5 rounded-xl bg-card border border-border/50 text-xs">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <strong className="block font-semibold">Tela Cheia</strong>
                <span className="text-muted-foreground text-[11px]">Sem barras de navegador</span>
              </div>
            </div>
          </div>

          {/* Guia iOS vs Botão Direto */}
          {isIos ? (
            <div className="space-y-3 p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs">
              <p className="font-semibold text-foreground flex items-center gap-1.5 text-xs sm:text-sm">
                <Share2 className="w-4 h-4 text-primary" />
                Como instalar no Safari do iPhone / iPad:
              </p>
              <ol className="space-y-2 text-muted-foreground pl-1">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">
                    1
                  </span>
                  <span>
                    Toque no botão de <strong>Compartilhar</strong> (ícone <Share2 className="w-3.5 h-3.5 inline mx-0.5 text-primary" /> na barra inferior do Safari).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">
                    2
                  </span>
                  <span>
                    Role a lista para baixo e toque em <strong>"Adicionar à Tela de Início"</strong> (<PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-primary" />).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">
                    3
                  </span>
                  <span>
                    No canto superior direito, confirme tocando em <strong>"Adicionar"</strong>.
                  </span>
                </li>
              </ol>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/50 text-xs text-muted-foreground flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                O VivaVoz será instalado como um app independente no seu sistema, ocupando menos de 5MB e com acesso direto pelos atalhos.
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 pt-2 border-t border-border/40 flex-row justify-end gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Fechar
          </Button>

          {!isIos && !isInstalled && (
            <Button
              onClick={handleInstallClick}
              disabled={isInstalling}
              size="sm"
              className="gap-2 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-primary-foreground font-semibold shadow-md shadow-primary/20 text-xs"
            >
              <Download className="w-4 h-4" />
              {isInstalling ? "Instalando..." : "Instalar Agora"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
