/**
 * Contratos de Interfaces do Subsistema de Sincronização.
 */
import type {
  SyncManifest,
  DriveFileInfo,
  DriveAuthStatus,
  AudioPackageHeader,
} from "./sync.types";

export interface ISyncManifestBuilder {
  build(): Promise<SyncManifest>;
}

export interface ISyncMergerService {
  merge(remoteManifest: SyncManifest): Promise<{
    importedDocumentsCount: number;
    updatedDocumentsCount: number;
    preferencesUpdated: boolean;
  }>;
}

export interface IGoogleDriveServerService {
  findFile(fileName: string): Promise<DriveFileInfo | null>;
  uploadManifest(manifest: SyncManifest): Promise<DriveFileInfo>;
  downloadManifest(fileId: string): Promise<SyncManifest>;
  initiateAudioUpload(documentId: string, totalSizeBytes: number): Promise<{ uploadUrl: string }>;
  downloadAudioPackage(fileId: string): Promise<ArrayBuffer>;
  revokeAccess(): Promise<void>;
  getStatus(): Promise<DriveAuthStatus>;
}
