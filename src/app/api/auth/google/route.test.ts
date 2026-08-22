import { GET as startGET } from "./start/route";
import { GET as callbackGET } from "./callback/route";
import { GET as statusGET } from "./status/route";
import { POST as disconnectPOST } from "./disconnect/route";
import * as sessionModule from "@/lib/sync/server/session-cookie.service";
import { GoogleDriveServerService } from "@/lib/sync/server/google-drive.service";

jest.mock("@/lib/sync/server/session-cookie.service");
jest.mock("@/lib/sync/server/google-drive.service");

describe("Auth Google Route Handlers", () => {
  const originalEnv = process.env;
  let errorSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    process.env = {
      ...originalEnv,
      GOOGLE_DRIVE_CLIENT_ID: "mock_client_id_123",
      GOOGLE_DRIVE_CLIENT_SECRET: "mock_client_secret_456",
      GOOGLE_DRIVE_REDIRECT_URI: "http://localhost:3000/api/auth/google/callback",
    };
  });

  afterEach(() => {
    errorSpy.mockRestore();
    logSpy.mockRestore();
    process.env = originalEnv;
  });

  it("/api/auth/google/start deve gerar authUrl e salvar cookie de state", async () => {
    const req = new Request("http://localhost:3000/api/auth/google/start?format=json");
    const res = await startGET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.authUrl).toContain("accounts.google.com/o/oauth2/v2/auth");
    expect(data.authUrl).toContain("mock_client_id_123");
    expect(sessionModule.setOAuthStateCookie).toHaveBeenCalled();
  });

  it("/api/auth/google/start deve retornar erro format=json se GOOGLE_DRIVE_CLIENT_ID não estiver configurado", async () => {
    delete process.env.GOOGLE_DRIVE_CLIENT_ID;

    const req = new Request("http://localhost:3000/api/auth/google/start?format=json");
    const res = await startGET(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("GOOGLE_DRIVE_CLIENT_ID não configurado no servidor.");
    expect(errorSpy).toHaveBeenCalled();
  });

  it("/api/auth/google/start deve redirecionar com sync_error se GOOGLE_DRIVE_CLIENT_ID não estiver configurado em navegação normal", async () => {
    delete process.env.GOOGLE_DRIVE_CLIENT_ID;

    const req = new Request("http://localhost:3000/api/auth/google/start");
    const res = await startGET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("sync_error=not_configured");
    expect(errorSpy).toHaveBeenCalled();
  });

  it("/api/auth/google/callback deve redirecionar com erro se credenciais estiverem ausentes no servidor", async () => {
    (sessionModule.consumeOAuthStateCookie as jest.Mock).mockResolvedValue("valid_state_123");
    delete process.env.GOOGLE_DRIVE_CLIENT_ID;
    delete process.env.GOOGLE_DRIVE_CLIENT_SECRET;

    const req = new Request("http://localhost:3000/api/auth/google/callback?code=mock_code&state=valid_state_123");
    const res = await callbackGET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("sync_error=server_credentials_missing");
    expect(errorSpy).toHaveBeenCalled();
  });

  it("/api/auth/google/status deve retornar isConnected: false quando não houver sessão", async () => {
    (sessionModule.getDriveSession as jest.Mock).mockResolvedValue(null);

    const res = await statusGET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.isConnected).toBe(false);
  });

  it("/api/auth/google/status deve retornar isConnected: true com dados da sessão", async () => {
    (sessionModule.getDriveSession as jest.Mock).mockResolvedValue({
      accessToken: "ya29.mock",
      email: "leitor@vivavoz.com",
      expiresAt: 123456789,
    });

    const res = await statusGET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.isConnected).toBe(true);
    expect(data.email).toBe("leitor@vivavoz.com");
  });

  it("/api/auth/google/disconnect deve revogar token e limpar cookies", async () => {
    const res = await disconnectPOST();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(GoogleDriveServerService.revokeToken).toHaveBeenCalled();
    expect(sessionModule.clearDriveSession).toHaveBeenCalled();
  });
});
