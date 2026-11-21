"use client";

import { useSearchParams } from "next/navigation";
import { Cpu, HardDrive, ShieldCheck, WifiOff } from "lucide-react";
import { AppHeader } from "@/components/pdf-reader/app-header";
import { formatBytes } from "@/lib/local-ai/domain/local-model-catalog";
import type { LocalModelId } from "@/lib/local-ai/domain/local-model.types";
import { useLocalAiModels } from "@/hooks/use-local-ai-models";
import { LocalModelCard } from "./local-model-card";

export function LocalModelsView() {
  const searchParams = useSearchParams();
  const requestedModel = searchParams.get("model") as LocalModelId | null;

  const {
    descriptors,
    models,
    runtimeSupport,
    storageEstimate,
    totalLocalModelsBytes,
    startDownload,
    cancelDownload,
    deleteModel,
    activateModelInReader,
    getBlockingModel,
  } = useLocalAiModels();

  return (
    <div className="min-h-screen bg-background transition-colors pb-14">
      <AppHeader />

      <main className="mx-auto max-w-5xl px-3 sm:px-6 py-5 sm:py-8 space-y-6">
        <section
          aria-label="Central de Modelos de IA Local"
          className="glass-panel rounded-2xl sm:rounded-3xl border border-border/80 p-4 sm:p-6 shadow-xs space-y-4"
        >
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-accent to-indigo-500 text-accent-foreground shadow-md shadow-accent/20">
              <Cpu className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight text-foreground">
                Modelos de IA Local (Offline)
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
                Baixe os motores LiteRT-LM para narrar documentos em Português do Brasil e conversar com texto, imagem e áudio diretamente no seu navegador — sem chave de API.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="rounded-xl border border-border/70 bg-secondary/40 px-3 py-2.5 flex items-center gap-2.5">
              <Cpu className="size-4 text-accent shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">Aceleração WebGPU</p>
                <p className="font-semibold text-foreground truncate">
                  {runtimeSupport.webGpuSupported
                    ? "Ativa no navegador"
                    : "Indisponível (usa CPU/WASM)"}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-secondary/40 px-3 py-2.5 flex items-center gap-2.5">
              <HardDrive className="size-4 text-accent shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">Modelos em cache local</p>
                <p className="font-semibold text-foreground truncate">
                  {formatBytes(totalLocalModelsBytes)}
                  {storageEstimate?.quotaBytes
                    ? ` de ${formatBytes(storageEstimate.quotaBytes)}`
                    : ""}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-secondary/40 px-3 py-2.5 flex items-center gap-2.5">
              <ShieldCheck className="size-4 text-emerald-500 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">Privacidade & Offline</p>
                <p className="font-semibold text-foreground truncate">
                  100% no seu dispositivo
                </p>
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Catálogo de modelos disponíveis">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {descriptors.map((descriptor) => (
              <LocalModelCard
                key={descriptor.id}
                descriptor={descriptor}
                state={models[descriptor.id]}
                runtimeSupport={runtimeSupport}
                isHighlighted={requestedModel === descriptor.id}
                blockedBy={getBlockingModel(descriptor.id)}
                onDownload={(id) => void startDownload(id)}
                onCancel={cancelDownload}
                onDelete={(id) => void deleteModel(id)}
                onActivate={(id) => void activateModelInReader(id)}
              />
            ))}
          </div>
        </section>

        <section
          aria-label="Como funcionam os modelos locais"
          className="glass-panel rounded-2xl border border-border/80 p-4 sm:p-5 space-y-2.5 text-xs text-muted-foreground"
        >
          <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
            <WifiOff className="size-4 text-accent shrink-0" aria-hidden="true" />
            <h2>Dicas de uso offline e armazenamento</h2>
          </div>
          <p className="leading-relaxed">
            Os arquivos <code className="px-1 py-0.5 rounded bg-secondary text-foreground">.litertlm</code> são salvos no armazenamento persistente do navegador (Cache API) e continuam sendo baixados em segundo plano mesmo se você voltar para o Leitor ou abrir a Biblioteca.
          </p>
          <p className="leading-relaxed">
            Você pode remover qualquer modelo a qualquer momento para liberar espaço no dispositivo sem apagar os seus documentos salvos.
          </p>
        </section>
      </main>
    </div>
  );
}
