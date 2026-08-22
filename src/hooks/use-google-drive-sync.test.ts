import { renderHook, act } from "@testing-library/react";
import { useGoogleDriveSync } from "./use-google-drive-sync";
import { SyncManifestBuilder } from "@/lib/sync/client/sync-manifest-builder";
import { SyncMergerService } from "@/lib/sync/client/sync-merger.service";
import { AudioSyncService } from "@/lib/sync/client/audio-sync.service";

jest.mock("@/lib/sync/client/sync-manifest-builder");
jest.mock("@/lib/sync/client/sync-merger.service");
jest.mock("@/lib/sync/client/audio-sync.service");
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("useGoogleDriveSync Hook", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    (SyncManifestBuilder.build as jest.Mock).mockResolvedValue({
      meta: { version: "1.0.0", appVersion: "0.1.0", createdAt: Date.now(), deviceId: "d1" },
      preferences: {
        voiceId: null,
        voiceRate: 1,
        voicePitch: 1,
        fontSize: "text-base",
        fontFamily: "font-sans",
        theme: "light",
        autoScroll: true,
        highlightStyle: "bg-accent/30 text-accent-foreground font-semibold",
      },
      readings: [{ id: "doc1", title: "Doc 1", fileName: "d1.pdf", size: 10, pageCount: 1, sentences: [], createdAt: 1, updatedAt: 1, lastIndex: 0 }],
    });
    (AudioSyncService.packDocumentAudios as jest.Mock).mockResolvedValue({
      buffer: new ArrayBuffer(0),
      trackCount: 0,
    });
    (SyncMergerService.merge as jest.Mock).mockResolvedValue({
      importedDocumentsCount: 1,
      updatedDocumentsCount: 0,
      preferencesUpdated: true,
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("deve carregar o status inicial de desconectado", async () => {
    global.fetch = jest.fn().mockImplementation(async (url: string) => {
      if (url.includes("/api/auth/google/status")) {
        return {
          ok: true,
          json: async () => ({ isConnected: false }),
        };
      }
      return { ok: false, status: 404 };
    });

    const { result } = renderHook(() => useGoogleDriveSync());

    await act(async () => {
      await result.current.checkStatus();
    });

    expect(result.current.status.isConnected).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it("deve carregar o status de conectado com e-mail", async () => {
    global.fetch = jest.fn().mockImplementation(async (url: string) => {
      if (url.includes("/api/auth/google/status")) {
        return {
          ok: true,
          json: async () => ({
            isConnected: true,
            email: "usuario@teste.com",
            lastSyncTimestamp: 1700000000000,
          }),
        };
      }
      return { ok: false, status: 404 };
    });

    const { result } = renderHook(() => useGoogleDriveSync());

    await act(async () => {
      await result.current.checkStatus();
    });

    expect(result.current.status.isConnected).toBe(true);
    expect(result.current.status.email).toBe("usuario@teste.com");
  });

  it("deve executar backupNow com sucesso quando conectado", async () => {
    global.fetch = jest.fn().mockImplementation(async (url: string) => {
      if (url.includes("/api/auth/google/status")) {
        return {
          ok: true,
          json: async () => ({ isConnected: true, email: "user@test.com" }),
        };
      }
      if (url.includes("/api/sync/backup")) {
        return {
          ok: true,
          json: async () => ({ success: true }),
        };
      }
      return { ok: false, status: 404 };
    });

    const { result } = renderHook(() => useGoogleDriveSync());

    await act(async () => {
      await result.current.checkStatus();
    });

    let success = false;
    await act(async () => {
      success = await result.current.backupNow();
    });

    expect(success).toBe(true);
    expect(result.current.syncPhase).toBe("completed");
    expect(result.current.progress).toBe(100);
  });

  it("deve executar restoreNow com sucesso", async () => {
    global.fetch = jest.fn().mockImplementation(async (url: string) => {
      if (url.includes("/api/auth/google/status")) {
        return {
          ok: true,
          json: async () => ({ isConnected: true }),
        };
      }
      if (url.includes("/api/sync/restore")) {
        return {
          ok: true,
          json: async () => ({
            manifest: {
              meta: { version: "1.0.0", appVersion: "0.1.0", createdAt: Date.now(), deviceId: "d1" },
              preferences: {},
              readings: [{ id: "doc1" }],
            },
          }),
        };
      }
      return { ok: false, status: 404 };
    });

    const { result } = renderHook(() => useGoogleDriveSync());

    await act(async () => {
      await result.current.checkStatus();
    });

    let success = false;
    await act(async () => {
      success = await result.current.restoreNow();
    });

    expect(success).toBe(true);
    expect(result.current.syncPhase).toBe("completed");
    expect(SyncMergerService.merge).toHaveBeenCalled();
  });
});
