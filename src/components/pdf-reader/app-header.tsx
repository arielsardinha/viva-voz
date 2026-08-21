"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AudioLines,
  FolderArchive,
  Mic,
  Moon,
  Sparkles,
  Sun,
} from "lucide-react";
import { GeminiKeyDialog } from "./gemini-key-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useReaderSettings } from "@/context/reader-settings-context";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "gemini-api-key";

export function AppHeader() {
  const pathname = usePathname();
  const isReader = pathname === "/";
  const isLibrary = pathname === "/leituras";

  const [apiKey, setApiKey] = useState<string | null>(null);
  const { settings, setTheme } = useReaderSettings();

  useEffect(() => {
    setApiKey(window.localStorage.getItem(STORAGE_KEY));
  }, []);

  const updateApiKey = useCallback((key: string | null) => {
    setApiKey(key);
    if (key) window.localStorage.setItem(STORAGE_KEY, key);
    else window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const ThemeIcon =
    settings.theme === "dark"
      ? Moon
      : settings.theme === "sepia"
      ? Sparkles
      : Sun;

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-border/80 shadow-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 py-2.5 sm:py-3">
        {/* Logo Branding */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <div className="flex size-9 sm:size-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-accent to-indigo-500 text-accent-foreground shadow-md shadow-accent/20 group-hover:scale-105 transition-transform">
            <AudioLines className="size-4 sm:size-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm sm:text-base font-extrabold tracking-tight text-foreground">
                VivaVoz
              </span>
              <span className="hidden xs:inline-block rounded-md bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                AI Studio
              </span>
            </div>
            <p className="hidden text-[11px] text-muted-foreground md:block">
              Leitura fluida & Narração Inteligente
            </p>
          </div>
        </Link>

        {/* Center/Right Nav Links & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <nav className="flex items-center gap-0.5 sm:gap-1 rounded-2xl bg-secondary/80 p-1 border border-border/60">
            <Link
              href="/"
              className={cn(
                "flex items-center gap-1 sm:gap-1.5 rounded-xl px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition-all",
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
                "flex items-center gap-1 sm:gap-1.5 rounded-xl px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition-all",
                isLibrary
                  ? "bg-card text-foreground shadow-xs ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/50"
              )}
            >
              <FolderArchive className="size-3.5" />
              <span>Biblioteca</span>
            </Link>
          </nav>

          {/* Alternador Rápido de Tema */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Alternar tema de leitura"
                title={`Tema atual: ${
                  settings.theme === "dark"
                    ? "Escuro"
                    : settings.theme === "sepia"
                    ? "Papel Zen"
                    : "Clean"
                }`}
                className="flex size-8 sm:size-9 items-center justify-center rounded-2xl border border-border/80 bg-background/80 hover:bg-secondary text-foreground transition-colors shadow-xs"
              >
                <ThemeIcon
                  className={cn(
                    "size-3.5 sm:size-4 transition-transform",
                    settings.theme === "dark" && "text-indigo-400",
                    settings.theme === "sepia" && "text-amber-600",
                    settings.theme === "light" && "text-amber-500"
                  )}
                />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-44 p-2 glass-panel">
              <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Tema de Leitura
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setTheme("light")}
                className={cn(
                  "flex items-center gap-2 cursor-pointer rounded-lg text-xs font-medium",
                  settings.theme === "light" && "bg-accent/15 text-accent font-semibold"
                )}
              >
                <Sun className="size-4 text-amber-500" />
                <span>Clean (Claro)</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setTheme("sepia")}
                className={cn(
                  "flex items-center gap-2 cursor-pointer rounded-lg text-xs font-medium",
                  settings.theme === "sepia" && "bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-semibold"
                )}
              >
                <Sparkles className="size-4 text-amber-600" />
                <span>Papel Zen (Sépia)</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setTheme("dark")}
                className={cn(
                  "flex items-center gap-2 cursor-pointer rounded-lg text-xs font-medium",
                  settings.theme === "dark" && "bg-accent/20 text-accent font-semibold"
                )}
              >
                <Moon className="size-4 text-indigo-400" />
                <span>Escuro (Midnight)</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Dialog da chave Gemini */}
          <GeminiKeyDialog apiKey={apiKey} onChange={updateApiKey} />
        </div>
      </div>
    </header>
  );
}

