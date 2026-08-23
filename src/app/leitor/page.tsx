import { Suspense } from "react";
import type { Metadata } from "next";
import { PdfReader } from "@/components/pdf-reader/pdf-reader";

export const metadata: Metadata = {
  title: "Leitor de Documentos em Áudio | VivaVoz",
  description:
    "Faça upload de PDFs, livros e documentos, acompanhe a narração em áudio neural em tempo real e faça perguntas ao assistente de IA Gemini.",
  openGraph: {
    title: "Leitor de Documentos em Áudio | VivaVoz",
    description:
      "Leitor inteligente com sincronização visual de sentenças e síntese de voz em português.",
    type: "website",
  },
};

export default function LeitorPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-background text-muted-foreground flex min-h-screen items-center justify-center">
          Carregando o leitor de documentos…
        </div>
      }
    >
      <PdfReader />
    </Suspense>
  );
}
