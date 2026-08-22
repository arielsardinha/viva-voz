import { renderHook, act, waitFor } from "@testing-library/react";
import { useGoogleDriveSync } from "./use-google-drive-sync";
import { SyncManifestBuilder } from "@/lib/sync/client/sync-manifest-builder";
import { SyncMergerService } from "@/lib/sync/client/sync-merger.service";
import { AudioSyncService } from "@/lib/sync/client/audio-sync.service";
import { toast } from "sonner";

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
        engine: "system",
        voice: {},
        speed: "1",
        lastReadingId: null,
        disabledEngines: [],
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

  it("deve exibir feedback amigável orientando sobre permissões quando o backup falhar com erro 403", async () => {
    global.fetch = jest.fn().mockImplementation(async (url: string) => {
      if (url.includes("/api/auth/google/status")) {
        return {
          ok: true,
          json: async () => ({ isConnected: true }),
        };
      }
      if (url.includes("/api/sync/backup")) {
        return {
          ok: false,
          status: 500,
          json: async () => ({
            error: "Erro ao buscar arquivo no Google Drive: { \"error\": { \"code\": 403, \"reason\": \"ACCESS_TOKEN_SCOPE_INSUFFICIENT\" } }",
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
      success = await result.current.backupNow();
    });

    expect(success).toBe(false);
    expect(result.current.syncPhase).toBe("error");
    expect(result.current.showPermissionModal).toBe(true);
    expect(result.current.status.isConnected).toBe(false);
    expect(result.current.errorMessage).toContain("Permissão necessária");
    expect(result.current.errorMessage).toContain("Ver, criar e excluir os próprios dados de configuração no Google Drive");
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
              preferences: {
                engine: "system",
                voice: {},
                speed: "1",
                lastReadingId: null,
                disabledEngines: [],
              },
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

  it("deve executar syncBidirectional com sucesso, mesclando dados remotos e subindo atualizações", async () => {
    let backupCalled = false;
    let restoreCalled = false;

    global.fetch = jest.fn().mockImplementation(async (url: string) => {
      if (url.includes("/api/auth/google/status")) {
        return {
          ok: true,
          json: async () => ({ isConnected: true, email: "sync@test.com" }),
        };
      }
      if (url.includes("/api/sync/restore")) {
        restoreCalled = true;
        return {
          ok: true,
          json: async () => ({
            manifest: {
              meta: { version: "1.0.0", appVersion: "0.1.0", createdAt: Date.now(), deviceId: "d1" },
              preferences: { engine: "system", voice: {}, speed: "1", lastReadingId: null, disabledEngines: [] },
              readings: [{ id: "doc1", title: "Doc Remoto" }],
            },
          }),
        };
      }
      if (url.includes("/api/sync/backup")) {
        backupCalled = true;
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
      success = await result.current.syncBidirectional();
    });

    expect(success).toBe(true);
    expect(restoreCalled).toBe(true);
    expect(backupCalled).toBe(true);
    expect(result.current.syncPhase).toBe("completed");
    expect(SyncMergerService.merge).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalled();
  });

  it("deve disparar syncBidirectional automaticamente ao detectar parâmetro sync=connected na URL", async () => {
    window.history.pushState({}, "", "/?sync=connected");

    let restoreCalled = false;
    let backupCalled = false;

    global.fetch = jest.fn().mockImplementation(async (url: string) => {
      if (url.includes("/api/auth/google/status")) {
        return {
          ok: true,
          json: async () => ({ isConnected: true, email: "oauth@test.com" }),
        };
      }
      if (url.includes("/api/sync/restore")) {
        restoreCalled = true;
        return {
          ok: true,
          json: async () => ({
            manifest: {
              meta: { version: "1.0.0", appVersion: "0.1.0", createdAt: Date.now(), deviceId: "d1" },
              preferences: { engine: "system", voice: {}, speed: "1", lastReadingId: null, disabledEngines: [] },
              readings: [],
            },
          }),
        };
      }
      if (url.includes("/api/sync/backup")) {
        backupCalled = true;
        return {
          ok: true,
          json: async () => ({ success: true }),
        };
      }
      return { ok: false, status: 404 };
    });

    renderHook(() => useGoogleDriveSync());

    await waitFor(() => {
      expect(restoreCalled).toBe(true);
      expect(backupCalled).toBe(true);
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringMatching(/Sincronização concluída!|Conta do Google conectada/i)
      );
    });

    window.history.pushState({}, "", "/");
  });
});
