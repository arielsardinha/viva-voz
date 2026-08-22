"use client";

import { useState } from "react";
import {
  Cloud,
  CloudCheck,
  CloudUpload,
  CloudDownload,
  Loader2,
  LogOut,
  ShieldCheck,
  AlertCircle,
  FolderLock,
  Volume2,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { GoogleDrivePermissionModal } from "./google-drive-permission-modal";
import { useGoogleDriveSync } from "@/hooks/use-google-drive-sync";
import { cn } from "@/lib/utils";

interface GoogleDriveSyncModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GoogleDriveSyncModal({ open, onOpenChange }: GoogleDriveSyncModalProps) {
  const {
    status,
    isLoading,
    isSyncing,
    syncPhase,
    progress,
    errorMessage,
    showPermissionModal,
    setShowPermissionModal,
    connect,
    disconnect,
    backupNow,
    restoreNow,
    syncBidirectional,
  } = useGoogleDriveSync();

  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const formatLastSync = (timestamp?: number) => {
    if (!timestamp) return "Nenhum backup recente";
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(timestamp));
  };

  const getPhaseDescription = () => {
    switch (syncPhase) {
      case "checking":
        return "Verificando dados na nuvem e no dispositivo...";
      case "building":
        return "Coletando leituras e preferências locais...";
      case "uploading_manifest":
        return "Enviando biblioteca para o Google Drive...";
      case "uploading_audios":
        return "Sincronizando cache de áudios sintetizados...";
      case "downloading":
        return "Baixando dados do Google Drive...";
      case "merging":
        return "Mesclando biblioteca e progresso de leitura...";
      case "completed":
        return "Sincronização concluída com sucesso!";
      case "error":
        return errorMessage || "Erro durante a sincronização.";
      default:
        return "Processando...";
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          data-webmcp-tool="googleDriveSync"
          className="w-full max-w-[95vw] sm:max-w-md max-h-[85dvh] flex flex-col p-4 sm:p-6 overflow-hidden rounded-2xl bg-card border-border shadow-2xl"
        >
          <DialogHeader className="shrink-0 space-y-1.5 text-left">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <Cloud className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                  Backup no Google Drive
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Sincronize sua biblioteca, progresso e áudios de forma segura.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2 text-sm text-foreground/90">
            {/* Box de Informações de Privacidade */}
            <div className="rounded-xl bg-secondary/50 p-3 border border-border/60 text-xs space-y-2">
              <div className="flex items-center gap-2 text-accent font-semibold">
                <FolderLock className="size-4 shrink-0" />
                <span>Pasta Oculta e Isolada</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Os arquivos ficam guardados de forma privada na área oculta do seu próprio Google Drive, sem poluir suas pastas pessoais. Somente você tem acesso aos seus dados e arquivos.
              </p>
            </div>

            {/* Status de Conexão */}
            <div className="rounded-xl bg-background p-3.5 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Status da Conexão</span>
                {isLoading ? (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Verificando...</span>
                  </div>
                ) : status.isConnected ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-500 border border-emerald-500/30">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Conectado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    Desconectado
                  </span>
                )}
              </div>

              {status.isConnected && (
                <div className="space-y-1 text-xs">
                  {status.email && (
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Conta Google:</span>
                      <span className="font-medium text-foreground truncate max-w-[180px]">
                        {status.email}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Último Backup:</span>
                    <span className="font-medium text-foreground">
                      {formatLastSync(status.lastSyncTimestamp)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Barra de Progresso de Sincronização */}
            {isSyncing && (
              <div className="rounded-xl bg-accent/10 p-3.5 border border-accent/20 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-semibold text-accent">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="size-3.5 animate-spin" />
                    {getPhaseDescription()}
                  </span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2 bg-accent/20" />
              </div>
            )}

            {/* Mensagem de Erro */}
            {errorMessage && !isSyncing && (
              <div className="flex items-start gap-2 rounded-xl bg-destructive/15 p-3 text-xs text-destructive border border-destructive/30">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <p>{errorMessage}</p>
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 flex-col gap-2 pt-2 border-t border-border/80">
            {!status.isConnected ? (
              <Button
                type="button"
                onClick={connect}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-accent to-indigo-600 text-accent-foreground font-bold shadow-md shadow-accent/20 hover:opacity-95 cursor-pointer"
              >
                <Cloud className="size-4 mr-2" />
                Conectar com Google
              </Button>
            ) : (
              <div className="w-full flex flex-col gap-2">
                {/* Botão de Ação Primária: Sincronização Inteligente Completa */}
                <Button
                  type="button"
                  onClick={() => syncBidirectional()}
                  disabled={isSyncing}
                  className="w-full text-xs sm:text-sm font-bold bg-accent text-accent-foreground shadow-md shadow-accent/25 hover:bg-accent/90 cursor-pointer"
                >
                  {isSyncing ? (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4 mr-2" />
                  )}
                  Sincronizar Agora (Enviar & Receber)
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => restoreNow()}
                    disabled={isSyncing}
                    className="flex-1 text-xs font-semibold cursor-pointer"
                  >
                    <CloudDownload className="size-3.5 mr-1.5 text-accent" />
                    Apenas Baixar
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => backupNow()}
                    disabled={isSyncing}
                    className="flex-1 text-xs font-semibold cursor-pointer"
                  >
                    <CloudUpload className="size-3.5 mr-1.5 text-accent" />
                    Apenas Enviar
                  </Button>

                  {confirmDisconnect ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        disconnect();
                        setConfirmDisconnect(false);
                      }}
                      className="text-xs shrink-0 cursor-pointer"
                    >
                      Confirmar
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setConfirmDisconnect(true)}
                      title="Desconectar do Google Drive"
                      aria-label="Desconectar do Google Drive"
                      className="shrink-0 text-muted-foreground hover:text-destructive cursor-pointer"
                    >
                      <LogOut className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Popup Específico de Permissão Necessária */}
      <GoogleDrivePermissionModal
        open={showPermissionModal}
        onOpenChange={setShowPermissionModal}
        onConnect={connect}
      />
    </>
  );
}
