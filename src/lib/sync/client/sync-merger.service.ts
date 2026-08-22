/**
 * Serviço de Mesclagem Inteligente de Sincronização.
 * Aplica Last-Write-Wins e preserva o maior progresso de leitura (lastSentenceIndex).
 */
import { IndexedDbLibraryRepository } from "@/lib/repository/library.repository";
import { READER_SETTINGS_STORAGE } from "@/context/reader-settings-context";
import type { DocumentFormat, ParsedDocument } from "@/lib/domain/document.types";
import type { SyncManifest } from "../domain/sync.types";

export interface SyncMergeResult {
  importedDocumentsCount: number;
  updatedDocumentsCount: number;
  preferencesUpdated: boolean;
}

export class SyncMergerService {
  public static async merge(remoteManifest: SyncManifest): Promise<SyncMergeResult> {
    const repo = IndexedDbLibraryRepository.getInstance();
    let importedDocumentsCount = 0;
    let updatedDocumentsCount = 0;
    let preferencesUpdated = false;

    // 1. Merge de Preferências de Leitura
    if (remoteManifest.preferences) {
      await repo.savePreferences({
        engine: remoteManifest.preferences.engine,
        voice: remoteManifest.preferences.voice,
        speed: remoteManifest.preferences.speed,
        disabledEngines: remoteManifest.preferences.disabledEngines,
      });

      if (remoteManifest.preferences.readerSettings && typeof window !== "undefined") {
        try {
          localStorage.setItem(
            READER_SETTINGS_STORAGE,
            JSON.stringify(remoteManifest.preferences.readerSettings)
          );
        } catch {}
      }

      preferencesUpdated = true;
    }

    // 2. Merge de Leituras / Documentos
    if (remoteManifest.readings && Array.isArray(remoteManifest.readings)) {
      for (const remoteDoc of remoteManifest.readings) {
        const localDoc = await repo.getById(remoteDoc.id);

        const format: DocumentFormat = (remoteDoc.format as DocumentFormat) || "pdf";
        const chapters = remoteDoc.chapters || [];

        if (!localDoc) {
          // Documento não existe localmente -> importa como novo
          const newDoc: ParsedDocument = {
            id: remoteDoc.id,
            metadata: {
              id: remoteDoc.id,
              title: remoteDoc.title,
              format,
              originalFileName: remoteDoc.fileName,
              sizeBytes: remoteDoc.size,
              wordCount: remoteDoc.wordCount || 0,
              estimatedReadingMinutes: remoteDoc.estimatedReadingMinutes || 1,
              pageCount: remoteDoc.pageCount,
              chapterCount: chapters.length,
              author: remoteDoc.author,
              createdAt: remoteDoc.createdAt,
              updatedAt: remoteDoc.updatedAt,
            },
            chapters,
            sentences: remoteDoc.sentences.map((s) => ({
              index: s.index,
              page: s.page,
              text: s.text,
            })),
            lastSentenceIndex: remoteDoc.lastIndex,
          };

          await repo.save(newDoc);
          importedDocumentsCount++;
        } else {
          // Documento já existe localmente -> mescla inteligente
          let shouldUpdate = false;
          const patch: Partial<ParsedDocument> = {
            metadata: { ...localDoc.metadata },
          };

          // Regra de Ouro: Sempre preserva o progresso de leitura mais avançado
          if (remoteDoc.lastIndex > localDoc.lastSentenceIndex) {
            patch.lastSentenceIndex = remoteDoc.lastIndex;
            shouldUpdate = true;
          }

          // Se a versão remota tiver edições mais recentes no conteúdo/título
          if (remoteDoc.updatedAt > localDoc.metadata.updatedAt) {
            patch.metadata = {
              ...localDoc.metadata,
              title: remoteDoc.title,
              updatedAt: remoteDoc.updatedAt,
            };
            patch.sentences = remoteDoc.sentences.map((s) => ({
              index: s.index,
              page: s.page,
              text: s.text,
            }));
            patch.chapters = chapters;
            shouldUpdate = true;
          }

          if (shouldUpdate) {
            await repo.update(localDoc.id, patch);
            updatedDocumentsCount++;
          }
        }
      }
    }

    return {
      importedDocumentsCount,
      updatedDocumentsCount,
      preferencesUpdated,
    };
  }
}
