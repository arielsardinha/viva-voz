"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AudioLines,
  Check,
  FolderArchive,
  GraduationCap,
  Heart,
  Menu,
  MessageSquarePlus,
  Mic,
  Moon,
  ScrollText,
  Sparkles,
  Sun,
} from "lucide-react";
import { DeveloperContactDialog } from "./developer-contact-dialog";
import { GeminiKeyDialog } from "./gemini-key-dialog";
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

const STORAGE_KEY = "gemini-api-key";

export function AppHeader() {
  const pathname = usePathname();
  const isReader = pathname === "/";
  const isLibrary = pathname === "/leituras";

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [geminiDialogOpen, setGeminiDialogOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  const { settings, setTheme, openOnboarding, isInitialized } = useReaderSettings();

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
                "group relative flex items-center gap-1.5 sm:gap-2 rounded-xl px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold transition-all duration-200",
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
                "group relative flex items-center gap-1.5 sm:gap-2 rounded-xl px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold transition-all duration-200",
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
          <GoogleDriveSyncButton hideWhenConnected={true} />



          {/* Botão de Instalação PWA */}
          <PwaInstallButton variant="default" />

          {/* Diálogo do Tutorial de Preferências */}
          <PreferencesTutorialDialog />

          {/* Diálogos controlados por estado */}
          <SupportDialog
            open={supportOpen}
            onOpenChange={setSupportOpen}
            trigger={<span className="hidden" />}
          />
          <DeveloperContactDialog
            open={contactOpen}
            onOpenChange={setContactOpen}
            trigger={<span className="hidden" />}
          />
          <GeminiKeyDialog
            apiKey={apiKey}
            onChange={updateApiKey}
            open={geminiDialogOpen}
            onOpenChange={setGeminiDialogOpen}
            trigger={<span className="hidden" />}
          />

          {/* Botão de Contribuição Voluntária Pix (Desktop) */}
          <button
            type="button"
            data-cy="support-project-btn"
            onClick={() => setSupportOpen(true)}
            aria-label="Apoiar o projeto VivaVoz"
            className="hidden sm:flex items-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-semibold transition-all shadow-xs hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Heart className="size-3.5 fill-rose-500 text-rose-500" aria-hidden="true" />
            <span>Apoiar</span>
          </button>

          {/* Botão para Falar com o Desenvolvedor / Sugerir Recursos (Desktop) */}
          <button
            type="button"
            data-cy="developer-contact-trigger"
            onClick={() => setContactOpen(true)}
            aria-label="Entrar em contato com o desenvolvedor"
            className="hidden sm:flex items-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 rounded-2xl border border-border/80 bg-background/80 hover:bg-secondary text-foreground text-xs font-semibold transition-all shadow-xs cursor-pointer"
          >
            <MessageSquarePlus className="size-3.5 text-accent" aria-hidden="true" />
            <span>Contato</span>
          </button>

          {/* Alternador Rápido de Tema & Ajustes (Desktop) */}
          <div className="hidden sm:block">
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
                  <span>Tema</span>
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
                  data-cy="gemini-key-trigger"
                  onClick={() => setGeminiDialogOpen(true)}
                  className="flex items-center gap-2 cursor-pointer rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  <Sparkles className="size-4 text-amber-500" aria-hidden="true" />
                  <span>Configurar Chave Gemini</span>
                </DropdownMenuItem>
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

          {/* Menu Hambúrguer em Telas Pequenas (< sm) */}
          <div className="flex sm:hidden items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  data-cy="mobile-menu-trigger"
                  aria-label="Abrir menu de opções"
                  className="flex items-center justify-center size-8 xs:size-9 rounded-2xl border border-border/80 bg-background/80 hover:bg-secondary text-foreground transition-all shadow-xs cursor-pointer"
                >
                  <Menu className="size-4" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-60 p-2 glass-panel">
                <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Tema de Leitura
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  data-cy="mobile-theme-item-light"
                  onClick={() => setTheme("light")}
                  className={cn(
                    "flex items-center justify-between cursor-pointer rounded-lg text-xs font-medium py-2 px-2.5",
                    settings.theme === "light" && "bg-accent/15 text-accent font-semibold"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Sun className="size-4 text-amber-500" aria-hidden="true" />
                    <span>Clean (Claro)</span>
                  </div>
                  {settings.theme === "light" && <Check className="size-3.5 text-accent" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-cy="mobile-theme-item-sepia"
                  onClick={() => setTheme("sepia")}
                  className={cn(
                    "flex items-center justify-between cursor-pointer rounded-lg text-xs font-medium py-2 px-2.5",
                    settings.theme === "sepia" && "bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-semibold"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <ScrollText className="size-4 text-amber-600" aria-hidden="true" />
                    <span>Papel Zen (Sépia)</span>
                  </div>
                  {settings.theme === "sepia" && <Check className="size-3.5 text-amber-600" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-cy="mobile-theme-item-dark"
                  onClick={() => setTheme("dark")}
                  className={cn(
                    "flex items-center justify-between cursor-pointer rounded-lg text-xs font-medium py-2 px-2.5",
                    settings.theme === "dark" && "bg-accent/20 text-accent font-semibold"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Moon className="size-4 text-indigo-400" aria-hidden="true" />
                    <span>Escuro (Midnight)</span>
                  </div>
                  {settings.theme === "dark" && <Check className="size-3.5 text-accent" />}
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Ações & Recursos
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* Apoiar */}
                <DropdownMenuItem
                  data-cy="mobile-support-item"
                  onClick={() => setSupportOpen(true)}
                  className="flex items-center gap-2 cursor-pointer rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 py-2 px-2.5"
                >
                  <Heart className="size-4 fill-rose-500 text-rose-500" aria-hidden="true" />
                  <span>Apoiar com Pix</span>
                </DropdownMenuItem>

                {/* Contato */}
                <DropdownMenuItem
                  data-cy="mobile-contact-item"
                  onClick={() => setContactOpen(true)}
                  className="flex items-center gap-2 cursor-pointer rounded-lg text-xs font-medium text-foreground hover:bg-secondary py-2 px-2.5"
                >
                  <MessageSquarePlus className="size-4 text-accent" aria-hidden="true" />
                  <span>Falar com o Desenvolvedor</span>
                </DropdownMenuItem>

                {/* Chave Gemini */}
                <DropdownMenuItem
                  data-cy="mobile-gemini-key-item"
                  onClick={() => setGeminiDialogOpen(true)}
                  className="flex items-center gap-2 cursor-pointer rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary py-2 px-2.5"
                >
                  <Sparkles className="size-4 text-amber-500" aria-hidden="true" />
                  <span>Configurar Chave Gemini</span>
                </DropdownMenuItem>

                {/* Tutorial / Preferências */}
                <DropdownMenuItem
                  data-cy="mobile-tutorial-item"
                  onClick={() => openOnboarding()}
                  className="flex items-center gap-2 cursor-pointer rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary py-2 px-2.5"
                >
                  <GraduationCap className="size-4 text-accent" aria-hidden="true" />
                  <span>Refazer Tutorial</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <PwaInstallButton variant="menu-item" showOnlyIfInstallable={false} />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}


