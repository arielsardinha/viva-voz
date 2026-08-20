"use client";

import { FileUp, Loader2 } from "lucide-react";
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
    <div
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
        "rounded-2xl border-2 border-dashed border-border bg-card p-10 text-center transition-colors",
        isOver && "border-accent bg-accent/10",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        onChange={(event) => handleFiles(event.target.files)}
      />
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-accent/15 text-accent">
        {isLoading ? (
          <Loader2 className="size-7 animate-spin" />
        ) : (
          <FileUp className="size-7" aria-hidden />
        )}
      </div>
      <h2 className="mt-4 text-lg font-semibold text-foreground">
        {isLoading ? "Lendo o documento…" : "Envie um arquivo PDF"}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {progress ?? "Arraste o arquivo até aqui ou selecione no seu computador."}
      </p>
      <button
        type="button"
        disabled={isLoading}
        onClick={() => inputRef.current?.click()}
        className="mt-5 inline-flex items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        Selecionar PDF
      </button>
    </div>
  );
}
