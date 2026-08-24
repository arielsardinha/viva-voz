"use client";

import {
  Cloud,
  HardDrive,
  Headphones,
  Smartphone,
  FolderLock,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface GoogleDriveBenefitsCardProps {
  variant?: "default" | "storage_alert";
  className?: string;
}

export function GoogleDriveBenefitsCard({
  variant = "default",
  className,
}: GoogleDriveBenefitsCardProps) {
  const isStorageAlert = variant === "storage_alert";

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 space-y-3 shadow-xs transition-all",
        isStorageAlert
          ? "border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/30"
          : "border-indigo-500/30 bg-indigo-500/10 dark:bg-indigo-950/40",
        className
      )}
    >
      {/* Topo: Mensagem de Destaque ou Alerta de Memória */}
      {isStorageAlert ? (
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <div className="flex size-7 items-center justify-center rounded-xl bg-amber-500 text-white shrink-0 mt-0.5 shadow-xs">
              <AlertTriangle className="size-4" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-950 dark:text-amber-200">
                Memória interna insuficiente no navegador
              </h4>
              <p className="text-[11px] text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
                O seu armazenamento local (IndexedDB) atingiu o limite de capacidade e não é possível abrir novos documentos diretamente na memória do dispositivo.
              </p>
            </div>
          </div>
          <p className="text-[11px] font-semibold text-amber-950 dark:text-amber-200 pl-10">
            Conecte sua conta do Google Drive para armazenar seus arquivos na nuvem e continuar seus estudos sem limites!
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <div className="flex size-7 items-center justify-center rounded-xl bg-indigo-500 text-white shrink-0 mt-0.5 shadow-xs">
            <Cloud className="size-4 fill-white" aria-hidden="true" />
          </div>
          <p className="text-xs font-semibold text-indigo-950 dark:text-indigo-200 leading-relaxed">
            Vantagens do Backup no Google Drive para seus estudos e leituras:
          </p>
        </div>
      )}

      {/* Lista Unificada de Benefícios */}
      <div
        className={cn(
          "border-t pt-2.5 space-y-2 text-[11px]",
          isStorageAlert
            ? "border-amber-500/20 text-amber-900/90 dark:text-amber-200/90"
            : "border-indigo-500/20 text-indigo-900/90 dark:text-indigo-200/90"
        )}
      >
        <div className="flex items-start gap-2">
          <HardDrive className="size-3.5 text-accent shrink-0 mt-0.5" />
          <span>
            <strong>Armazenamento Ilimitado em Nuvem:</strong> Guarde livros, PDFs, apostilas e notas sem lotar a memória do seu aparelho.
          </span>
        </div>

        <div className="flex items-start gap-2">
          <Headphones className="size-3.5 text-accent shrink-0 mt-0.5" />
          <span>
            <strong>Áudios Neurais Salvos (TTS):</strong> Seus pacotes de áudio sintetizado são guardados na nuvem para ouvir quando quiser.
          </span>
        </div>

        <div className="flex items-start gap-2">
          <Smartphone className="size-3.5 text-accent shrink-0 mt-0.5" />
          <span>
            <strong>Sincronização Multi-Dispositivo:</strong> Alterne entre celular, tablet e computador sem perder seu progresso.
          </span>
        </div>

        <div className="flex items-start gap-2">
          <FolderLock className="size-3.5 text-accent shrink-0 mt-0.5" />
          <span>
            <strong>Pasta Oculta & 100% Segura:</strong> Seus dados ficam salvos de forma isolada na área privada do seu Drive.
          </span>
        </div>

        <div className="flex items-start gap-2">
          <Sparkles className="size-3.5 text-accent shrink-0 mt-0.5" />
          <span>
            <strong>Chave de IA (BYOK) Sincronizada:</strong> Insira sua chave Gemini uma única vez e sincronize entre todos os seus dispositivos.
          </span>
        </div>
      </div>
    </div>
  );
}
