"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Headphones, Library, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

const linkClass =
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm";

export function AppHeader() {
  const pathname = usePathname();
  const isReader = pathname === "/";
  const isLibrary = pathname === "/leituras";

  return (
    <header className="bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 sm:py-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="bg-accent text-accent-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
            <Headphones className="size-5" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold sm:text-lg">Leitor de PDF em áudio</h1>
            <p className="text-primary-foreground/70 hidden truncate text-sm sm:block">
              Transcreva e ouça seus documentos acompanhando o texto na tela
            </p>
          </div>
        </div>

        <nav className="bg-primary-foreground/10 flex shrink-0 items-center gap-1 rounded-full p-1">
          <Link
            href="/"
            className={cn(
              linkClass,
              isReader
                ? "bg-accent text-accent-foreground"
                : "text-primary-foreground/70 hover:text-primary-foreground",
            )}
          >
            <Mic className="size-4" />
            <span className="hidden sm:inline">Leitor</span>
          </Link>
          <Link
            href="/leituras"
            className={cn(
              linkClass,
              isLibrary
                ? "bg-accent text-accent-foreground"
                : "text-primary-foreground/70 hover:text-primary-foreground",
            )}
          >
            <Library className="size-4" />
            <span className="hidden sm:inline">Leituras</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
