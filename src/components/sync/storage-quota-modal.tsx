"use client";

import { AlertTriangle, Cloud, HardDrive } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GoogleDriveBenefitsCard } from "./google-drive-benefits-card";
import { useGoogleDriveSync } from "@/hooks/use-google-drive-sync";

export interface StorageQuotaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnectDrive?: () => void;
}

export function StorageQuotaModal({
  open,
  onOpenChange,
  onConnectDrive,
}: StorageQuotaModalProps) {
  const { connect, isLoading } = useGoogleDriveSync();

  const handleConnect = () => {
    onOpenChange(false);
    if (onConnectDrive) {
      onConnectDrive();
    } else {
      connect();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-webmcp-tool="storageQuotaAlert"
        className="max-w-md w-[calc(100vw-1.5rem)] sm:w-full p-0 overflow-hidden glass-panel border border-border/80 rounded-3xl shadow-2xl flex flex-col max-h-[90dvh]"
      >
        {/* Top Header */}
        <div className="px-5 pt-6 pb-2 text-center shrink-0">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight flex items-center justify-center gap-2">
              <HardDrive className="size-5 text-amber-500 shrink-0" aria-hidden="true" />
              <span>Memória Interna Insuficiente</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                Armazenamento Cheio
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              O navegador atingiu o limite de espaço local e não é possível processar este documento diretamente no dispositivo.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Corpo com Scroll Suave */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-2 space-y-4">
          {/* Card Unificado de Benefícios com Aviso de Memória */}
          <GoogleDriveBenefitsCard variant="storage_alert" />

          {/* Botão de Ação Primária: Conectar com Google */}
          <div className="space-y-1.5">
            <Button
              type="button"
              data-cy="connect-google-drive-quota-btn"
              aria-label="Conectar com Google Drive"
              onClick={handleConnect}
              disabled={isLoading}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-accent to-indigo-600 hover:opacity-95 text-accent-foreground font-bold shadow-md shadow-accent/20 flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer transition-all hover:scale-[1.01]"
            >
              <Cloud className="size-4 mr-1" />
              <span>Conectar com Google Drive</span>
            </Button>
            <p className="text-[10px] text-center text-muted-foreground">
              Guarda seus arquivos em sua pasta oculta no Google Drive e libera espaço imediatamente.
            </p>
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
