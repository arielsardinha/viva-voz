"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Download, FileText, Pencil, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "./app-header";
import {
  deleteReading,
  getReading,
  listReadings,
  updateReading,
  type ReadingSummary,
} from "@/lib/library-db";

function formatSize(bytes: number) {
  return bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function Library() {
  const [readings, setReadings] = useState<ReadingSummary[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setReadings(await listReadings());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveTitle = async (id: string) => {
    const next = draft.trim();
    setEditingId(null);
    if (!next) return;
    await updateReading(id, { title: next });
    await refresh();
    toast.success("Título atualizado.");
  };

  const remove = async (id: string) => {
    await deleteReading(id);
    await refresh();
    toast.success("Leitura removida do navegador.");
  };

  const download = async (id: string) => {
    const reading = await getReading(id);
    if (!reading) return;
    const url = URL.createObjectURL(reading.file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = reading.fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-background min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:py-8">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Outras leituras</h2>
          <p className="text-muted-foreground text-sm">
            Seus PDFs ficam salvos neste navegador (IndexedDB), com o arquivo original preservado.
          </p>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Carregando…</p>
        ) : readings.length === 0 ? (
          <div className="border-border bg-card rounded-2xl border border-dashed p-10 text-center">
            <p className="text-muted-foreground text-sm">
              Nenhuma leitura salva ainda. Envie um PDF no leitor para começar.
            </p>
            <Link
              href="/"
              className="bg-accent text-accent-foreground mt-4 inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold"
            >
              Ir para o leitor
            </Link>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {readings.map((reading) => (
              <li
                key={reading.id}
                className="border-border bg-card flex min-w-0 flex-col gap-3 rounded-xl border p-4"
              >
                <div className="flex min-w-0 items-start gap-2">
                  <FileText className="text-accent mt-0.5 size-4 shrink-0" />
                  {editingId === reading.id ? (
                    <div className="flex min-w-0 flex-1 items-center gap-1">
                      <input
                        autoFocus
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") void saveTitle(reading.id);
                          if (event.key === "Escape") setEditingId(null);
                        }}
                        aria-label="Título da leitura"
                        className="border-border bg-background min-w-0 flex-1 rounded-md border px-2 py-1 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => void saveTitle(reading.id)}
                        aria-label="Salvar título"
                        className="text-accent inline-flex size-8 shrink-0 items-center justify-center rounded-md"
                      >
                        <Check className="size-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="min-w-0 flex-1 truncate text-sm font-medium">{reading.title}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setDraft(reading.title);
                          setEditingId(reading.id);
                        }}
                        aria-label={`Editar título de ${reading.title}`}
                        className="text-muted-foreground hover:text-foreground inline-flex size-7 shrink-0 items-center justify-center rounded-md"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    </>
                  )}
                </div>

                <p className="text-muted-foreground truncate text-xs">
                  {reading.pageCount} página(s) · {formatSize(reading.size)} ·{" "}
                  {new Date(reading.updatedAt).toLocaleDateString("pt-BR")}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/?doc=${reading.id}`}
                    className="bg-accent text-accent-foreground inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
                  >
                    <Play className="size-3.5" /> Ouvir
                  </Link>
                  <button
                    type="button"
                    onClick={() => void download(reading.id)}
                    className="border-border text-foreground hover:bg-secondary inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs"
                  >
                    <Download className="size-3.5" /> PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(reading.id)}
                    aria-label={`Excluir ${reading.title}`}
                    className="text-muted-foreground hover:text-destructive ml-auto inline-flex size-8 items-center justify-center rounded-lg"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
