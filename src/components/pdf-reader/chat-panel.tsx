"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BotMessageSquare } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { GeminiKeyDialog } from "./gemini-key-dialog";
import { ChromeAiBadge } from "./chrome-ai-badge";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import type { Sentence } from "@/lib/pdf-text";
import { useFirebaseAI } from "@/hooks/useFirebaseAI";

interface ChatPanelProps {
  sentences: Sentence[];
  fileName: string | null;
}

export function ChatPanel({ sentences, fileName }: ChatPanelProps) {
  const { messages, sendPrompt, isLoading, status, activeEngine, apiKey, setApiKey } = useFirebaseAI();
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isPhone = useMediaQuery("(max-width: 639px)");

  const context = useMemo(
    () => sentences.map((s) => `[p.${s.page}] ${s.text}`).join("\n"),
    [sentences],
  );

  useEffect(() => {
    if (!isLoading) textareaRef.current?.focus();
  }, [isLoading]);

  const handleSubmit = ({ text }: { text?: string }) => {
    const value = (text ?? "").trim();
    if (!value || isLoading) return;
    setInput("");
    void sendPrompt(value, { context, fileName });
  };

  const surface = (
    <section aria-label="Assistente de IA para análise do documento" className="flex flex-col h-full">
      <div className="border-border flex items-center justify-between gap-2 border-b px-4 py-3 pr-10">
        <div className="flex items-center gap-2">
          <BotMessageSquare className="text-accent size-4" aria-hidden="true" />
          <h2 className="text-sm font-semibold">Perguntar sobre o PDF</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <ChromeAiBadge hasCloudKey={Boolean(apiKey)} activeEngine={activeEngine} />
          {!apiKey && <GeminiKeyDialog apiKey={apiKey} onChange={(k) => setApiKey(k || "")} compact />}
        </div>
      </div>

      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="gap-4">
          {messages.length === 0 ? (
            <ConversationEmptyState
              title="Faça uma pergunta"
              description="Ex.: “Resuma o documento” ou “O que diz sobre prazos?”"
            />
          ) : (
            messages.map((message) => {
              const isAssistant = message.role === "assistant";
              return (
                <div key={message.id} className="flex flex-col gap-1">
                  <Message from={message.role}>
                    <MessageContent>
                      <MessageResponse>{message.content}</MessageResponse>
                    </MessageContent>
                  </Message>
                  <span className="text-[10px] text-muted-foreground px-2">
                    {isAssistant
                      ? `VivaVoz AI - ${message.source === "vertex" ? "vertex" : "nano"}`
                      : "Você"}
                  </span>
                </div>
              );
            })
          )}
          {status === "submitted" ? <Shimmer>Pensando…</Shimmer> : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-border border-t p-3">
        <PromptInput
          data-webmcp-tool="askDocumentAI"
          data-webmcp-action="queryPdfContext"
          onSubmit={handleSubmit}
        >
          <PromptInputTextarea
            ref={textareaRef}
            id="chat-prompt-textarea"
            name="userPrompt"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Pergunte algo sobre este documento…"
            aria-label="Mensagem ou pergunta sobre o documento PDF"
          />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit
              status={status === "idle" ? undefined : status}
              disabled={!input.trim() || isLoading}
              aria-label="Enviar pergunta para o assistente IA"
            />
          </PromptInputFooter>
        </PromptInput>
        <p className="text-muted-foreground mt-2 text-[11px]">
          Motor de IA Híbrida VivaVoz (On-Device & Nuvem com Firebase AI Logic).
        </p>
      </div>
    </section>
  );

  if (isDesktop) {
    return (
      <aside aria-label="Painel lateral do assistente IA" className="border-border bg-card flex h-[calc(100vh-8rem)] min-w-0 flex-col overflow-hidden rounded-xl border">
        {surface}
      </aside>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Perguntar para a IA sobre o PDF"
          className="bg-accent text-accent-foreground fixed right-4 bottom-4 z-40 inline-flex size-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
        >
          <BotMessageSquare className="size-6" aria-hidden="true" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className={cn(
          "bg-card flex flex-col gap-0 p-0",
          isPhone ? "inset-0 h-dvh rounded-none" : "h-[85dvh] rounded-t-2xl",
        )}
      >
        <SheetTitle className="sr-only">Perguntar sobre o PDF</SheetTitle>
        {surface}
      </SheetContent>
    </Sheet>
  );
}

