"use client";

import { Cloud, FileUp, Loader2, Sparkles, Volume2 } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface PdfDropzoneProps {
  onFile: (file: File) => void;
  isLoading: boolean;
  progress: string | null;
}

export function PdfDropzone({ onFile, isLoading, progress }: PdfDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOver, setIsOver] = useState(false);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFile(file);
  };

  return (
    <section
      aria-label="Área de Envio de Documentos PDF"
      data-webmcp-tool="uploadPdf"
      data-webmcp-action="extract-sentences"
      data-webmcp-schema="application/pdf"
      className="space-y-6"
    >
      <div
        role="region"
        aria-label="Zona de soltar arquivos PDF"
        onDragOver={(event) => {
          event.preventDefault();
          setIsOver(true);
        }}
        onDragLeave={() => setIsOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsOver(false);
          handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          "relative overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-dashed border-border/80 bg-card/80 p-6 sm:p-14 text-center transition-all duration-300 shadow-xs glass-panel",
          isOver
            ? "border-accent bg-accent/10 scale-[1.01] ring-4 ring-accent/20"
            : "hover:border-accent/60 hover:bg-card"
        )}
      >
        <input
          ref={inputRef}
          id="pdf-upload-input"
          name="pdfFile"
          type="file"
          accept="application/pdf,.pdf"
          aria-label="Selecionar arquivo PDF para leitura e narração"
          className="sr-only"
          onChange={(event) => handleFiles(event.target.files)}
        />

        {/* Ícone com gradiente */}
        <div className="mx-auto flex size-12 sm:size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-primary/10 text-accent shadow-xs">
          {isLoading ? (
            <Loader2 className="size-6 sm:size-8 animate-spin" aria-hidden="true" />
          ) : (
            <Cloud className="size-6 sm:size-8 stroke-[1.5]" aria-hidden="true" />
          )}
        </div>

        <h2 className="mt-4 sm:mt-5 text-lg sm:text-2xl font-bold tracking-tight text-foreground">
          {isLoading ? "Processando e preparando narração…" : "Arraste seu PDF aqui ou selecione"}
        </h2>

        <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm text-muted-foreground">
          {progress ?? "Converta livros, artigos e apostilas em leitura em voz alta com IA e visualização sincronizada."}
        </p>

        <button
          type="button"
          disabled={isLoading}
          aria-controls="pdf-upload-input"
          onClick={() => inputRef.current?.click()}
          className="mt-5 sm:mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-60 cursor-pointer"
        >
          <FileUp className="size-4" aria-hidden="true" />
          <span>Escolher arquivo PDF</span>
        </button>
      </div>

      {/* Feature Badges Clean */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-panel p-4 rounded-2xl flex items-center gap-3 border border-border/60">
          <div className="size-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0" aria-hidden="true">
            <Volume2 className="size-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">Narração Fluida</h4>
            <p className="text-[11px] text-muted-foreground">Vozes neurais e controle de velocidade</p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl flex items-center gap-3 border border-border/60">
          <div className="size-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0" aria-hidden="true">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">Assistente de Estudos</h4>
            <p className="text-[11px] text-muted-foreground">Resuma, tire dúvidas e explique trechos</p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl flex items-center gap-3 border border-border/60">
          <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0" aria-hidden="true">
            <Cloud className="size-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">100% Local & Seguro</h4>
            <p className="text-[11px] text-muted-foreground">Seus arquivos salvos no navegador</p>
          </div>
        </div>
      </div>
    </section>
  );
}

