"use client";

import { useEffect, useRef, useState } from "react";
import {
  AudioLines,
  ChevronDown,
  Cpu,
  DownloadCloud,
  ImagePlus,
  Mic,
  Square,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocalAi } from "@/context/local-ai-context";
import { encodeFloat32PcmToWavBlob } from "@/lib/local-ai/domain/pcm-wav-encoder";
import type {
  ChatAttachment,
  ChatEnginePreference,
} from "@/lib/local-ai/domain/local-model.types";
import type { AIEngineType } from "@/hooks/useFirebaseAI";
import { cn } from "@/lib/utils";

interface ChatMultimodalBarProps {
  attachments: ChatAttachment[];
  onAddAttachment: (attachment: ChatAttachment) => void;
  onRemoveAttachment: (id: string) => void;
  activeEngine: AIEngineType;
  disabled?: boolean;
}

const PREF_LABELS: Record<ChatEnginePreference, string> = {
  auto: "Automático",
  cloud: "Gemini Nuvem",
  "litert-lm": "Gemma 4 Local",
  "gemini-nano": "Gemini Nano",
};

async function normalizeAudioToWavIfNeeded(blob: Blob): Promise<{
  blob: Blob;
  mimeType: string;
}> {
  if (
    blob.type === "audio/wav" ||
    blob.type === "audio/mpeg" ||
    blob.type === "audio/flac"
  ) {
    return { blob, mimeType: blob.type };
  }
  if (typeof AudioContext === "undefined") {
    return { blob, mimeType: blob.type || "audio/wav" };
  }
  try {
    const ctx = new AudioContext();
    try {
      const arrayBuf = await blob.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arrayBuf);
      const channelData = decoded.getChannelData(0);
      const wavBlob = encodeFloat32PcmToWavBlob(
        channelData,
        decoded.sampleRate || 16000,
      );
      return { blob: wavBlob, mimeType: "audio/wav" };
    } finally {
      await ctx.close().catch(() => undefined);
    }
  } catch {
    return { blob, mimeType: blob.type || "audio/wav" };
  }
}

export function ChatMultimodalBar({
  attachments,
  onAddAttachment,
  onRemoveAttachment,
  activeEngine,
  disabled = false,
}: ChatMultimodalBarProps) {
  const {
    preferredChatEngine,
    setPreferredChatEngine,
    isModelReady,
    openDrawer,
  } = useLocalAi();
  const gemmaReady = isModelReady("gemma-4-e2b-chat");

  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleSelectEnginePref = (value: string) => {
    const next = value as ChatEnginePreference;
    if (next === "litert-lm" && !gemmaReady) {
      openDrawer("gemma-4-e2b-chat");
      toast.info(
        "Baixe o modelo Gemma 4 E2B (~1,87 GB) para conversar com texto, imagem e áudio offline.",
      );
      return;
    }
    setPreferredChatEngine(next);
  };

  const handleImageFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file) return;
    const previewUrl =
      typeof URL !== "undefined" && typeof URL.createObjectURL === "function"
        ? URL.createObjectURL(file)
        : undefined;
    onAddAttachment({
      id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: "image",
      file,
      name: file.name,
      mimeType: file.type || "image/png",
      previewUrl,
    });
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleAudioFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file) return;
    const normalized = await normalizeAudioToWavIfNeeded(file);
    onAddAttachment({
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: "audio",
      file: normalized.blob,
      name: file.name,
      mimeType: normalized.mimeType,
    });
    if (audioInputRef.current) audioInputRef.current.value = "";
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      toast.error(
        "Gravação de áudio não está disponível neste navegador. Você pode enviar um arquivo WAV ou MP3.",
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
        const rawBlob = new Blob(chunks, {
          type: recorder.mimeType || "audio/webm",
        });
        void normalizeAudioToWavIfNeeded(rawBlob).then(({ blob, mimeType }) => {
          onAddAttachment({
            id: `rec-${Date.now()}`,
            type: "audio",
            file: blob,
            name: "gravacao-voz.wav",
            mimeType,
          });
        });
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      toast.error(
        "Não foi possível acessar o microfone. Verifique as permissões do navegador.",
      );
    }
  };

  const triggerLabel =
    preferredChatEngine === "auto"
      ? activeEngine === "litert-lm"
        ? "Gemma 4 Local"
        : "Auto"
      : PREF_LABELS[preferredChatEngine];

  return (
    <div className="space-y-1.5">
      {attachments.length > 0 && (
        <div
          data-cy="chat-attachments-preview"
          className="flex flex-wrap items-center gap-1.5"
        >
          {attachments.map((att) => (
            <div
              key={att.id}
              data-cy={`chat-attachment-chip-${att.type}`}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-secondary/70 px-2 py-1 text-[11px] text-foreground max-w-full"
            >
              {att.type === "image" && att.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={att.previewUrl}
                  alt={att.name}
                  className="size-5 rounded object-cover shrink-0"
                />
              ) : (
                <AudioLines
                  className="size-3.5 text-accent shrink-0"
                  aria-hidden="true"
                />
              )}
              <span className="truncate max-w-[120px]">{att.name}</span>
              <button
                type="button"
                aria-label={`Remover anexo ${att.name}`}
                onClick={() => {
                  if (att.previewUrl) URL.revokeObjectURL(att.previewUrl);
                  onRemoveAttachment(att.id);
                }}
                className="rounded-full p-0.5 text-muted-foreground hover:text-foreground hover:bg-background cursor-pointer"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex items-center gap-1">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            className="sr-only"
            aria-label="Selecionar imagem para o chat"
            onChange={(e) => handleImageFiles(e.target.files)}
          />
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/wav,audio/mpeg,audio/mp3,audio/flac,audio/ogg,audio/webm"
            className="sr-only"
            aria-label="Selecionar arquivo de áudio para o chat"
            onChange={(e) => void handleAudioFiles(e.target.files)}
          />

          <button
            type="button"
            data-cy="chat-attach-image-btn"
            disabled={disabled}
            onClick={() => imageInputRef.current?.click()}
            title="Anexar imagem (Gemma 4 Multimodal)"
            aria-label="Anexar imagem"
            className="inline-flex size-7 items-center justify-center rounded-lg border border-border/70 bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-40 cursor-pointer"
          >
            <ImagePlus className="size-3.5" aria-hidden="true" />
          </button>

          <button
            type="button"
            data-cy="chat-attach-audio-btn"
            disabled={disabled}
            onClick={() => audioInputRef.current?.click()}
            title="Anexar áudio (Gemma 4 Multimodal)"
            aria-label="Anexar arquivo de áudio"
            className="inline-flex size-7 items-center justify-center rounded-lg border border-border/70 bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-40 cursor-pointer"
          >
            <AudioLines className="size-3.5" aria-hidden="true" />
          </button>

          <button
            type="button"
            data-cy="chat-record-audio-btn"
            disabled={disabled}
            onClick={() => void toggleRecording()}
            title={
              isRecording ? "Parar gravação" : "Gravar áudio pelo microfone"
            }
            aria-label={
              isRecording
                ? "Parar gravação de áudio"
                : "Gravar pergunta por áudio"
            }
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-[11px] font-medium transition-colors disabled:opacity-40 cursor-pointer",
              isRecording
                ? "border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-300"
                : "border-border/70 bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary",
            )}
          >
            {isRecording ? (
              <>
                <Square className="size-3 fill-current" aria-hidden="true" />
                <span>Parar</span>
              </>
            ) : (
              <Mic className="size-3.5" aria-hidden="true" />
            )}
          </button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              data-cy="chat-engine-selector"
              aria-label="Selecionar motor de IA do chat"
              className="inline-flex h-7 items-center gap-1 rounded-lg border border-border/70 bg-secondary/60 px-2 text-[11px] font-medium text-foreground hover:bg-secondary cursor-pointer"
            >
              <Cpu className="size-3 text-accent shrink-0" aria-hidden="true" />
              <span className="truncate max-w-[115px]">{triggerLabel}</span>
              <ChevronDown
                className="size-3 text-muted-foreground shrink-0"
                aria-hidden="true"
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 glass-panel">
            <DropdownMenuLabel className="text-xs">
              Motor do Assistente
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={preferredChatEngine}
              onValueChange={handleSelectEnginePref}
            >
              <DropdownMenuRadioItem value="auto" className="text-xs cursor-pointer">
                <div className="flex flex-col">
                  <span>Automático</span>
                  <span className="text-[10px] text-muted-foreground">
                    Usa nuvem (BYOK) ou IA local disponível
                  </span>
                </div>
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="litert-lm" className="text-xs cursor-pointer">
                <div className="flex flex-col flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span>Gemma 4 Local</span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                        gemmaReady
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          : "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                      )}
                    >
                      {gemmaReady ? "Pronto" : "Baixar"}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    Texto, imagem e áudio offline
                  </span>
                </div>
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="cloud" className="text-xs cursor-pointer">
                <div className="flex flex-col">
                  <span>Gemini Nuvem (BYOK)</span>
                  <span className="text-[10px] text-muted-foreground">
                    Requer chave conectada
                  </span>
                </div>
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem
                value="gemini-nano"
                className="text-xs cursor-pointer"
              >
                <div className="flex flex-col">
                  <span>Gemini Nano (Chrome)</span>
                  <span className="text-[10px] text-muted-foreground">
                    IA embutida no Chrome desktop
                  </span>
                </div>
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => openDrawer("gemma-4-e2b-chat")}
              className="text-xs flex items-center gap-1.5 cursor-pointer font-medium text-accent"
            >
              <DownloadCloud className="size-3.5" aria-hidden="true" />
              <span>Gerenciar Gemma 4 Offline</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
