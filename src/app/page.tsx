import { Suspense } from "react";
import { PdfReader } from "@/components/pdf-reader/pdf-reader";

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="bg-background text-muted-foreground flex min-h-screen items-center justify-center">
          Carregando o leitor…
        </div>
      }
    >
      <PdfReader />
    </Suspense>
  );
}
