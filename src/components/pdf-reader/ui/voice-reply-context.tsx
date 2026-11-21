"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { TtsEngine } from "@/lib/tts-engines";

/** Motor e voz escolhidos pelo usuário no leitor, reaproveitados pelos mini-players de explicação. */
export interface VoiceReplySettings {
  engine: TtsEngine;
  voice: string;
  speed: number;
  userApiKey?: string | null;
}

const VoiceReplyContext = createContext<VoiceReplySettings | null>(null);

export function VoiceReplyProvider({
  engine,
  voice,
  speed,
  userApiKey,
  children,
}: VoiceReplySettings & { children: ReactNode }) {
  const value = useMemo(
    () => ({ engine, voice, speed, userApiKey }),
    [engine, voice, speed, userApiKey],
  );
  return <VoiceReplyContext.Provider value={value}>{children}</VoiceReplyContext.Provider>;
}

/** Retorna as preferências de voz do leitor, ou `null` fora de um provider (usa a voz do sistema). */
export function useVoiceReplySettings(): VoiceReplySettings | null {
  return useContext(VoiceReplyContext);
}
