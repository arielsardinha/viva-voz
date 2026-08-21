/**
 * ViewModel MVVM para upload e ingestão individual ou em lote de múltiplos documentos.
 * Padrão: MVVM ViewModel.
 */
import { useCallback, useState } from "react";
import type { ParsedDocument } from "@/lib/domain/document.types";
import { DocumentProcessingFacade } from "@/lib/facade/document-processing.facade";

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
  facade?: DocumentProcessingFacade;
}

export function useDocumentUploader(options: UseDocumentUploaderOptions = {}) {
  const facade = options.facade || DocumentProcessingFacade.getInstance();
  const [queue, setQueue] = useState<FileQueueItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<string | null>(null);

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
          const errorObj = err instanceof Error ? err : new Error(String(err));
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
        const doc = await facade.processAndSaveRawText(title, text);
        options.onSuccess?.(doc);
        return doc;
      } catch (err: unknown) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
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
    uploadFiles,
    uploadRawText,
    clearQueue,
    supportedExtensions: facade.getSupportedExtensions(),
    acceptAttribute: facade.getAcceptAttribute(),
  };
}
