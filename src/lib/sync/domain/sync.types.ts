/**
 * Schemas Zod e Tipagens Estritas para o subsistema de Sincronização Google Drive.
 */
import { z } from "zod";

export const ManifestMetadataSchema = z.object({
  version: z.literal("1.0.0").default("1.0.0"),
  appVersion: z.string().default("0.1.0"),
  createdAt: z.number(),
  deviceId: z.string().min(1),
});

export const ManifestPreferencesSchema = z.object({
  engine: z.enum(["system", "google"]).default("system"),
  voice: z.record(z.string(), z.string()).default({}),
  speed: z.string().default("1"),
  lastReadingId: z.string().nullable().default(null),
  disabledEngines: z.array(z.string()).default([]),
  readerSettings: z
    .object({
      template: z.enum(["modern", "ai-study", "zen"]).default("modern"),
      theme: z.enum(["light", "sepia", "dark"]).default("light"),
      font: z.string().default("inter"),
      fontSize: z.number().default(16),
      lineHeight: z.number().default(1.8),
      speed: z.number().optional(),
      hasCompletedOnboarding: z.boolean().default(false),
    })
    .optional(),
});

export const ManifestSentenceSchema = z.object({
  index: z.number(),
  page: z.number(),
  text: z.string(),
});

export const ManifestChapterSchema = z.object({
  id: z.string(),
  title: z.string(),
  startIndex: z.number(),
  endIndex: z.number(),
  pageNumber: z.number().optional(),
});

export const ManifestReadingItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  fileName: z.string(),
  size: z.number(),
  pageCount: z.number(),
  sentences: z.array(ManifestSentenceSchema),
  createdAt: z.number(),
  updatedAt: z.number(),
  lastIndex: z.number(),
  format: z.string().optional(),
  author: z.string().optional(),
  wordCount: z.number().optional(),
  estimatedReadingMinutes: z.number().optional(),
  chapters: z.array(ManifestChapterSchema).optional(),
});

export const SyncManifestSchema = z.object({
  meta: ManifestMetadataSchema,
  preferences: ManifestPreferencesSchema,
  readings: z.array(ManifestReadingItemSchema),
});

export type ManifestMetadata = z.infer<typeof ManifestMetadataSchema>;
export type ManifestPreferences = z.infer<typeof ManifestPreferencesSchema>;
export type ManifestSentence = z.infer<typeof ManifestSentenceSchema>;
export type ManifestChapter = z.infer<typeof ManifestChapterSchema>;
export type ManifestReadingItem = z.infer<typeof ManifestReadingItemSchema>;
export type SyncManifest = z.infer<typeof SyncManifestSchema>;

export interface DriveAuthStatus {
  isConnected: boolean;
  email?: string;
  expiresAt?: number;
  lastSyncTimestamp?: number;
}

export interface DriveFileInfo {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  sizeBytes?: number;
}

export interface AudioTrackMetadata {
  id: string;
  documentId: string;
  engine: string;
  voice: string;
  sentenceIndex: number;
  text: string;
  sizeBytes: number;
}

export interface AudioPackageHeader {
  documentId: string;
  trackCount: number;
  totalSizeBytes: number;
  createdAt: number;
  tracks: AudioTrackMetadata[];
}
