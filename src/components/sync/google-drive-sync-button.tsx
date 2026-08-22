"use client";

import { useState } from "react";
import { Cloud, CloudCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoogleDriveSyncModal } from "./google-drive-sync-modal";
import { useGoogleDriveSync } from "@/hooks/use-google-drive-sync";
import { cn } from "@/lib/utils";

interface GoogleDriveSyncButtonProps {
  className?: string;
  variant?: "ghost" | "outline" | "default" | "secondary";
  showLabel?: boolean;
}

export function GoogleDriveSyncButton({
  className,
  variant = "ghost",
  showLabel = false,
}: GoogleDriveSyncButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const { status, isSyncing, isLoading } = useGoogleDriveSync();

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={showLabel ? "sm" : "icon"}
        onClick={() => setModalOpen(true)}
        aria-label="Backup e Sincronização no Google Drive"
        data-cy="google-drive-sync-btn"
        className={cn(
          "relative rounded-xl transition-all duration-200",
          status.isConnected && "text-emerald-500 hover:text-emerald-400",
          className
        )}
      >
        {isLoading ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : isSyncing ? (
          <Loader2 className="size-4 animate-spin text-accent" />
        ) : status.isConnected ? (
          <CloudCheck className="size-4 text-emerald-500" />
        ) : (
          <Cloud className="size-4 text-muted-foreground" />
        )}

        {status.isConnected && !isLoading && !isSyncing && (
          <span
            aria-hidden="true"
            className="absolute top-1.5 right-1.5 size-2 rounded-full bg-emerald-500 ring-2 ring-background"
          />
        )}

        {showLabel && (
          <span className="ml-1.5 text-xs font-semibold">
            {status.isConnected ? "Nuvem Conectada" : "Backup em Nuvem"}
          </span>
        )}
      </Button>

      <GoogleDriveSyncModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
