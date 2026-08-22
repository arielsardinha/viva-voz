"use client";

import { FolderArchive, Bookmark, HardDrive, KeyRound, Sparkles, VolumeX } from "lucide-react";
import { GoogleDriveSyncButton } from "@/components/sync/google-drive-sync-button";
import { cn } from "@/lib/utils";

interface AudioCacheStats {
  totalBytes: number;
  totalTracks: number;
}

function formatSize(bytes: number) {
  if (!bytes) return "0 KB";
  return bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

interface LibrarySidebarProps {
  activeTab: "library" | "favorites";
  documentCount: number;
  favoritesCount: number;
  totalBytes: number;
  audioCacheStats: AudioCacheStats;
  hasApiKey: boolean;
  maskedKey?: string | null;
  onTabChange: (tab: "library" | "favorites") => void;
  onClearAudioCache: () => void;
  onConnectGemini: () => void;
  onDisconnectGemini: () => void;
}

export function LibrarySidebar({
  activeTab,
  documentCount,
  favoritesCount,
  totalBytes,
  audioCacheStats,
  hasApiKey,
  maskedKey,
  onTabChange,
  onClearAudioCache,
  onConnectGemini,
  onDisconnectGemini,
}: LibrarySidebarProps) {
  return (
    <aside className="space-y-3 sm:space-y-4">
      {/* Navegação: Biblioteca / Favoritos */}
      <div className="glass-panel p-1.5 sm:p-3 rounded-2xl sm:rounded-3xl border border-border/80 flex sm:flex-col gap-1.5 shadow-xs">
        <button
          type="button"
          onClick={() => onTabChange("library")}
          className={cn(
            "flex-1 sm:flex-initial w-full flex items-center justify-center sm:justify-start gap-2 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs font-semibold transition-all cursor-pointer",
            activeTab === "library"
              ? "bg-accent text-accent-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          )}
        >
          <FolderArchive className="size-4 shrink-0" />
          <span>Biblioteca</span>
          <span className="ml-1 sm:ml-auto text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-background/50 text-foreground font-bold">
            {documentCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("favorites")}
          className={cn(
            "flex-1 sm:flex-initial w-full flex items-center justify-center sm:justify-start gap-2 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs font-semibold transition-all cursor-pointer",
            activeTab === "favorites"
              ? "bg-accent text-accent-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          )}
        >
          <Bookmark className="size-4 shrink-0" />
          <span>Favoritos</span>
          <span className="ml-1 sm:ml-auto text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-background/50 text-foreground font-bold">
            {favoritesCount}
          </span>
        </button>
      </div>

      {/* Armazenamento Local Widget com Cache de Áudio */}
      <div className="glass-panel p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-border/80 shadow-xs space-y-2.5 sm:space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <HardDrive className="size-3.5 sm:size-4 text-accent" />
          <span>Armazenamento Local</span>
        </div>

        <div className="space-y-1.5 text-[10px] sm:text-[11px] text-muted-foreground leading-snug">
          <p>
            {documentCount} documento(s) salvos no navegador ({formatSize(totalBytes)}).
          </p>
          <p className="flex items-center gap-1.5 text-foreground/90 font-medium">
            <Sparkles className="size-3 text-accent shrink-0" />
            <span>
              Áudio em cache: {formatSize(audioCacheStats.totalBytes)} ({audioCacheStats.totalTracks} faixas)
            </span>
          </p>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-accent rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(
                100,
                Math.max(5, documentCount * 8 + audioCacheStats.totalTracks * 2)
              )}%`,
            }}
          />
        </div>

        {/* Botão de Sincronização Google Drive */}
        <div className="pt-2 border-t border-border/50">
          <GoogleDriveSyncButton
            variant="outline"
            showLabel={true}
            className="w-full justify-center bg-accent/10 border-accent/30 text-accent hover:bg-accent/20"
          />
        </div>

        {/* Botão de Ação para Limpar Apenas o Cache de Áudio */}
        <div className="pt-2 border-t border-border/50">
          <button
            type="button"
            disabled={audioCacheStats.totalTracks === 0}
            onClick={onClearAudioCache}
            className="w-full flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl border border-border bg-secondary/70 hover:bg-secondary text-[11px] font-semibold text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <VolumeX className="size-3.5 text-accent" aria-hidden="true" />
            <span>
              {audioCacheStats.totalTracks > 0
                ? "Limpar Cache de Áudio"
                : "Sem Cache de Áudio"}
            </span>
          </button>
        </div>

        {/* Seção da Chave Gemini (Google AI Studio) */}
        <div className="pt-2.5 border-t border-border/50 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-foreground">
            <div className="flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-accent" />
              <span>Chave Gemini (IA)</span>
            </div>
            {hasApiKey ? (
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Conectada
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground">Inativa</span>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground leading-snug">
            {hasApiKey
              ? `Chave salva em cookie seguro (${maskedKey ?? "ativa"}). Habilita chat e vozes neurais.`
              : "Conecte sua chave para narrar com voz de IA e tirar dúvidas com o assistente."}
          </p>

          {hasApiKey ? (
            <button
              type="button"
              data-cy="disconnect-gemini-key-btn"
              data-webmcp-tool="disconnectGeminiApiKey"
              data-webmcp-action="removeApiKey"
              onClick={onDisconnectGemini}
              className="w-full flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-[11px] font-semibold text-rose-700 dark:text-rose-300 transition-colors cursor-pointer"
            >
              <KeyRound className="size-3.5" aria-hidden="true" />
              <span>Desconectar Chave Gemini</span>
            </button>
          ) : (
            <button
              type="button"
              data-cy="connect-gemini-key-btn"
              onClick={onConnectGemini}
              className="w-full flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl border border-accent/40 bg-accent/10 hover:bg-accent/20 text-[11px] font-semibold text-accent transition-colors cursor-pointer"
            >
              <Sparkles className="size-3.5" aria-hidden="true" />
              <span>Conectar Chave Gemini</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
