import { useCallback, useState } from "react";
import type { ParsedDocument } from "@/lib/domain/document.types";
import { DocumentProcessingFacade } from "@/lib/facade/document-processing.facade";
import {
  checkStorageAvailable,
  isQuotaExceededError,
  StorageQuotaExceededError,
} from "@/lib/storage-quota";

export interface FileQueueItem {
  id: string;
  file: File;
  status: "idle" | "processing" | "success" | "error";
  progressPct: number;
  message?: string;
  parsedDocument?: ParsedDocument;
  error?: string;
}

export interface UseDocumentUploaderOptions {
  onSuccess?: (doc: ParsedDocument) => void;
  onError?: (error: Error, file?: File) => void;
  onQuotaExceeded?: (error: StorageQuotaExceededError, file?: File) => void;
  facade?: DocumentProcessingFacade;
}

export function useDocumentUploader(options: UseDocumentUploaderOptions = {}) {
  const facade = options.facade || DocumentProcessingFacade.getInstance();
  const [queue, setQueue] = useState<FileQueueItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<string | null>(null);
  const [isStorageQuotaExceeded, setIsStorageQuotaExceeded] = useState(false);

  const uploadFiles = useCallback(
    async (fileList: FileList | File[]): Promise<ParsedDocument[]> => {
      const filesArray = Array.from(fileList);
      if (filesArray.length === 0) return [];

      const newItems: FileQueueItem[] = filesArray.map((file) => ({
        id: `upload_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        file,
        status: "idle",
        progressPct: 0,
      }));

      setQueue((prev) => [...prev, ...newItems]);
      setIsUploading(true);

      const processedDocs: ParsedDocument[] = [];

      for (const item of newItems) {
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? { ...q, status: "processing", progressPct: 10, message: "Iniciando..." }
              : q
          )
        );

        try {
          // Checagem prévia de armazenamento disponível
          const storageCheck = await checkStorageAvailable(item.file.size);
          if (!storageCheck.hasSpace) {
            throw new StorageQuotaExceededError(
              "Memória interna do navegador insuficiente para processar este arquivo.",
              {
                requiredBytes: item.file.size,
                availableBytes: storageCheck.availableBytes,
                quotaBytes: storageCheck.quotaBytes,
                usageBytes: storageCheck.usageBytes,
              }
            );
          }

          const doc = await facade.processAndSaveFile(item.file, (prog) => {
            setCurrentProgress(prog.message || `Processando ${item.file.name}...`);
            setQueue((prev) =>
              prev.map((q) =>
                q.id === item.id
                  ? { ...q, progressPct: prog.current, message: prog.message }
                  : q
              )
            );
          });

          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? { ...q, status: "success", progressPct: 100, parsedDocument: doc }
                : q
            )
          );

          processedDocs.push(doc);
          options.onSuccess?.(doc);
        } catch (err: unknown) {
          const isQuota = isQuotaExceededError(err);
          const errorObj = isQuota
            ? err instanceof StorageQuotaExceededError
              ? err
              : new StorageQuotaExceededError(
                  "Memória interna insuficiente no navegador para salvar este documento."
                )
            : err instanceof Error
            ? err
            : new Error(String(err));

          if (isQuota) {
            setIsStorageQuotaExceeded(true);
            options.onQuotaExceeded?.(errorObj as StorageQuotaExceededError, item.file);
          }

          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? { ...q, status: "error", error: errorObj.message }
                : q
            )
          );
          options.onError?.(errorObj, item.file);
        }
      }

      setIsUploading(false);
      setCurrentProgress(null);
      return processedDocs;
    },
    [facade, options]
  );

  const uploadRawText = useCallback(
    async (title: string, text: string): Promise<ParsedDocument | null> => {
      setIsUploading(true);
      setCurrentProgress("Processando texto...");
      try {
        const textBytes = new Blob([text]).size;
        const storageCheck = await checkStorageAvailable(textBytes);
        if (!storageCheck.hasSpace) {
          throw new StorageQuotaExceededError(
            "Memória interna do navegador insuficiente para processar este texto.",
            {
              requiredBytes: textBytes,
              availableBytes: storageCheck.availableBytes,
            }
          );
        }

        const doc = await facade.processAndSaveRawText(title, text);
        options.onSuccess?.(doc);
        return doc;
      } catch (err: unknown) {
        const isQuota = isQuotaExceededError(err);
        const errorObj = isQuota
          ? err instanceof StorageQuotaExceededError
            ? err
            : new StorageQuotaExceededError(
                "Memória interna insuficiente no navegador para salvar este documento."
              )
          : err instanceof Error
          ? err
          : new Error(String(err));

        if (isQuota) {
          setIsStorageQuotaExceeded(true);
          options.onQuotaExceeded?.(errorObj as StorageQuotaExceededError);
        }

        options.onError?.(errorObj);
        return null;
      } finally {
        setIsUploading(false);
        setCurrentProgress(null);
      }
    },
    [facade, options]
  );

  const clearQueue = useCallback(() => {
    setQueue([]);
    setIsUploading(false);
    setCurrentProgress(null);
  }, []);

  return {
    queue,
    isUploading,
    currentProgress,
    isStorageQuotaExceeded,
    setIsStorageQuotaExceeded,
    uploadFiles,
    uploadRawText,
    clearQueue,
    supportedExtensions: facade.getSupportedExtensions(),
    acceptAttribute: facade.getAcceptAttribute(),
  };
}
