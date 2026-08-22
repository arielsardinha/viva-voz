"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Cloud, CheckSquare, ShieldAlert, ArrowRight } from "lucide-react";

interface GoogleDrivePermissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: () => void;
}

export function GoogleDrivePermissionModal({
  open,
  onOpenChange,
  onConnect,
}: GoogleDrivePermissionModalProps) {
  const handleConnect = () => {
    onOpenChange(false);
    onConnect();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-webmcp-tool="googleDrivePermissionDialog"
        className="w-full max-w-[95vw] sm:max-w-md max-h-[85dvh] flex flex-col p-4 sm:p-6 overflow-hidden rounded-2xl bg-card border-border shadow-2xl"
      >
        <DialogHeader className="shrink-0 space-y-1.5 text-left">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                Permissão Necessária
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Autorização de acesso à pasta do aplicativo no Google Drive.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2 text-sm text-foreground/90">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Para salvar e restaurar seus livros, configurações e áudios em nuvem, você precisa conceder a permissão na tela do Google.
          </p>

          {/* Destaque visual da opção do Google */}
          <div className="rounded-xl border-2 border-accent/40 bg-accent/10 p-3.5 space-y-2">
            <span className="text-[11px] font-semibold text-accent uppercase tracking-wider block">
              Marque esta opção na tela do Google:
            </span>
            <div className="flex items-start gap-2.5 rounded-lg bg-card/80 p-3 border border-border">
              <div className="flex size-5 items-center justify-center rounded-md bg-accent text-accent-foreground shrink-0 mt-0.5">
                <CheckSquare className="size-4" />
              </div>
              <p className="text-xs font-medium text-foreground leading-snug">
                Ver, criar e excluir os próprios dados de configuração no Google Drive.
              </p>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Seus arquivos ficam salvos em uma pasta oculta e privada, acessível exclusivamente por você no app.
          </p>
        </div>

        <DialogFooter className="shrink-0 flex-col sm:flex-row gap-2 pt-2 border-t border-border/80">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto text-xs font-semibold"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConnect}
            className="w-full sm:flex-1 bg-gradient-to-r from-accent to-indigo-600 text-accent-foreground font-bold shadow-md shadow-accent/20 hover:opacity-95"
          >
            <Cloud className="size-4 mr-2" />
            Conectar e Permitir Acesso
            <ArrowRight className="size-3.5 ml-1.5 opacity-80" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
