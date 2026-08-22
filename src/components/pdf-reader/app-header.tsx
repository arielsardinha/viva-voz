"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AudioLines,
  FolderArchive,
  GraduationCap,
  Mic,
  Moon,
  ScrollText,
  Sun,
} from "lucide-react";
import { DeveloperContactDialog } from "./developer-contact-dialog";
import { PreferencesTutorialDialog } from "./preferences-tutorial-dialog";
import { SupportDialog } from "./support-dialog";
import { GoogleDriveSyncButton } from "@/components/sync/google-drive-sync-button";
import { PwaInstallButton } from "@/components/pwa/pwa-install-button";
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

export function AppHeader() {
  const pathname = usePathname();
  const isReader = pathname === "/";
  const isLibrary = pathname === "/leituras";

  const { settings, setTheme, openOnboarding, isInitialized } = useReaderSettings();

  const ThemeIcon =
    settings.theme === "dark"
      ? Moon
      : settings.theme === "sepia"
      ? ScrollText
      : Sun;

  return (
    <header
      role="banner"
      data-hydrated={isInitialized ? "true" : "false"}
      className="sticky top-0 z-50 glass-panel border-b border-border/80 shadow-xs"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 py-2.5 sm:py-3">
        {/* Logo Branding */}
        <Link
          href="/"
          aria-label="VivaVoz - Início"
          className="flex items-center gap-2 group shrink-0"
        >
          <div className="flex size-9 sm:size-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-accent to-indigo-500 text-accent-foreground shadow-md shadow-accent/20 group-hover:scale-105 transition-transform">
            <AudioLines className="size-4 sm:size-5" aria-hidden="true" />
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
          <nav
            aria-label="Navegação principal"
            className="flex items-center gap-1 rounded-2xl bg-secondary/80 dark:bg-secondary/60 p-1 border border-border/80 shadow-xs backdrop-blur-xs"
          >
            <Link
              href="/"
              data-cy="nav-link-reader"
              aria-current={isReader ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-3.5 py-1.5 text-xs font-semibold transition-all duration-200",
                isReader
                  ? "bg-gradient-to-r from-accent to-indigo-600 text-accent-foreground shadow-sm shadow-accent/25 font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/80"
              )}
            >
              <Mic
                className={cn(
                  "size-3.5 sm:size-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
                  isReader
                    ? "text-accent-foreground"
                    : "text-muted-foreground group-hover:text-accent"
                )}
                aria-hidden="true"
              />
              <span>Leitor</span>
            </Link>

            <Link
              href="/leituras"
              data-cy="nav-link-library"
              aria-current={isLibrary ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-3.5 py-1.5 text-xs font-semibold transition-all duration-200",
                isLibrary
                  ? "bg-gradient-to-r from-accent to-indigo-600 text-accent-foreground shadow-sm shadow-accent/25 font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/80"
              )}
            >
              <FolderArchive
                className={cn(
                  "size-3.5 sm:size-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
                  isLibrary
                    ? "text-accent-foreground"
                    : "text-muted-foreground group-hover:text-accent"
                )}
                aria-hidden="true"
              />
              <span>Biblioteca</span>
            </Link>
          </nav>

          {/* Botão de Sincronização e Backup no Google Drive */}
          <GoogleDriveSyncButton />

          {/* Botão de Instalação PWA */}
          <PwaInstallButton variant="default" />

          {/* Diálogo do Tutorial de Preferências (abre automaticamente no primeiro acesso se ainda não definiu preferências) */}
          <PreferencesTutorialDialog />

          {/* Botão de Contribuição Voluntária Pix */}
          <SupportDialog />

          {/* Botão para Falar com o Desenvolvedor / Sugerir Recursos */}
          <DeveloperContactDialog />

          {/* Alternador Rápido de Tema & Ajustes */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                data-cy="theme-dropdown-trigger"
                aria-label="Alternar tema de leitura"
                title={`Tema atual: ${
                  settings.theme === "dark"
                    ? "Escuro"
                    : settings.theme === "sepia"
                    ? "Papel Zen"
                    : "Clean"
                }`}
                className="flex items-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 rounded-2xl border border-border/80 bg-background/80 hover:bg-secondary text-foreground text-xs font-semibold transition-all shadow-xs cursor-pointer"
              >
                <ThemeIcon
                  className={cn(
                    "size-3.5 shrink-0 transition-transform",
                    settings.theme === "dark" && "text-indigo-400",
                    settings.theme === "sepia" && "text-amber-600",
                    settings.theme === "light" && "text-amber-500"
                  )}
                  aria-hidden="true"
                />
                <span className="hidden sm:inline">Tema</span>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56 p-2 glass-panel">
              <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Tema de Leitura
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                data-cy="theme-item-light"
                onClick={() => setTheme("light")}
                className={cn(
                  "flex items-center gap-2 cursor-pointer rounded-lg text-xs font-medium",
                  settings.theme === "light" && "bg-accent/15 text-accent font-semibold"
                )}
              >
                <Sun className="size-4 text-amber-500" aria-hidden="true" />
                <span>Clean (Claro)</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                data-cy="theme-item-sepia"
                onClick={() => setTheme("sepia")}
                className={cn(
                  "flex items-center gap-2 cursor-pointer rounded-lg text-xs font-medium",
                  settings.theme === "sepia" && "bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-semibold"
                )}
              >
                <ScrollText className="size-4 text-amber-600" aria-hidden="true" />
                <span>Papel Zen (Sépia)</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                data-cy="theme-item-dark"
                onClick={() => setTheme("dark")}
                className={cn(
                  "flex items-center gap-2 cursor-pointer rounded-lg text-xs font-medium",
                  settings.theme === "dark" && "bg-accent/20 text-accent font-semibold"
                )}
              >
                <Moon className="size-4 text-indigo-400" aria-hidden="true" />
                <span>Escuro (Midnight)</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem
                data-cy="reopen-tutorial-item"
                onClick={() => openOnboarding()}
                className="flex items-center gap-2 cursor-pointer rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <GraduationCap className="size-4 text-accent" aria-hidden="true" />
                <span>Refazer Tutorial / Preferências</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <PwaInstallButton variant="menu-item" showOnlyIfInstallable={false} />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}


