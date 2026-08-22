"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

export const DRIVE_AUTH_STATUS_STORAGE_KEY = "vivavoz_gdrive_auth_status";

export function getCachedDriveAuthStatus(): DriveAuthStatus | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(DRIVE_AUTH_STATUS_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DriveAuthStatus;
  } catch {
    return null;
  }
}

export function setCachedDriveAuthStatus(status: DriveAuthStatus): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(DRIVE_AUTH_STATUS_STORAGE_KEY, JSON.stringify(status));
  } catch {}
}

export function clearCachedDriveAuthStatus(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(DRIVE_AUTH_STATUS_STORAGE_KEY);
  } catch {}
}

export interface UseGoogleDriveSyncReturn {
  status: DriveAuthStatus;
  isLoading: boolean;
  isSyncing: boolean;
  syncPhase: SyncPhase;
  progress: number;
  errorMessage: string | null;
  showPermissionModal: boolean;
  setShowPermissionModal: (open: boolean) => void;
  checkStatus: (force?: boolean) => Promise<DriveAuthStatus>;
  connect: () => void;
  disconnect: () => Promise<void>;
  backupNow: () => Promise<boolean>;
  restoreNow: () => Promise<boolean>;
  syncBidirectional: (isAutoOnConnect?: boolean) => Promise<boolean>;
}

export function useGoogleDriveSync(): UseGoogleDriveSyncReturn {
  const isMountedRef = useRef(true);
  const [status, setStatus] = useState<DriveAuthStatus>({ isConnected: false });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncPhase, setSyncPhase] = useState<SyncPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  const safeSetStatus = useCallback((val: DriveAuthStatus | ((prev: DriveAuthStatus) => DriveAuthStatus)) => {
    if (isMountedRef.current) setStatus(val);
  }, []);

  const safeSetIsLoading = useCallback((val: boolean) => {
    if (isMountedRef.current) setIsLoading(val);
  }, []);

  const safeSetIsSyncing = useCallback((val: boolean) => {
    if (isMountedRef.current) setIsSyncing(val);
  }, []);

  const safeSetSyncPhase = useCallback((val: SyncPhase) => {
    if (isMountedRef.current) setSyncPhase(val);
  }, []);

  const safeSetProgress = useCallback((val: number) => {
    if (isMountedRef.current) setProgress(val);
  }, []);

  const safeSetErrorMessage = useCallback((val: string | null) => {
    if (isMountedRef.current) setErrorMessage(val);
  }, []);

  const safeSetShowPermissionModal = useCallback((val: boolean) => {
    if (isMountedRef.current) setShowPermissionModal(val);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const checkStatus = useCallback(async (force: boolean = false): Promise<DriveAuthStatus> => {
    if (!force) {
      const cached = getCachedDriveAuthStatus();
      if (cached !== null) {
        safeSetStatus(cached);
        safeSetIsLoading(false);
        return cached;
      }
    }

    try {
      safeSetIsLoading(true);
      const res = await fetch("/api/auth/google/status", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as DriveAuthStatus;
        setCachedDriveAuthStatus(data);
        safeSetStatus(data);
        return data;
      } else {
        const data = { isConnected: false };
        setCachedDriveAuthStatus(data);
        safeSetStatus(data);
        return data;
      }
    } catch {
      const data = { isConnected: false };
      setCachedDriveAuthStatus(data);
      safeSetStatus(data);
      return data;
    } finally {
      safeSetIsLoading(false);
    }
  }, [safeSetIsLoading, safeSetStatus]);


  const syncBidirectional = useCallback(async (isAutoOnConnect: boolean = false): Promise<boolean> => {
    try {
      safeSetIsSyncing(true);
      safeSetErrorMessage(null);
      safeSetProgress(5);
      safeSetSyncPhase("checking");

      let importedCount = 0;
      let updatedCount = 0;

      // 1. Verifica se há backup remoto no Google Drive
      const restoreRes = await fetch("/api/sync/restore");
      if (restoreRes.ok) {
        safeSetSyncPhase("downloading");
        safeSetProgress(20);
        const { manifest } = (await restoreRes.json()) as { manifest: SyncManifest };

        // 2. Mescla no IndexedDB local
        safeSetSyncPhase("merging");
        safeSetProgress(40);
        const mergeResult = await SyncMergerService.merge(manifest);
        importedCount = mergeResult.importedDocumentsCount;
        updatedCount = mergeResult.updatedDocumentsCount;

        // 3. Baixa áudios remotos para o cache local
        if (manifest.readings && manifest.readings.length > 0) {
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
              // Continua mesmo se o áudio falhar
            }
          }
        }
      }

      safeSetProgress(60);

      // 4. Constrói manifesto com o estado consolidado (local + mesclado)
      safeSetSyncPhase("building");
      const currentManifest = await SyncManifestBuilder.build();
      safeSetProgress(70);

      // 5. Upload do manifesto consolidado para a nuvem
      safeSetSyncPhase("uploading_manifest");
      const backupRes = await fetch("/api/sync/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentManifest),
      });

      if (!backupRes.ok) {
        const err = await backupRes.json().catch(() => ({}));
        throw new Error(err.error || "Falha ao enviar dados para o Google Drive.");
      }
      safeSetProgress(85);

      // 6. Upload de pacotes de áudio locais para a nuvem
      safeSetSyncPhase("uploading_audios");
      const totalDocs = currentManifest.readings.length;
      let processedDocs = 0;

      for (const doc of currentManifest.readings) {
        try {
          const { buffer, trackCount } = await AudioSyncService.packDocumentAudios(doc.id);
          if (trackCount > 0 && buffer.byteLength > 0) {
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
                await fetch(uploadUrl, {
                  method: "PUT",
                  headers: { "Content-Type": "application/octet-stream" },
                  body: buffer,
                });
              }
            }
          }
        } catch {
          // Continua para o próximo áudio
        }

        processedDocs++;
        const audioProgress = 85 + Math.round((processedDocs / Math.max(1, totalDocs)) * 14);
        safeSetProgress(audioProgress);
      }

      safeSetProgress(100);
      safeSetSyncPhase("completed");

      if (importedCount > 0 || updatedCount > 0) {
        toast.success(
          `Sincronização concluída! ${importedCount} novos documentos importados e dados atualizados na nuvem.`
        );
      } else if (isAutoOnConnect) {
        toast.success("Conta do Google conectada e dados sincronizados com sucesso!");
      } else {
        toast.success("Dados sincronizados com o Google Drive com sucesso!");
      }

      await checkStatus();
      return true;
    } catch (err: any) {
      const rawMsg = err?.message || String(err || "");
      const isPermissionError = /permission|scope|403/i.test(rawMsg);
      const friendlyMsg = describeDriveError(rawMsg);

      if (isPermissionError) {
        try {
          await fetch("/api/auth/google/disconnect", { method: "POST" });
        } catch {}
        setCachedDriveAuthStatus({ isConnected: false });
        safeSetStatus({ isConnected: false });
        safeSetShowPermissionModal(true);
      } else {
        toast.error(friendlyMsg);
      }

      safeSetSyncPhase("error");
      safeSetErrorMessage(friendlyMsg);
      return false;
    } finally {
      safeSetIsSyncing(false);
    }
  }, [
    checkStatus,
    safeSetErrorMessage,
    safeSetIsSyncing,
    safeSetProgress,
    safeSetShowPermissionModal,
    safeSetStatus,
    safeSetSyncPhase,
  ]);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      // 1. Intercepta parâmetros de redirecionamento do OAuth da URL imediatamente
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const syncError = params.get("sync_error");
        const syncConnected = params.get("sync");

        if (syncConnected === "connected") {
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);

          if (isMounted) {
            await syncBidirectional(true);
          }
          return;
        } else if (syncError) {
          const isPermission = syncError === "permission_denied" || /permission|scope/i.test(syncError);
          const friendlyMsg = describeDriveError(syncError);
          if (isMounted) {
            setCachedDriveAuthStatus({ isConnected: false });
            safeSetErrorMessage(friendlyMsg);
            safeSetStatus({ isConnected: false });
            if (isPermission) {
              safeSetShowPermissionModal(true);
            } else {
              toast.error(friendlyMsg);
            }
          }

          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
          return;
        }
      }

      // 2. Se não foi redirecionamento OAuth, sincroniza a partir do cache ou consulta status via API
      if (isMounted) {
        const cached = getCachedDriveAuthStatus();
        if (cached !== null) {
          safeSetStatus(cached);
          safeSetIsLoading(false);
        } else {
          await checkStatus(false);
        }
      }
    };

    void init();

    return () => {
      isMounted = false;
    };
  }, [checkStatus, safeSetErrorMessage, safeSetShowPermissionModal, safeSetStatus, syncBidirectional]);

  const connect = useCallback(() => {
    window.location.href = "/api/auth/google/start";
  }, []);

  const disconnect = useCallback(async () => {
    try {
      safeSetIsLoading(true);
      const res = await fetch("/api/auth/google/disconnect", { method: "POST" });
      if (res.ok) {
        setCachedDriveAuthStatus({ isConnected: false });
        safeSetStatus({ isConnected: false });
        safeSetErrorMessage(null);
        toast.success("Google Drive desconectado com sucesso.");
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Falha ao desconectar");
      }
    } catch (err: any) {
      toast.error(describeDriveError(err));
    } finally {
      safeSetIsLoading(false);
    }
  }, [safeSetErrorMessage, safeSetIsLoading, safeSetStatus]);

  const backupNow = useCallback(async (): Promise<boolean> => {
    if (!status.isConnected) {
      toast.error("Conecte sua conta do Google Drive primeiro.");
      return false;
    }

    try {
      safeSetIsSyncing(true);
      safeSetErrorMessage(null);
      safeSetProgress(10);
      safeSetSyncPhase("building");

      // 1. Extrai dados do IndexedDB local
      const manifest = await SyncManifestBuilder.build();
      safeSetProgress(30);

      // 2. Upload do manifesto JSON
      safeSetSyncPhase("uploading_manifest");
      const backupRes = await fetch("/api/sync/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(manifest),
      });

      if (!backupRes.ok) {
        const err = await backupRes.json().catch(() => ({}));
        throw new Error(err.error || "Falha ao enviar backup para o Google Drive.");
      }
      safeSetProgress(60);

      // 3. Upload de pacotes de áudio por documento (se houver áudios sintetizados)
      safeSetSyncPhase("uploading_audios");
      const totalDocs = manifest.readings.length;
      let processedDocs = 0;

      for (const doc of manifest.readings) {
        try {
          const { buffer, trackCount } = await AudioSyncService.packDocumentAudios(doc.id);
          if (trackCount > 0 && buffer.byteLength > 0) {
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
        safeSetProgress(audioProgress);
      }

      safeSetProgress(100);
      safeSetSyncPhase("completed");
      toast.success("Backup no Google Drive concluído com sucesso!");
      await checkStatus(true);
      return true;
    } catch (err: any) {
      const rawMsg = err?.message || String(err || "");
      const isPermissionError = /permission|scope|403/i.test(rawMsg);
      const friendlyMsg = describeDriveError(rawMsg);

      if (isPermissionError) {
        try {
          await fetch("/api/auth/google/disconnect", { method: "POST" });
        } catch {}
        setCachedDriveAuthStatus({ isConnected: false });
        safeSetStatus({ isConnected: false });
        safeSetShowPermissionModal(true);
      } else {
        toast.error(friendlyMsg);
      }

      safeSetSyncPhase("error");
      safeSetErrorMessage(friendlyMsg);
      return false;
    } finally {
      safeSetIsSyncing(false);
    }
  }, [
    checkStatus,
    safeSetErrorMessage,
    safeSetIsSyncing,
    safeSetProgress,
    safeSetShowPermissionModal,
    safeSetStatus,
    safeSetSyncPhase,
    status.isConnected,
  ]);

  const restoreNow = useCallback(async (): Promise<boolean> => {
    if (!status.isConnected) {
      toast.error("Conecte sua conta do Google Drive primeiro.");
      return false;
    }

    try {
      safeSetIsSyncing(true);
      safeSetErrorMessage(null);
      safeSetProgress(15);
      safeSetSyncPhase("downloading");

      // 1. Baixa o manifesto
      const restoreRes = await fetch("/api/sync/restore");
      if (!restoreRes.ok) {
        const err = await restoreRes.json().catch(() => ({}));
        throw new Error(err.error || "Nenhum backup encontrado no Google Drive.");
      }

      const { manifest } = (await restoreRes.json()) as { manifest: SyncManifest };
      safeSetProgress(45);

      // 2. Mescla no IndexedDB
      safeSetSyncPhase("merging");
      const mergeResult = await SyncMergerService.merge(manifest);
      safeSetProgress(75);

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

      safeSetProgress(100);
      safeSetSyncPhase("completed");
      toast.success(
        `Restauração concluída! ${mergeResult.importedDocumentsCount} novos documentos e ${mergeResult.updatedDocumentsCount} atualizados.`
      );
      return true;
    } catch (err: any) {
      const rawMsg = err?.message || String(err || "");
      const isPermissionError = /permission|scope|403/i.test(rawMsg);
      const friendlyMsg = describeDriveError(rawMsg);

      if (isPermissionError) {
        try {
          await fetch("/api/auth/google/disconnect", { method: "POST" });
        } catch {}
        setCachedDriveAuthStatus({ isConnected: false });
        safeSetStatus({ isConnected: false });
        safeSetShowPermissionModal(true);
      } else {
        toast.error(friendlyMsg);
      }

      safeSetSyncPhase("error");
      safeSetErrorMessage(friendlyMsg);
      return false;
    } finally {
      safeSetIsSyncing(false);
    }
  }, [
    safeSetErrorMessage,
    safeSetIsSyncing,
    safeSetProgress,
    safeSetShowPermissionModal,
    safeSetStatus,
    safeSetSyncPhase,
    status.isConnected,
  ]);

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
    syncBidirectional,
  };
}
