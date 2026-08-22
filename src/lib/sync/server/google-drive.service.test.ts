/**
 * Testes unitários para GoogleDriveServerService.
 */
import { GoogleDriveServerService, MANIFEST_FILE_NAME } from "./google-drive.service";
import * as sessionModule from "./session-cookie.service";
import type { SyncManifest } from "../domain/sync.types";

jest.mock("./session-cookie.service");

describe("GoogleDriveServerService", () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      GOOGLE_DRIVE_CLIENT_ID: "mock-client-id.apps.googleusercontent.com",
      GOOGLE_DRIVE_CLIENT_SECRET: "mock-client-secret",
    };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
  });

  it("deve retornar o access_token se a sessão for válida e não estiver expirando", async () => {
    (sessionModule.getDriveSession as jest.Mock).mockResolvedValue({
      accessToken: "valid_token_123",
      refreshToken: "refresh_token_456",
      expiresAt: Date.now() + 1000 * 60 * 30, // 30 min no futuro
    });

    const token = await GoogleDriveServerService.getValidAccessToken();
    expect(token).toBe("valid_token_123");
  });

  it("deve renovar o token automaticamente se estiver expirado ou prestes a expirar", async () => {
    (sessionModule.getDriveSession as jest.Mock).mockResolvedValue({
      accessToken: "expired_token_123",
      refreshToken: "refresh_token_456",
      expiresAt: Date.now() - 1000, // expirado
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        access_token: "new_refreshed_token_789",
        expires_in: 3600,
      }),
    });

    const token = await GoogleDriveServerService.getValidAccessToken();
    expect(token).toBe("new_refreshed_token_789");
    expect(sessionModule.setDriveSession).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: "new_refreshed_token_789",
      })
    );
  });

  it("deve lançar erro se a sessão não existir", async () => {
    (sessionModule.getDriveSession as jest.Mock).mockResolvedValue(null);

    await expect(GoogleDriveServerService.getValidAccessToken()).rejects.toThrow(
      "Usuário não conectado ao Google Drive."
    );
  });

  it("deve encontrar arquivo existente na appDataFolder", async () => {
    (sessionModule.getDriveSession as jest.Mock).mockResolvedValue({
      accessToken: "valid_token",
      expiresAt: Date.now() + 600_000,
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        files: [
          {
            id: "file_id_abc",
            name: MANIFEST_FILE_NAME,
            mimeType: "application/json",
            modifiedTime: "2026-08-21T20:00:00Z",
            size: "1024",
          },
        ],
      }),
    });

    const file = await GoogleDriveServerService.findFileInAppData(MANIFEST_FILE_NAME);
    expect(file).not.toBeNull();
    expect(file?.id).toBe("file_id_abc");
    expect(file?.name).toBe(MANIFEST_FILE_NAME);
  });

  it("deve realizar upload do manifesto com sucesso", async () => {
    (sessionModule.getDriveSession as jest.Mock).mockResolvedValue({
      accessToken: "valid_token",
      expiresAt: Date.now() + 600_000,
    });

    // Mock do findFileInAppData (retorna null -> arquivo novo POST)
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ files: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          id: "new_file_id_xyz",
          name: MANIFEST_FILE_NAME,
          mimeType: "application/json",
          modifiedTime: "2026-08-21T20:00:00Z",
        }),
      });

    const mockManifest: SyncManifest = {
      meta: { version: "1.0.0", appVersion: "0.1.0", createdAt: 123456789, deviceId: "device_1" },
      preferences: {
        engine: "system",
        voice: {},
        speed: "1",
        lastReadingId: null,
        disabledEngines: [],
      },
      readings: [],
    };

    const uploaded = await GoogleDriveServerService.uploadManifest(mockManifest);
    expect(uploaded.id).toBe("new_file_id_xyz");
  });
});
