"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { SyncManifestBuilder } from "@/lib/sync/client/sync-manifest-builder";
import { SyncMergerService } from "@/lib/sync/client/sync-merger.service";
import { AudioSyncService } from "@/lib/sync/client/audio-sync.service";
import { describeDriveError } from "@/lib/sync/domain/drive-error-formatter";
import type { DriveAuthStatus, SyncManifest } from "@/lib/sync/domain/sync.types";

export type SyncPhase =
  | "idle"
  | "checking"
  | "building"
  | "uploading_manifest"
  | "uploading_audios"
  | "downloading"
  | "merging"
  | "completed"
  | "error";

export interface UseGoogleDriveSyncReturn {
  status: DriveAuthStatus;
  isLoading: boolean;
  isSyncing: boolean;
  syncPhase: SyncPhase;
  progress: number;
  errorMessage: string | null;
  showPermissionModal: boolean;
  setShowPermissionModal: (open: boolean) => void;
  checkStatus: () => Promise<void>;
  connect: () => void;
  disconnect: () => Promise<void>;
  backupNow: () => Promise<boolean>;
  restoreNow: () => Promise<boolean>;
}

export function useGoogleDriveSync(): UseGoogleDriveSyncReturn {
  const [status, setStatus] = useState<DriveAuthStatus>({ isConnected: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncPhase, setSyncPhase] = useState<SyncPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/auth/google/status", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as DriveAuthStatus;
        setStatus(data);
      } else {
        setStatus({ isConnected: false });
      }
    } catch {
      setStatus({ isConnected: false });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();

    // Intercepta parâmetros de redirecionamento do OAuth da URL
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const syncError = params.get("sync_error");
      const syncConnected = params.get("sync");

      if (syncConnected === "connected") {
        toast.success("Conta do Google conectada com sucesso!");
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      } else if (syncError) {
        const isPermission = syncError === "permission_denied" || /permission|scope/i.test(syncError);
        const friendlyMsg = describeDriveError(syncError);
        setErrorMessage(friendlyMsg);
        setStatus({ isConnected: false });

        if (isPermission) {
          setShowPermissionModal(true);
        } else {
          toast.error(friendlyMsg);
        }

        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, [checkStatus]);

  const connect = useCallback(() => {
    window.location.href = "/api/auth/google/start";
  }, []);

  const disconnect = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/auth/google/disconnect", { method: "POST" });
      if (res.ok) {
        setStatus({ isConnected: false });
        setErrorMessage(null);
        toast.success("Google Drive desconectado com sucesso.");
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Falha ao desconectar");
      }
    } catch (err: any) {
      toast.error(describeDriveError(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const backupNow = useCallback(async (): Promise<boolean> => {
    if (!status.isConnected) {
      toast.error("Conecte sua conta do Google Drive primeiro.");
      return false;
    }

    try {
      setIsSyncing(true);
      setErrorMessage(null);
      setProgress(10);
      setSyncPhase("building");

      // 1. Extrai dados do IndexedDB local
      const manifest = await SyncManifestBuilder.build();
      setProgress(30);

      // 2. Upload do manifesto JSON
      setSyncPhase("uploading_manifest");
      const backupRes = await fetch("/api/sync/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(manifest),
      });

      if (!backupRes.ok) {
        const err = await backupRes.json().catch(() => ({}));
        throw new Error(err.error || "Falha ao enviar backup para o Google Drive.");
      }
      setProgress(60);

      // 3. Upload de pacotes de áudio por documento (se houver áudios sintetizados)
      setSyncPhase("uploading_audios");
      const totalDocs = manifest.readings.length;
      let processedDocs = 0;

      for (const doc of manifest.readings) {
        try {
          const { buffer, trackCount } = await AudioSyncService.packDocumentAudios(doc.id);
          if (trackCount > 0 && buffer.byteLength > 0) {
            // Inicia sessão resumível
            const initRes = await fetch("/api/sync/audio/resumable", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                documentId: doc.id,
                totalSizeBytes: buffer.byteLength,
              }),
            });

            if (initRes.ok) {
              const { uploadUrl } = await initRes.json();
              if (uploadUrl) {
                // Upload direto via PUT para a URL da sessão do Google Drive
                await fetch(uploadUrl, {
                  method: "PUT",
                  headers: { "Content-Type": "application/octet-stream" },
                  body: buffer,
                });
              }
            }
          }
        } catch {
          // Continua para outros documentos mesmo se o áudio falhar
        }

        processedDocs++;
        const audioProgress = 60 + Math.round((processedDocs / Math.max(1, totalDocs)) * 35);
        setProgress(audioProgress);
      }

      setProgress(100);
      setSyncPhase("completed");
      toast.success("Backup no Google Drive concluído com sucesso!");
      await checkStatus();
      return true;
    } catch (err: any) {
      const rawMsg = err?.message || String(err || "");
      const isPermissionError = /permission|scope|403/i.test(rawMsg);
      const friendlyMsg = describeDriveError(rawMsg);

      if (isPermissionError) {
        // Realiza o logout automático para limpar sessão inválida
        try {
          await fetch("/api/auth/google/disconnect", { method: "POST" });
        } catch {}
        setStatus({ isConnected: false });
        setShowPermissionModal(true);
      } else {
        toast.error(friendlyMsg);
      }

      setSyncPhase("error");
      setErrorMessage(friendlyMsg);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [status.isConnected, checkStatus]);

  const restoreNow = useCallback(async (): Promise<boolean> => {
    if (!status.isConnected) {
      toast.error("Conecte sua conta do Google Drive primeiro.");
      return false;
    }

    try {
      setIsSyncing(true);
      setErrorMessage(null);
      setProgress(15);
      setSyncPhase("downloading");

      // 1. Baixa o manifesto
      const restoreRes = await fetch("/api/sync/restore");
      if (!restoreRes.ok) {
        const err = await restoreRes.json().catch(() => ({}));
        throw new Error(err.error || "Nenhum backup encontrado no Google Drive.");
      }

      const { manifest } = (await restoreRes.json()) as { manifest: SyncManifest };
      setProgress(45);

      // 2. Mescla no IndexedDB
      setSyncPhase("merging");
      const mergeResult = await SyncMergerService.merge(manifest);
      setProgress(75);

      // 3. Baixa áudios correspondentes se existirem
      for (const doc of manifest.readings) {
        try {
          const audioRes = await fetch(`/api/sync/audio/${doc.id}`);
          if (audioRes.ok) {
            const arrayBuf = await audioRes.arrayBuffer();
            if (arrayBuf.byteLength > 0) {
              await AudioSyncService.unpackAndSaveAudios(arrayBuf);
            }
          }
        } catch {
          // Ignora se não houver áudio salvo para esse documento
        }
      }

      setProgress(100);
      setSyncPhase("completed");
      toast.success(
        `Restauração concluída! ${mergeResult.importedDocumentsCount} novos documentos e ${mergeResult.updatedDocumentsCount} atualizados.`
      );
      return true;
    } catch (err: any) {
      const rawMsg = err?.message || String(err || "");
      const isPermissionError = /permission|scope|403/i.test(rawMsg);
      const friendlyMsg = describeDriveError(rawMsg);

      if (isPermissionError) {
        // Realiza o logout automático para limpar sessão inválida
        try {
          await fetch("/api/auth/google/disconnect", { method: "POST" });
        } catch {}
        setStatus({ isConnected: false });
        setShowPermissionModal(true);
      } else {
        toast.error(friendlyMsg);
      }

      setSyncPhase("error");
      setErrorMessage(friendlyMsg);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [status.isConnected]);

  return {
    status,
    isLoading,
    isSyncing,
    syncPhase,
    progress,
    errorMessage,
    showPermissionModal,
    setShowPermissionModal,
    checkStatus,
    connect,
    disconnect,
    backupNow,
    restoreNow,
  };
}
