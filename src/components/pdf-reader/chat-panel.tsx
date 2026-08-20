"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { BotMessageSquare } from "lucide-react";
import { toast } from "sonner";
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
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import type { Sentence } from "@/lib/pdf-text";

const STORAGE_KEY = "gemini-api-key";

interface ChatPanelProps {
  sentences: Sentence[];
  fileName: string | null;
}

export function ChatPanel({ sentences, fileName }: ChatPanelProps) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isPhone = useMediaQuery("(max-width: 639px)");

  useEffect(() => {
    setApiKey(window.localStorage.getItem(STORAGE_KEY));
  }, []);

  const updateApiKey = useCallback((key: string | null) => {
    setApiKey(key);
    if (key) window.localStorage.setItem(STORAGE_KEY, key);
    else window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const context = useMemo(
    () => sentences.map((s) => `[p.${s.page}] ${s.text}`).join("\n"),
    [sentences],
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/ask",
        body: () => ({ context, fileName, userApiKey: apiKey }),
      }),
    [context, fileName, apiKey],
  );

  const { messages, sendMessage, status } = useChat({
    transport,
    onError: (error) => toast.error(error.message || "Não foi possível consultar a IA."),
  });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!isLoading) textareaRef.current?.focus();
  }, [isLoading]);

  const handleSubmit = ({ text }: { text?: string }) => {
    const value = (text ?? "").trim();
    if (!value || isLoading) return;
    setInput("");
    void sendMessage({ text: value });
  };

  const surface = (
    <>
      <div className="border-border flex items-center justify-between gap-2 border-b px-4 py-3 pr-10">
        <div className="flex items-center gap-2">
          <BotMessageSquare className="text-accent size-4" />
          <h2 className="text-sm font-semibold">Perguntar sobre o PDF</h2>
        </div>
        <GeminiKeyDialog apiKey={apiKey} onChange={updateApiKey} />
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
              const text = message.parts
                .map((part) => (part.type === "text" ? part.text : ""))
                .join("");
              return (
                <Message key={message.id} from={message.role}>
                  <MessageContent>
                    <MessageResponse>{text}</MessageResponse>
                  </MessageContent>
                </Message>
              );
            })
          )}
          {status === "submitted" ? <Shimmer>Pensando…</Shimmer> : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-border border-t p-3">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Pergunte algo sobre este documento…"
          />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} disabled={!input.trim() || isLoading} />
          </PromptInputFooter>
        </PromptInput>
        <p className="text-muted-foreground mt-2 text-[11px]">
          {apiKey
            ? "Usando sua conta Gemini (chave própria conectada)."
            : "Conecte sua conta do Google AI Studio para conversar com o documento."}
        </p>
      </div>
    </>
  );

  if (isDesktop) {
    return (
      <aside className="border-border bg-card flex h-[calc(100vh-8rem)] min-w-0 flex-col overflow-hidden rounded-xl border">
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
          className="bg-accent text-accent-foreground fixed right-4 bottom-4 z-40 inline-flex size-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          <BotMessageSquare className="size-6" />
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
