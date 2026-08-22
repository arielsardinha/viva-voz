"use server";

import { z } from "zod";
import {
  setGeminiKeyCookie,
  getGeminiKeyCookie,
  clearGeminiKeyCookie,
} from "@/lib/ai/server/gemini-cookie.service";

const ApiKeySchema = z
  .string()
  .trim()
  .min(10, "Informe uma chave válida do Google AI Studio (mínimo de 10 caracteres).")
  .max(200, "Chave excede o comprimento máximo permitido.");

export interface SaveGeminiKeyResult {
  success: boolean;
  error?: string;
}

export interface RemoveGeminiKeyResult {
  success: boolean;
  error?: string;
}

export interface GeminiKeyStatusResult {
  hasKey: boolean;
  maskedKey?: string;
}

/**
 * Salva a chave da API do Gemini (Google AI Studio) em cookie HttpOnly cifrado via Server Action.
 */
export async function saveGeminiApiKeyAction(rawKey: string): Promise<SaveGeminiKeyResult> {
  const parsed = ApiKeySchema.safeParse(rawKey);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Chave de API inválida.",
    };
  }

  try {
    await setGeminiKeyCookie(parsed.data);
    return { success: true };
  } catch (error) {
    console.error("[saveGeminiApiKeyAction] Falha ao gravar cookie:", error);
    return {
      success: false,
      error: "Não foi possível salvar a chave nos cookies seguros.",
    };
  }
}

/**
 * Remove a chave da API do Gemini (Google AI Studio) do cookie HttpOnly via Server Action.
 */
export async function removeGeminiApiKeyAction(): Promise<RemoveGeminiKeyResult> {
  try {
    await clearGeminiKeyCookie();
    return { success: true };
  } catch (error) {
    console.error("[removeGeminiApiKeyAction] Falha ao limpar cookie:", error);
    return {
      success: false,
      error: "Não foi possível desconectar a chave dos cookies seguros.",
    };
  }
}

/**
 * Obtém o status da chave Gemini sem expor seu valor completo.
 */
export async function getGeminiApiKeyStatusAction(): Promise<GeminiKeyStatusResult> {
  try {
    const key = await getGeminiKeyCookie();
    if (!key || key.length < 10) {
      return { hasKey: false };
    }

    const prefix = key.slice(0, 6);
    const suffix = key.slice(-3);
    return {
      hasKey: true,
      maskedKey: `${prefix}...${suffix}`,
    };
  } catch {
    return { hasKey: false };
  }
}
