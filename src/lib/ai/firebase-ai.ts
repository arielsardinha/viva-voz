/**
 * Integração com o Firebase AI Logic (firebase/ai) para inferência híbrida
 * (On-Device Gemini Nano + Cloud Vertex AI / Gemini Developer API BYOK).
 * Baseado na documentação oficial do Chrome & Firebase.
 */

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAI,
  getGenerativeModel,
  InferenceMode,
  GoogleAIBackend,
  type GenerativeModel,
  type AIModel,
} from "firebase/ai";
import { SYSTEM_INSTRUCTION_PT_BR, buildDocumentSystemPrompt } from "./system-instructions";

export { InferenceMode, type GenerativeModel };

export interface HybridModelOptions {
  apiKey?: string | null;
  mode?: InferenceMode;
  systemInstruction?: string;
  inCloudModel?: string;
}

export interface HybridStreamChunk {
  text: string;
  source?: "ON_DEVICE" | "IN_CLOUD" | string;
}

// Polyfill/Shim de compatibilidade para diferentes versões do Chrome Built-in AI
if (typeof window !== "undefined") {
  if (!(window as any).LanguageModel && (window as any).ai?.languageModel) {
    try {
      (window as any).LanguageModel = (window as any).ai.languageModel;
    } catch {}
  }
}

/**
 * Obtém ou cria uma instância isolada do Firebase App para o cliente.
 */
export function getOrCreateFirebaseApp(apiKey?: string | null): FirebaseApp {
  const effectiveKey = apiKey?.trim() || "AIzaSyCMqcXKfIgiMF2OUkHCfIssGD_m1rLYp30";
  const appName = `vivavoz-ai-${effectiveKey.slice(0, 8)}`;

  const existingApp = getApps().find((app) => app.name === appName);
  if (existingApp) {
    return existingApp;
  }

  return initializeApp(
    {
      apiKey: effectiveKey,
      projectId: "alf-web-samples",
      appId: "1:168715621722:web:964519a8c1fc12a43f4f63",
    },
    appName,
  );
}

/**
 * Cria uma instância de GenerativeModel configurada com inferência híbrida.
 */
export function createHybridGenerativeModel(options: HybridModelOptions = {}): GenerativeModel {
  const {
    apiKey,
    mode = InferenceMode.PREFER_ON_DEVICE,
    systemInstruction = SYSTEM_INSTRUCTION_PT_BR,
    inCloudModel = "gemini-2.5-flash",
  } = options;

  const app = getOrCreateFirebaseApp(apiKey);
  const ai = getAI(app, { backend: new GoogleAIBackend() });

  return getGenerativeModel(ai, {
    mode,
    inCloudParams: {
      model: inCloudModel,
      systemInstruction,
    },
  });
}

/**
 * Executa uma solicitação de prompt com streaming progressivo via Firebase AI Logic.
 */
export async function* streamHybridPrompt(options: {
  model: GenerativeModel;
  prompt: string;
  context?: string;
  fileName?: string | null;
  signal?: AbortSignal;
}): AsyncIterable<HybridStreamChunk> {
  const { model, prompt, context, fileName, signal } = options;

  let fullPrompt = prompt;
  if (context && context.trim().length > 0) {
    const documentContext = buildDocumentSystemPrompt({ context, fileName });
    fullPrompt = `${documentContext}\n\n=== PERGUNTA DO USUÁRIO ===\n${prompt}`;
  }

  if (signal?.aborted) {
    throw new Error("Operação cancelada pelo usuário.");
  }

  const result = await model.generateContentStream(fullPrompt);

  let source: "ON_DEVICE" | "IN_CLOUD" | string | undefined = (result as unknown as { inferenceSource?: string })?.inferenceSource;

  for await (const chunk of result.stream) {
    if (signal?.aborted) break;

    const chunkObj = chunk as unknown as { inferenceSource?: string; text?: () => string };
    if (chunkObj?.inferenceSource) {
      source = chunkObj.inferenceSource;
    }

    const chunkText = typeof chunk.text === "function" ? chunk.text() : String(chunk);
    yield { text: chunkText, source };
  }

  // Captura a fonte de inferência final confirmada pela API se disponível
  try {
    const response = await result.response;
    const respSource = (response as unknown as { inferenceSource?: string })?.inferenceSource;
    if (respSource) {
      source = respSource;
    }
  } catch {
    // Ignora se não conseguir ler metadados da resposta final
  }
}

/**
 * Verifica a disponibilidade do Gemini Nano On-Device no navegador.
 */
export async function checkOnDeviceAvailability(): Promise<"available" | "downloadable" | "unavailable"> {
  if (typeof window === "undefined") return "unavailable";

  // 1. Checa window.LanguageModel (Chrome 138+ / Prompt API Standard)
  const winLangModel = (window as unknown as { LanguageModel?: { availability?: () => Promise<string>; capabilities?: () => Promise<{ available: string }> } }).LanguageModel;
  if (winLangModel) {
    try {
      if (typeof winLangModel.availability === "function") {
        const status = await winLangModel.availability();
        if (status === "available" || status === "readily") return "available";
        if (status === "downloadable" || status === "after-download") return "downloadable";
        return "unavailable";
      }
      if (typeof winLangModel.capabilities === "function") {
        const caps = await winLangModel.capabilities();
        const status = caps?.available;
        if (status === "available" || status === "readily") return "available";
        if (status === "downloadable" || status === "after-download") return "downloadable";
        return "unavailable";
      }
    } catch {}
  }

  // 2. Checa window.ai.languageModel (Chrome 128-137)
  const winAI = (window as unknown as { ai?: { languageModel?: { capabilities?: () => Promise<{ available: string }>; availability?: () => Promise<string> } } }).ai;
  const winModel = (window as unknown as { model?: { capabilities?: () => Promise<{ available: string }>; availability?: () => Promise<string> } }).model;
  const factory = winAI?.languageModel || winModel;

  if (!factory) return "unavailable";

  try {
    if (typeof factory.availability === "function") {
      const status = await factory.availability();
      if (status === "available" || status === "readily") return "available";
      if (status === "downloadable" || status === "after-download") return "downloadable";
      return "unavailable";
    }

    if (typeof factory.capabilities === "function") {
      const caps = await factory.capabilities();
      const status = caps?.available;
      if (status === "available" || status === "readily") return "available";
      if (status === "downloadable" || status === "after-download") return "downloadable";
      return "unavailable";
    }

    return "available";
  } catch {
    return "unavailable";
  }
}
