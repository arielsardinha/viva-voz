"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AudioLines,
  FolderArchive,
  Heart,
  Menu,
  Moon,
  ScrollText,
  Sparkles,
  Sun,
  X,
  ArrowRight,
  Mic,
  Cpu,
  Layers,
  BookOpen,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useReaderSettings } from "@/context/reader-settings-context";
import { cn } from "@/lib/utils";

export function LandingHeader() {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { settings, setTheme } = useReaderSettings();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const ThemeIcon =
    settings.theme === "dark"
      ? Moon
      : settings.theme === "sepia"
        ? ScrollText
        : Sun;

  const cycleTheme = () => {
    if (settings.theme === "light") setTheme("dark");
    else if (settings.theme === "dark") setTheme("sepia");
    else setTheme("light");
  };

  return (
    <header
      role="banner"
      data-hydrated={isMounted ? "true" : "false"}
      className="sticky top-0 z-50 glass-panel border-b border-border/80 shadow-xs backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3.5 sm:px-6 lg:px-8 py-3">
        {/* Logo & Branding */}
        <Link
          href="/"
          aria-label="VivaVoz - Início"
          className="flex items-center gap-2 group shrink-0"
        >
          <div className="flex size-9 sm:size-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-accent to-indigo-500 text-accent-foreground shadow-md shadow-accent/20 group-hover:scale-105 transition-transform">
            <AudioLines className="size-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm sm:text-base font-black tracking-tight text-foreground">
                VivaVoz
              </span>
            </div>
            <p className="hidden text-[10px] text-muted-foreground sm:block">
              Leitor Neural & IA Contextual
            </p>
          </div>
        </Link>

        {/* Navegação Desktop */}
        <nav
          aria-label="Navegação principal"
          className="hidden md:flex items-center gap-1 rounded-2xl bg-secondary/70 p-1 border border-border/80 shadow-xs"
        >
          <Link
            href="#features"
            className="rounded-xl px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-background/80 transition-all"
          >
            Recursos
          </Link>
          <Link
            href="/leitor"
            className="rounded-xl px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-background/80 transition-all"
          >
            Leitor
          </Link>
          <Link
            href="/leituras"
            className="rounded-xl px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-background/80 transition-all"
          >
            Biblioteca
          </Link>
          <Link
            href="/apoiar"
            className="rounded-xl px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-all"
          >
            Apoiar
          </Link>
        </nav>

        {/* Ações Direitas Desktop */}
        <div className="hidden sm:flex items-center gap-2.5">
          <button
            type="button"
            onClick={cycleTheme}
            data-cy="theme-toggle-btn"
            data-testid="theme-toggle-btn"
            aria-label={`Alternar tema. Tema atual: ${settings.theme}`}
            className="flex size-9 items-center justify-center rounded-2xl border border-border/80 bg-background/80 hover:bg-secondary text-foreground transition-all shadow-xs cursor-pointer"
          >
            <ThemeIcon className="size-4 text-accent" aria-hidden="true" />
          </button>

          <Link
            href="/leitor"
            data-cy="header-open-reader-btn"
            data-testid="header-open-reader-btn"
            className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-accent to-indigo-600 px-4 py-2 text-xs font-extrabold text-accent-foreground shadow-md shadow-accent/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <Mic className="size-3.5" />
            <span>Abrir Leitor</span>
          </Link>
        </div>

        {/* Menu Drawer Mobile (< md) */}
        <div className="flex md:hidden items-center gap-2">
          <button
            type="button"
            onClick={cycleTheme}
            aria-label="Alternar tema"
            className="flex size-8.5 items-center justify-center rounded-xl border border-border/80 bg-background/80 text-foreground"
          >
            <ThemeIcon className="size-4 text-accent" />
          </button>

          <Sheet>
            <SheetTrigger asChild>
              <button
                type="button"
                data-cy="mobile-drawer-trigger"
                data-testid="mobile-drawer-trigger"
                aria-label="Abrir menu de navegação"
                className="flex size-8.5 items-center justify-center rounded-xl border border-border/80 bg-background/80 text-foreground hover:bg-secondary transition-all shadow-xs cursor-pointer"
              >
                <Menu className="size-4.5" aria-hidden="true" />
              </button>
            </SheetTrigger>

            <SheetContent
              side="right"
              data-cy="mobile-drawer-content"
              data-testid="mobile-drawer-content"
              className="w-[280px] xs:w-[320px] p-6 glass-panel border-l border-border/80 flex flex-col justify-between"
            >
              <div className="space-y-6">
                <SheetHeader className="text-left space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                      <AudioLines className="size-4" />
                    </div>
                    <SheetTitle className="text-base font-black text-foreground">
                      VivaVoz Menu
                    </SheetTitle>
                  </div>
                  <SheetDescription className="text-xs text-muted-foreground">
                    Navegação e atalhos rápidos
                  </SheetDescription>
                </SheetHeader>

                <nav aria-label="Navegação mobile" className="space-y-2">
                  <Link
                    href="#features"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-foreground hover:bg-secondary transition-colors"
                  >
                    <Layers className="size-4 text-cyan-500" />
                    <span>Recursos</span>
                  </Link>

                  <Link
                    href="/leitor"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-foreground hover:bg-secondary transition-colors"
                  >
                    <Mic className="size-4 text-accent" />
                    <span>Leitor de Documentos</span>
                  </Link>

                  <Link
                    href="/leituras"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-foreground hover:bg-secondary transition-colors"
                  >
                    <FolderArchive className="size-4 text-indigo-400" />
                    <span>Biblioteca Local</span>
                  </Link>

                  <Link
                    href="/apoiar"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <Heart className="size-4 fill-rose-500 text-rose-500" />
                    <span>Apoiar Projeto</span>
                  </Link>
                </nav>
              </div>

              {/* Botão Inferior no Drawer */}
              <div className="pt-4 border-t border-border/70 space-y-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
                <Link
                  href="/leitor"
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-accent to-indigo-600 py-3 text-xs font-bold text-accent-foreground shadow-lg shadow-accent/25"
                >
                  <span>Iniciar no Leitor</span>
                  <ArrowRight className="size-3.5" />
                </Link>

                <p className="text-[10px] text-center text-muted-foreground">
                  VivaVoz Open Source • PWA Ready
                </p>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
