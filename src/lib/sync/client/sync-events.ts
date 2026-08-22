/**
 * Barramento de eventos leves no cliente para notificar a UI de alterações
 * na biblioteca, configurações ou conclusões de sincronização com a nuvem.
 */

export const VIVAVOZ_LIBRARY_CHANGED_EVENT = "vivavoz:library-changed";
export const VIVAVOZ_SYNC_COMPLETED_EVENT = "vivavoz:sync-completed";
export const VIVAVOZ_SETTINGS_CHANGED_EVENT = "vivavoz:settings-changed";

export interface SyncCompletedEventDetail {
  action: "backup" | "restore" | "bidirectional";
  importedCount?: number;
  updatedCount?: number;
  timestamp: number;
}

export function notifyLibraryChanged(reason?: string): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent(VIVAVOZ_LIBRARY_CHANGED_EVENT, {
        detail: { reason: reason || "library_mutation", timestamp: Date.now() },
      })
    );
  } catch {}
}

export function notifySyncCompleted(detail: SyncCompletedEventDetail): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent<SyncCompletedEventDetail>(VIVAVOZ_SYNC_COMPLETED_EVENT, {
        detail,
      })
    );
    // Toda sincronização concluída também pode ter alterado a biblioteca
    notifyLibraryChanged(`sync_${detail.action}`);
  } catch {}
}

export function notifySettingsChanged(settings?: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent(VIVAVOZ_SETTINGS_CHANGED_EVENT, {
        detail: { settings, timestamp: Date.now() },
      })
    );
  } catch {}
}
