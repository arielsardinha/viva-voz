/**
 * Gerenciamento seguro da chave Gemini (Google AI Studio) via Cookie HttpOnly no Next.js BFF.
 * Cifragem AES-256-GCM server-side para proteção da chave em repouso nos cookies.
 */
import { cookies } from "next/headers";
import crypto from "node:crypto";

export const G_GEMINI_KEY_COOKIE = "vivavoz_gemini_key";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const secret = process.env.SESSION_SECRET || "vivavoz_default_super_secret_session_key_32_bytes_len";
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Cifra uma chave em formato serializado: iv.tag.ciphertext (Base64URL)
 */
export function encryptGeminiKey(apiKey: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(apiKey, "utf8", "base64url");
  encrypted += cipher.final("base64url");
  const authTag = cipher.getAuthTag().toString("base64url");

  return `${iv.toString("base64url")}.${authTag}.${encrypted}`;
}

/**
 * Decifra um payload em formato iv.tag.ciphertext
 */
export function decryptGeminiKey(sealed: string): string | null {
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
 * Grava a chave Gemini do usuário no cookie HttpOnly seguro
 */
export async function setGeminiKeyCookie(apiKey: string): Promise<void> {
  const cookieStore = await cookies();
  const encrypted = encryptGeminiKey(apiKey.trim());

  cookieStore.set(G_GEMINI_KEY_COOKIE, encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 dias
  });
}

/**
 * Recupera e decifra a chave Gemini a partir do cookie HttpOnly
 */
export async function getGeminiKeyCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(G_GEMINI_KEY_COOKIE);
  if (!rawCookie?.value) return null;

  return decryptGeminiKey(rawCookie.value);
}

/**
 * Verifica rapidamente se há uma chave Gemini válida configurada no cookie
 */
export async function hasGeminiKeyCookie(): Promise<boolean> {
  const key = await getGeminiKeyCookie();
  return Boolean(key && key.length >= 10);
}

/**
 * Remove o cookie da chave Gemini ao desconectar
 */
export async function clearGeminiKeyCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(G_GEMINI_KEY_COOKIE);
}
