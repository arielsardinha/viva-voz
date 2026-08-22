/**
 * Serviço de Integração com a Google Drive API v3 (appDataFolder) e Google OAuth 2.0.
 * Executado exclusivamente no servidor Next.js BFF.
 */
import {
  getDriveSession,
  setDriveSession,
  DriveSessionData,
} from "./session-cookie.service";
import type {
  SyncManifest,
  DriveFileInfo,
} from "../domain/sync.types";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";

export const MANIFEST_FILE_NAME = "vivavoz_manifest.json";

export class GoogleDriveServerService {
  /**
   * Obtém um token de acesso OAuth 2.0 válido, renovando automaticamente caso esteja próximo da expiração.
   */
  public static async getValidAccessToken(): Promise<string> {
    const session = await getDriveSession();
    if (!session || !session.accessToken) {
      console.error("[GoogleDrive Service] Erro: Tentativa de acesso sem sessão ativa do usuário.");
      throw new Error("Usuário não conectado ao Google Drive.");
    }

    // Se o token for válido por pelo menos mais 120 segundos, retorna diretamente
    const isExpiringSoon = Date.now() >= session.expiresAt - 120_000;
    if (!isExpiringSoon) {
      return session.accessToken;
    }

    if (!session.refreshToken) {
      console.error("[GoogleDrive Service] Erro: Token expirado e refreshToken ausente na sessão.");
      throw new Error("Sessão expirada. Por favor, reconecte o Google Drive.");
    }

    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("[GoogleDrive Service] Erro: GOOGLE_DRIVE_CLIENT_ID ou GOOGLE_DRIVE_CLIENT_SECRET não configurados no servidor.");
      throw new Error("Credenciais do Google Drive não configuradas no servidor.");
    }

    console.log("[GoogleDrive Service] Renovando access_token com refresh_token via OAuth2...");
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: session.refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[GoogleDrive Service] Falha na renovação do access_token (HTTP ${response.status}): ${errText}`);
      throw new Error(`Falha ao renovar token do Google Drive: ${errText}`);
    }

    const data = (await response.json()) as { access_token: string; expires_in: number };
    const updatedSession: DriveSessionData = {
      ...session,
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    await setDriveSession(updatedSession);
    console.log(`[GoogleDrive Service] ✅ Token renovado com sucesso (novo expiresAt: ${new Date(updatedSession.expiresAt).toISOString()})`);
    return data.access_token;
  }

  /**
   * Busca um arquivo existente na pasta isolada appDataFolder pelo nome.
   */
  public static async findFileInAppData(fileName: string): Promise<DriveFileInfo | null> {
    const token = await this.getValidAccessToken();
    const query = encodeURIComponent(`name = '${fileName}' and 'appDataFolder' in parents and trashed = false`);
    const fields = encodeURIComponent("files(id, name, mimeType, modifiedTime, size)");

    const response = await fetch(
      `${DRIVE_FILES_URL}?spaces=appDataFolder&q=${query}&fields=${fields}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error(`[GoogleDrive Service] Erro ao buscar arquivo "${fileName}" na appDataFolder (HTTP ${response.status}): ${err}`);
      throw new Error(`Erro ao buscar arquivo no Google Drive: ${err}`);
    }

    const data = (await response.json()) as { files?: Array<{ id: string; name: string; mimeType: string; modifiedTime?: string; size?: string }> };
    if (!data.files || data.files.length === 0) {
      return null;
    }

    const file = data.files[0];
    return {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      modifiedTime: file.modifiedTime,
      sizeBytes: file.size ? Number(file.size) : undefined,
    };
  }

  /**
   * Envia o manifesto estruturado (JSON) para a appDataFolder (criação ou atualização).
   */
  public static async uploadManifest(manifest: SyncManifest): Promise<DriveFileInfo> {
    const token = await this.getValidAccessToken();
    const existing = await this.findFileInAppData(MANIFEST_FILE_NAME);

    const boundary = "-------vivavoz_multipart_boundary";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: MANIFEST_FILE_NAME,
      mimeType: "application/json",
      ...(existing ? {} : { parents: ["appDataFolder"] }),
    };

    const body =
      delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      "Content-Type: application/json\r\n\r\n" +
      JSON.stringify(manifest) +
      closeDelimiter;

    const url = existing
      ? `${DRIVE_UPLOAD_URL}/${existing.id}?uploadType=multipart`
      : `${DRIVE_UPLOAD_URL}?uploadType=multipart`;

    const method = existing ? "PATCH" : "POST";

    console.log(`[GoogleDrive Service] Enviando manifesto (${method}) para appDataFolder...`);
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`[GoogleDrive Service] Falha no upload do manifesto (HTTP ${response.status}): ${err}`);
      throw new Error(`Falha no upload do manifesto para o Google Drive: ${err}`);
    }

    const result = (await response.json()) as { id: string; name: string; mimeType: string; modifiedTime?: string; size?: string };

    // Atualiza o timestamp de último sync na sessão
    const session = await getDriveSession();
    if (session) {
      await setDriveSession({ ...session, lastSyncTimestamp: Date.now() });
    }

    console.log(`[GoogleDrive Service] ✅ Manifesto sincronizado com sucesso! (ID: ${result.id})`);

    return {
      id: result.id,
      name: result.name,
      mimeType: result.mimeType,
      modifiedTime: result.modifiedTime,
      sizeBytes: result.size ? Number(result.size) : undefined,
    };
  }

  /**
   * Baixa o manifesto de dados do Google Drive.
   */
  public static async downloadManifest(): Promise<SyncManifest | null> {
    const existing = await this.findFileInAppData(MANIFEST_FILE_NAME);
    if (!existing) {
      console.log("[GoogleDrive Service] Nenhum manifesto prévio encontrado na appDataFolder.");
      return null;
    }

    const token = await this.getValidAccessToken();
    console.log(`[GoogleDrive Service] Baixando manifesto existente (ID: ${existing.id})...`);
    const response = await fetch(`${DRIVE_FILES_URL}/${existing.id}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`[GoogleDrive Service] Falha ao baixar manifesto (HTTP ${response.status}): ${err}`);
      throw new Error(`Falha ao baixar manifesto do Google Drive: ${err}`);
    }

    const manifest = (await response.json()) as SyncManifest;
    console.log(`[GoogleDrive Service] ✅ Manifesto baixado com sucesso (${manifest.readings.length} documentos salvos).`);
    return manifest;
  }

  /**
   * Inicializa uma sessão de Resumable Upload para o pacote de áudio TTS de um documento.
   */
  public static async initiateAudioResumableUpload(
    documentId: string,
    totalSizeBytes: number
  ): Promise<{ uploadUrl: string }> {
    const token = await this.getValidAccessToken();
    const fileName = `vivavoz_audio_${documentId}.bin`;

    const existing = await this.findFileInAppData(fileName);

    const metadata = {
      name: fileName,
      mimeType: "application/octet-stream",
      ...(existing ? {} : { parents: ["appDataFolder"] }),
    };

    const url = existing
      ? `${DRIVE_UPLOAD_URL}/${existing.id}?uploadType=resumable`
      : `${DRIVE_UPLOAD_URL}?uploadType=resumable`;

    const method = existing ? "PATCH" : "POST";

    console.log(`[GoogleDrive Service] Iniciando Resumable Upload para áudio ${fileName} (${totalSizeBytes} bytes)...`);
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": "application/octet-stream",
        "X-Upload-Content-Length": totalSizeBytes.toString(),
      },
      body: JSON.stringify(metadata),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`[GoogleDrive Service] Falha ao iniciar Resumable Upload de áudio (HTTP ${response.status}): ${err}`);
      throw new Error(`Falha ao iniciar upload resumível de áudio: ${err}`);
    }

    const uploadUrl = response.headers.get("Location");
    if (!uploadUrl) {
      console.error("[GoogleDrive Service] Resposta do Google Drive não continha o cabeçalho Location.");
      throw new Error("Google Drive não retornou a URL de upload resumível.");
    }

    console.log("[GoogleDrive Service] ✅ Sessão de upload resumível de áudio criada com sucesso.");
    return { uploadUrl };
  }

  /**
   * Baixa o pacote binário de áudio de um documento específico.
   */
  public static async downloadAudioPackage(documentId: string): Promise<ArrayBuffer | null> {
    const fileName = `vivavoz_audio_${documentId}.bin`;
    const existing = await this.findFileInAppData(fileName);
    if (!existing) return null;

    const token = await this.getValidAccessToken();
    console.log(`[GoogleDrive Service] Baixando pacote de áudio ${fileName}...`);
    const response = await fetch(`${DRIVE_FILES_URL}/${existing.id}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`[GoogleDrive Service] Falha ao baixar pacote de áudio (HTTP ${response.status}): ${err}`);
      throw new Error(`Falha ao baixar pacote de áudio: ${err}`);
    }

    const buffer = await response.arrayBuffer();
    console.log(`[GoogleDrive Service] ✅ Pacote de áudio ${fileName} baixado com sucesso (${buffer.byteLength} bytes).`);
    return buffer;
  }

  /**
   * Revoga as credenciais no Google.
   */
  public static async revokeToken(): Promise<void> {
    const session = await getDriveSession();
    if (!session || !session.accessToken) return;

    try {
      console.log("[GoogleDrive Service] Revogando token OAuth no Google...");
      await fetch(`${GOOGLE_REVOKE_URL}?token=${session.accessToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      console.log("[GoogleDrive Service] ✅ Token revogado no Google com sucesso.");
    } catch (err: any) {
      console.error("[GoogleDrive Service] Falha ao revogar token remoto no Google:", err?.message || err);
    }
  }
}
