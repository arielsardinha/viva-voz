/**
 * Gerenciamento seguro de sessão e cookies HttpOnly no Next.js BFF.
 * Cifragem AES-256-GCM server-side para proteção absoluta de tokens em repouso nos cookies.
 */
import { cookies } from "next/headers";
import crypto from "node:crypto";

export interface DriveSessionData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // timestamp ms
  email?: string;
  lastSyncTimestamp?: number;
}

export const G_DRIVE_SESSION_COOKIE = "vivavoz_gdrive_session";
export const G_DRIVE_STATE_COOKIE = "vivavoz_oauth_state";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const secret = process.env.SESSION_SECRET || "vivavoz_default_super_secret_session_key_32_bytes_len";
  // Cria uma chave de 32 bytes (256 bits) usando SHA-256
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Cifra um payload string em formato serializado: iv.tag.ciphertext (Base64URL)
 */
export function encryptPayload(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "base64url");
  encrypted += cipher.final("base64url");
  const authTag = cipher.getAuthTag().toString("base64url");

  return `${iv.toString("base64url")}.${authTag}.${encrypted}`;
}

/**
 * Decifra um payload string serializado em formato iv.tag.ciphertext
 */
export function decryptPayload(sealed: string): string | null {
  try {
    const parts = sealed.split(".");
    if (parts.length !== 3) return null;

    const [ivB64, tagB64, cipherB64] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivB64, "base64url");
    const authTag = Buffer.from(tagB64, "base64url");

    if (iv.length !== IV_LENGTH || authTag.length !== TAG_LENGTH) {
      return null;
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(cipherB64, "base64url", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return null;
  }
}

/**
 * Recupera os dados da sessão a partir do cookie seguro
 */
export async function getDriveSession(): Promise<DriveSessionData | null> {
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(G_DRIVE_SESSION_COOKIE);
  if (!rawCookie?.value) return null;

  const decryptedJson = decryptPayload(rawCookie.value);
  if (!decryptedJson) return null;

  try {
    const data = JSON.parse(decryptedJson) as DriveSessionData;
    return data;
  } catch {
    return null;
  }
}

/**
 * Grava ou atualiza a sessão do Google Drive em cookie HttpOnly seguro
 */
export async function setDriveSession(session: DriveSessionData): Promise<void> {
  const cookieStore = await cookies();
  const serialized = JSON.stringify(session);
  const encrypted = encryptPayload(serialized);

  cookieStore.set(G_DRIVE_SESSION_COOKIE, encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 dias de validade
  });
}

/**
 * Remove o cookie de sessão ao desconectar
 */
export async function clearDriveSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(G_DRIVE_SESSION_COOKIE);
}

/**
 * Grava o state temporário OAuth com tempo de vida de 5 minutos
 */
export async function setOAuthStateCookie(state: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(G_DRIVE_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 300, // 5 minutos
  });
}

/**
 * Obtém e limpa o state temporário OAuth
 */
export async function consumeOAuthStateCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const stateCookie = cookieStore.get(G_DRIVE_STATE_COOKIE);
  if (!stateCookie?.value) return null;

  cookieStore.delete(G_DRIVE_STATE_COOKIE);
  return stateCookie.value;
}
