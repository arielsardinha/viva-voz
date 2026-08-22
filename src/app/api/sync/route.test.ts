import { POST as backupPOST } from "./backup/route";
import { GET as restoreGET } from "./restore/route";
import { POST as resumablePOST } from "./audio/resumable/route";
import { GoogleDriveServerService } from "@/lib/sync/server/google-drive.service";
import {
  getGeminiKeyCookie,
  setGeminiKeyCookie,
} from "@/lib/ai/server/gemini-cookie.service";

jest.mock("@/lib/sync/server/google-drive.service");
jest.mock("@/lib/ai/server/gemini-cookie.service", () => ({
  getGeminiKeyCookie: jest.fn(),
  setGeminiKeyCookie: jest.fn(),
}));

describe("Sync Route Handlers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getGeminiKeyCookie as jest.Mock).mockResolvedValue(null);
  });

  it("/api/sync/backup deve retornar 400 se o corpo for inválido", async () => {
    const req = new Request("http://localhost:3000/api/sync/backup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await backupPOST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Estrutura do manifesto inválida.");
  });

  it("/api/sync/backup deve enviar manifesto e retornar 200 com sucesso", async () => {
    (GoogleDriveServerService.uploadManifest as jest.Mock).mockResolvedValue({
      id: "drive_file_123",
      name: "vivavoz_manifest.json",
      mimeType: "application/json",
    });

    const validManifest = {
      meta: {
        version: "1.0.0",
        appVersion: "0.1.0",
        createdAt: Date.now(),
        deviceId: "device_abc",
      },
      preferences: {
        engine: "google",
        voice: { google: "Kore" },
        speed: "1.0",
        lastReadingId: null,
        disabledEngines: [],
      },
      readings: [],
    };

    const req = new Request("http://localhost:3000/api/sync/backup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validManifest),
    });

    const res = await backupPOST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.file.id).toBe("drive_file_123");
  });

  it("/api/sync/backup deve injetar a userApiKey do cookie seguro no manifesto quando presente", async () => {
    (getGeminiKeyCookie as jest.Mock).mockResolvedValue("AIzaSyValidApiKey123456");
    (GoogleDriveServerService.uploadManifest as jest.Mock).mockResolvedValue({
      id: "drive_file_key",
      name: "vivavoz_manifest.json",
      mimeType: "application/json",
    });

    const validManifest = {
      meta: {
        version: "1.0.0",
        appVersion: "0.1.0",
        createdAt: Date.now(),
        deviceId: "device_abc",
      },
      preferences: {
        engine: "google",
        voice: { google: "Kore" },
        speed: "1.0",
        lastReadingId: null,
        disabledEngines: [],
      },
      readings: [],
    };

    const req = new Request("http://localhost:3000/api/sync/backup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validManifest),
    });

    const res = await backupPOST(req);
    expect(res.status).toBe(200);
    expect(GoogleDriveServerService.uploadManifest).toHaveBeenCalledWith(
      expect.objectContaining({
        userApiKey: "AIzaSyValidApiKey123456",
      })
    );
  });

  it("/api/sync/backup deve retornar mensagem amigável quando ocorrer erro de escopo 403", async () => {
    (GoogleDriveServerService.uploadManifest as jest.Mock).mockRejectedValue(
      new Error('Erro ao buscar arquivo no Google Drive: { "error": { "code": 403, "reason": "ACCESS_TOKEN_SCOPE_INSUFFICIENT" } }')
    );

    const validManifest = {
      meta: {
        version: "1.0.0",
        appVersion: "0.1.0",
        createdAt: Date.now(),
        deviceId: "device_abc",
      },
      preferences: {
        engine: "google",
        voice: { google: "Kore" },
        speed: "1.0",
        lastReadingId: null,
        disabledEngines: [],
      },
      readings: [],
    };

    const req = new Request("http://localhost:3000/api/sync/backup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validManifest),
    });

    const res = await backupPOST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("Permissão necessária");
    expect(data.error).not.toContain("{");
  });

  it("/api/sync/restore deve retornar 404 se nenhum backup for encontrado", async () => {
    (GoogleDriveServerService.downloadManifest as jest.Mock).mockResolvedValue(null);

    const res = await restoreGET();
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain("Nenhum backup encontrado");
  });

  it("/api/sync/restore deve restaurar userApiKey no cookie HttpOnly e não expor no JSON", async () => {
    (GoogleDriveServerService.downloadManifest as jest.Mock).mockResolvedValue({
      meta: { version: "1.0.0", appVersion: "0.1.0", createdAt: 1, deviceId: "d1" },
      preferences: { engine: "google", voice: {}, speed: "1.0", lastReadingId: null, disabledEngines: [] },
      readings: [],
      userApiKey: "AIzaSyRestoredFromCloud123",
    });
    (getGeminiKeyCookie as jest.Mock).mockResolvedValue(null);

    const res = await restoreGET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.apiKeyRestored).toBe(true);
    expect(setGeminiKeyCookie).toHaveBeenCalledWith("AIzaSyRestoredFromCloud123");
    // Garante que a API Key NÃO foi exposta no JSON para o cliente
    expect(data.manifest.userApiKey).toBeUndefined();
  });

  it("/api/sync/audio/resumable deve inicializar sessão de upload", async () => {
    (GoogleDriveServerService.initiateAudioResumableUpload as jest.Mock).mockResolvedValue({
      uploadUrl: "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=abc123xyz",
    });

    const req = new Request("http://localhost:3000/api/sync/audio/resumable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: "doc_123",
        totalSizeBytes: 1048576,
      }),
    });

    const res = await resumablePOST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.uploadUrl).toContain("upload_id=abc123xyz");
  });
});

