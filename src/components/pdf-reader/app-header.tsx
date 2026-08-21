"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AudioLines, Bookmark, FolderArchive, Headphones, Key, Mic, Sparkles } from "lucide-react";
import { GeminiKeyDialog } from "./gemini-key-dialog";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "gemini-api-key";

export function AppHeader() {
  const pathname = usePathname();
  const isReader = pathname === "/";
  const isLibrary = pathname === "/leituras";

  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    setApiKey(window.localStorage.getItem(STORAGE_KEY));
  }, []);

  const updateApiKey = useCallback((key: string | null) => {
    setApiKey(key);
    if (key) window.localStorage.setItem(STORAGE_KEY, key);
    else window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-border/80 shadow-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {/* Logo Branding */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-accent to-indigo-500 text-accent-foreground shadow-md shadow-accent/20 group-hover:scale-105 transition-transform">
            <AudioLines className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-extrabold tracking-tight text-foreground">
                VivaVoz
              </span>
              <span className="rounded-md bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                AI Studio
              </span>
            </div>
            <p className="hidden text-[11px] text-muted-foreground sm:block">
              Leitura fluida & Narração Inteligente
            </p>
          </div>
        </Link>

        {/* Center/Right Nav Links & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <nav className="flex items-center gap-1 rounded-2xl bg-secondary/80 p-1 border border-border/60">
            <Link
              href="/"
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all",
                isReader
                  ? "bg-card text-foreground shadow-xs ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/50"
              )}
            >
              <Mic className="size-3.5" />
              <span>Leitor</span>
            </Link>

            <Link
              href="/leituras"
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all",
                isLibrary
                  ? "bg-card text-foreground shadow-xs ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/50"
              )}
            >
              <FolderArchive className="size-3.5" />
              <span>Biblioteca</span>
            </Link>
          </nav>

          {/* Dialog da chave Gemini */}
          <GeminiKeyDialog apiKey={apiKey} onChange={updateApiKey} />
        </div>
      </div>
    </header>
  );
}
