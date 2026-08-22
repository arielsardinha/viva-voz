"use client";

import { useState, useRef } from "react";
import {
  Cloud,
  FileUp,
  Globe,
  Loader2,
  Sparkles,
  Type,
  Volume2,
} from "lucide-react";
import { QuickPasteDialog } from "./quick-paste-dialog";
import { WebUrlDialog } from "./web-url-dialog";
import type { ParsedDocument } from "@/lib/domain/document.types";
import { cn } from "@/lib/utils";

export interface PdfDropzoneProps {
  onFile?: (file: File) => void;
  onFiles?: (files: FileList | File[]) => void;
  onQuickPaste?: (title: string, text: string) => Promise<void>;
  onWebUrl?: (document: ParsedDocument) => void;
  isLoading: boolean;
  progress: string | null;
}

const SUPPORTED_FORMAT_BADGES = [
  { label: "PDF", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  { label: "EPUB", color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  { label: "DOCX", color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" },
  { label: "ODT", color: "bg-teal-500/10 text-teal-500 border-teal-500/20" },
  { label: "PPTX", color: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  { label: "TXT", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  { label: "MD", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  { label: "OCR (FOTO)", color: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20" },
  { label: "URL", color: "bg-sky-500/10 text-sky-500 border-sky-500/20" },
];

export function PdfDropzone({
  onFile,
  onFiles,
  onQuickPaste,
  onWebUrl,
  isLoading,
  progress,
}: PdfDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOver, setIsOver] = useState(false);
  const [isPasteOpen, setIsPasteOpen] = useState(false);
  const [isWebUrlOpen, setIsWebUrlOpen] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (onFiles) {
      onFiles(files);
    } else if (onFile && files[0]) {
      onFile(files[0]);
    }
  };

  return (
    <section
      aria-label="Área de Envio de Documentos PDF e Multi-Formatos"
      data-webmcp-tool="uploadDocument"
      data-webmcp-action="extract-sentences"
      data-webmcp-schema="multipart/form-data"
      className="space-y-6"
    >
      <div
        role="region"
        aria-label="Zona de soltar arquivos PDF e documentos"
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
          "relative overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-dashed border-border/80 bg-card/80 p-6 sm:p-12 text-center transition-all duration-300 shadow-xs glass-panel",
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
          multiple
          accept=".pdf,.epub,.docx,.odt,.pptx,.txt,.md,.markdown,.png,.jpg,.jpeg,.webp,application/pdf,application/epub+zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.oasis.opendocument.text,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/markdown,image/png,image/jpeg,image/webp,image/*"
          aria-label="Selecionar documento para leitura e narração"
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
          {isLoading ? "Processando e preparando narração…" : "Arraste seus documentos aqui ou selecione"}
        </h2>

        <p className="mx-auto mt-2 max-w-lg text-xs sm:text-sm text-muted-foreground">
          {progress ??
            "Converta livros, artigos, fotos e documentos (.pdf, .epub, .docx, .odt, .pptx, .txt, .md, .png, .jpg) em leitura em voz alta com IA."}
        </p>


        {/* Botões de Ação Principais */}
        <div className="mt-5 sm:mt-6 flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            disabled={isLoading}
            aria-controls="pdf-upload-input"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-60 cursor-pointer"
          >
            <FileUp className="size-4" aria-hidden="true" />
            <span>Selecionar Arquivo</span>
          </button>

          {onQuickPaste && (
            <button
              type="button"
              data-cy="quick-paste-btn"
              disabled={isLoading}
              onClick={() => setIsPasteOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/80 px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-foreground hover:bg-secondary transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Type className="size-4 text-accent" aria-hidden="true" />
              <span>Colar Texto</span>
            </button>
          )}

          {onWebUrl && (
            <button
              type="button"
              data-cy="web-url-btn"
              disabled={isLoading}
              onClick={() => setIsWebUrlOpen(true)}
              aria-label="Ler artigo da web a partir de uma URL"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/80 px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-foreground hover:bg-secondary transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Globe className="size-4 text-sky-500" aria-hidden="true" />
              <span>Ler Artigo da Web</span>
            </button>
          )}
        </div>

        {/* Badges dos Formatos Suportados */}
        <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
          {SUPPORTED_FORMAT_BADGES.map((b) => (
            <span
              key={b.label}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border",
                b.color
              )}
            >
              <span>{b.label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Feature Badges Clean (Inspiração 03) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-panel p-4 rounded-2xl flex items-center gap-3 border border-border/60">
          <div
            className="size-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <Volume2 className="size-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">Narração Fluida</h4>
            <p className="text-[11px] text-muted-foreground">Vozes neurais e controle de velocidade</p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl flex items-center gap-3 border border-border/60">
          <div
            className="size-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <Sparkles className="size-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">Assistente de Estudos</h4>
            <p className="text-[11px] text-muted-foreground">Resuma, tire dúvidas e explique trechos</p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl flex items-center gap-3 border border-border/60">
          <div
            className="size-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <Cloud className="size-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">100% Local & Seguro</h4>
            <p className="text-[11px] text-muted-foreground">Seus arquivos salvos no navegador (IndexedDB)</p>
          </div>
        </div>
      </div>

      {/* Diálogo de Colar Texto Rápido */}
      {onQuickPaste && (
        <QuickPasteDialog
          isOpen={isPasteOpen}
          onClose={() => setIsPasteOpen(false)}
          onSubmit={onQuickPaste}
          isLoading={isLoading}
        />
      )}

      {/* Diálogo de Leitura de Artigo da Web */}
      {onWebUrl && (
        <WebUrlDialog
          isOpen={isWebUrlOpen}
          onClose={() => setIsWebUrlOpen(false)}
          onSubmit={(doc) => {
            setIsWebUrlOpen(false);
            onWebUrl(doc);
          }}
        />
      )}
    </section>
  );
}
