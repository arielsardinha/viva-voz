"use client";

import { useMemo, useState } from "react";
import { BookOpen, Check, FileText, Search } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Sentence } from "@/lib/pdf-text";

interface PagesDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPage: number;
  totalPages: number;
  pageList: number[];
  onSelectPage: (pageNum: number) => void;
  sentences?: Sentence[];
  title?: string | null;
}

export function PagesDrawer({
  open,
  onOpenChange,
  currentPage,
  totalPages,
  pageList,
  onSelectPage,
  sentences,
  title,
}: PagesDrawerProps) {
  const [filterQuery, setFilterQuery] = useState("");

  // Calcula trecho inicial de cada página para preview informativo
  const pagePreviews = useMemo(() => {
    const map = new Map<number, string>();
    if (!sentences || sentences.length === 0) return map;

    for (const s of sentences) {
      if (!map.has(s.page)) {
        map.set(s.page, s.text.slice(0, 75) + (s.text.length > 75 ? "…" : ""));
      }
    }
    return map;
  }, [sentences]);

  const filteredPages = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return pageList;

    const pageNumQuery = parseInt(q, 10);
    if (!isNaN(pageNumQuery)) {
      return pageList.filter((p) => p.toString().includes(q));
    }

    return pageList.filter((p) => {
      const preview = pagePreviews.get(p)?.toLowerCase() || "";
      return preview.includes(q);
    });
  }, [pageList, filterQuery, pagePreviews]);

  const handleSelect = (pageNum: number) => {
    onSelectPage(pageNum);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col glass-panel border-l border-border/80 shadow-2xl z-50 overflow-hidden"
      >
        {/* Header do Drawer */}
        <SheetHeader className="p-4 sm:p-5 border-b border-border/60 bg-card/60 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-2xl bg-accent/15 text-accent shadow-xs">
                <BookOpen className="size-4.5" />
              </div>
              <div className="text-left">
                <SheetTitle className="text-sm sm:text-base font-bold text-foreground">
                  Índice de Páginas
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground truncate max-w-[280px]">
                  {title ? `${title} • ` : ""}{totalPages} {totalPages === 1 ? "página" : "páginas"} no documento
                </SheetDescription>
              </div>
            </div>
          </div>

          {/* Campo de Busca Rápida de Página */}
          {totalPages > 4 && (
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Buscar por número ou trecho..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-accent text-foreground"
              />
            </div>
          )}
        </SheetHeader>

        {/* Lista de Páginas em Grid Otimizada para Toque */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5 scroll-smooth">
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-2.5">
            {filteredPages.map((pageNum) => {
              const isCurrent = pageNum === currentPage;
              const previewText = pagePreviews.get(pageNum);

              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => handleSelect(pageNum)}
                  className={cn(
                    "group relative flex flex-col justify-between p-3.5 rounded-2xl text-left transition-all border cursor-pointer active:scale-98",
                    isCurrent
                      ? "bg-accent/15 border-accent text-foreground shadow-xs ring-1 ring-accent/30"
                      : "bg-card/70 hover:bg-secondary border-border/80 text-foreground"
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className="flex items-center gap-1.5">
                      <FileText className={cn("size-3.5", isCurrent ? "text-accent" : "text-muted-foreground")} />
                      <span className="text-xs font-extrabold">Pág. {pageNum}</span>
                    </div>

                    {isCurrent ? (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-accent text-accent-foreground text-[10px] font-bold">
                        <Check className="size-3 stroke-[3]" />
                        <span>Atual</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground opacity-60 group-hover:opacity-100">
                        Ir
                      </span>
                    )}
                  </div>

                  {previewText && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">
                      {previewText}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {filteredPages.length === 0 && (
            <div className="py-12 text-center text-muted-foreground text-xs">
              Nenhuma página encontrada para &quot;{filterQuery}&quot;.
            </div>
          )}
        </div>

        {/* Rodapé Informativo */}
        <div className="p-3 sm:p-4 border-t border-border/60 bg-secondary/30 flex items-center justify-between text-xs text-muted-foreground">
          <span>Página atual: <strong className="text-foreground">{currentPage}</strong> de {totalPages}</span>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-semibold hover:bg-secondary text-foreground transition-colors"
          >
            Fechar
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
