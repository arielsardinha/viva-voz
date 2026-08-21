"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { PwaInstallDialog } from "./pwa-install-dialog";

interface PwaInstallButtonProps {
  variant?: "default" | "compact" | "ghost" | "menu-item";
  className?: string;
  showOnlyIfInstallable?: boolean;
}

export function PwaInstallButton({
  variant = "default",
  className = "",
  showOnlyIfInstallable = true,
}: PwaInstallButtonProps) {
  const { canInstall, isInstalled } = usePwaInstall();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Se já estiver instalado ou se não for instalável e showOnlyIfInstallable for true, oculta
  if (isInstalled) {
    return null;
  }

  if (showOnlyIfInstallable && !canInstall) {
    return null;
  }

  if (variant === "menu-item") {
    return (
      <>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-foreground/90 hover:text-foreground hover:bg-muted/60 rounded-md transition-colors text-left ${className}`}
          data-webmcp-tool="openPwaInstallDialog"
          aria-label="Instalar aplicativo VivaVoz"
        >
          <Download className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>Instalar Aplicativo</span>
        </button>
        <PwaInstallDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </>
    );
  }

  if (variant === "compact") {
    return (
      <>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setDialogOpen(true)}
          className={`h-8 w-8 rounded-lg border-border/60 hover:border-primary/50 text-foreground/80 hover:text-primary transition-all shadow-sm ${className}`}
          data-webmcp-tool="openPwaInstallDialog"
          aria-label="Instalar aplicativo VivaVoz"
          title="Instalar VivaVoz no seu dispositivo"
        >
          <Download className="w-4 h-4" />
        </Button>
        <PwaInstallDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDialogOpen(true)}
        className={`gap-1.5 text-xs h-8 px-2.5 rounded-lg border-primary/30 hover:border-primary/60 bg-primary/5 hover:bg-primary/10 text-primary font-medium transition-all shadow-sm ${className}`}
        data-webmcp-tool="openPwaInstallDialog"
        aria-label="Instalar aplicativo VivaVoz"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">Instalar App</span>
        <span className="inline sm:hidden">Instalar</span>
      </Button>
      <PwaInstallDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
