import { Suspense } from "react";
import type { Metadata } from "next";
import { Library } from "@/components/pdf-reader/library";

export const metadata: Metadata = {
  title: "Suas leituras salvas | Leitor de PDF em áudio",
  description:
    "Acesse os PDFs salvos no seu navegador, renomeie títulos, baixe o arquivo original e retome a narração de onde parou.",
  openGraph: {
    title: "Suas leituras salvas",
    description: "Biblioteca local de PDFs com narração em áudio, salva no próprio navegador.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function LeiturasPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-background text-muted-foreground flex min-h-screen items-center justify-center">
          Carregando suas leituras…
        </div>
      }
    >
      <Library />
    </Suspense>
  );
}
