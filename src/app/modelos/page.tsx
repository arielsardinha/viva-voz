import { Suspense } from "react";
import type { Metadata } from "next";
import { LocalModelsView } from "@/components/local-ai/local-models-view";

export const metadata: Metadata = {
  title: "Modelos de IA Local (Offline) | VivaVoz",
  description:
    "Baixe e gerencie modelos de voz neural (Kokoro 82M e vozes Piper) e chat multimodal (Gemma 4 E2B) para usar o VivaVoz 100% offline no navegador.",
  openGraph: {
    title: "Modelos de IA Local — VivaVoz",
    description:
      "Narração em voz neural PT-BR e assistente multimodal offline no navegador via LiteRT-LM.",
    type: "website",
  },
};

export default function ModelosPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-background text-muted-foreground flex min-h-screen items-center justify-center text-sm">
          Carregando central de modelos locais…
        </div>
      }
    >
      <LocalModelsView />
    </Suspense>
  );
}
