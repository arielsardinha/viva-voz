"use client";

import Link from "next/link";
import { Cpu, ExternalLink, HardDrive } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/local-ai/domain/local-model-catalog";
import { useLocalAiModels } from "@/hooks/use-local-ai-models";
import { LocalModelCard } from "./local-model-card";

export function LocalModelsDrawer() {
  const {
    descriptors,
    models,
    runtimeSupport,
    isDrawerOpen,
    setDrawerOpen,
    closeDrawer,
    highlightedModelId,
    totalLocalModelsBytes,
    startDownload,
    cancelDownload,
    deleteModel,
    activateModelInReader,
  } = useLocalAiModels();

  return (
    <Sheet open={isDrawerOpen} onOpenChange={setDrawerOpen}>
      <SheetContent
        side="right"
        data-cy="local-models-drawer"
        className="w-full sm:max-w-md p-0 flex flex-col gap-0 glass-panel border-l border-border/80 shadow-2xl overflow-hidden"
      >
        <SheetHeader className="shrink-0 px-4 sm:px-5 py-4 border-b border-border/60 bg-card/70 space-y-1.5 text-left">
          <div className="flex items-center gap-2.5 pr-7">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent">
              <Cpu className="size-4.5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-sm sm:text-base font-bold text-foreground">
                Modelos de IA Local
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Baixe e acompanhe o progresso sem sair do leitor.
              </SheetDescription>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary/80 px-2 py-0.5 font-medium text-foreground">
              <span
                className={
                  runtimeSupport.webGpuSupported
                    ? "size-1.5 rounded-full bg-emerald-500"
                    : "size-1.5 rounded-full bg-amber-500"
                }
              />
              {runtimeSupport.webGpuSupported
                ? "WebGPU disponível"
                : "Modo CPU / WASM"}
            </span>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scroll-smooth">
          {descriptors.map((descriptor) => (
            <LocalModelCard
              key={descriptor.id}
              descriptor={descriptor}
              state={models[descriptor.id]}
              runtimeSupport={runtimeSupport}
              isHighlighted={highlightedModelId === descriptor.id}
              compact
              onDownload={(id) => void startDownload(id)}
              onCancel={cancelDownload}
              onDelete={(id) => void deleteModel(id)}
              onActivate={(id) => void activateModelInReader(id)}
            />
          ))}
        </div>

        <footer className="shrink-0 border-t border-border/60 bg-muted/20 px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] space-y-2.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <HardDrive className="size-3.5 text-accent" aria-hidden="true" />
              <span>Espaço em cache local</span>
            </span>
            <span className="font-semibold text-foreground">
              {formatBytes(totalLocalModelsBytes)}
            </span>
          </div>

          <Button asChild variant="outline" size="sm" className="w-full min-h-9 text-xs font-semibold">
            <Link
              href="/modelos"
              data-cy="open-models-page-from-drawer"
              onClick={closeDrawer}
              className="flex items-center justify-center gap-1.5"
            >
              <span>Abrir tela completa de Modelos</span>
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </Link>
          </Button>
        </footer>
      </SheetContent>
    </Sheet>
  );
}
