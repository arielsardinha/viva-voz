"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Zap,
  Cloud,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Wifi,
  WifiOff,
  Cpu,
  Key,
} from "lucide-react";
import { useFirebaseAI, type AIEngineType } from "@/hooks/useFirebaseAI";

interface AIEngineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeEngine: AIEngineType;
  isOnline: boolean;
  onDeviceStatus: "available" | "downloadable" | "unavailable" | "checking";
  defaultTab?: "nano" | "cloud";
}

export function AIEngineModal({
  open,
  onOpenChange,
  activeEngine,
  isOnline,
  onDeviceStatus,
  defaultTab = "nano",
}: AIEngineModalProps) {
  const { apiKey, setApiKey, refreshStatus } = useFirebaseAI();
  const [inputKey, setInputKey] = useState("");
  const [copiedFlag, setCopiedFlag] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  React.useEffect(() => {
    if (apiKey) {
      setInputKey(apiKey);
    }
  }, [apiKey, open]);

  const handleCopy = (text: string, flagId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFlag(flagId);
    setTimeout(() => setCopiedFlag(null), 2000);
  };

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    setApiKey(inputKey);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-w-lg max-h-[85dvh] flex flex-col p-0 overflow-hidden sm:rounded-xl"
        data-cy="ai-engine-modal"
      >
        <DialogHeader className="px-5 pt-5 pb-3 shrink-0 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-semibold">
                Motor de IA Híbrida VivaVoz
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Firebase AI Logic: Gemini Nano Local & Vertex AI Cloud (BYOK)
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Status do Motor Atual */}
          <div className="p-3.5 rounded-lg border bg-muted/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status Atual da IA
              </span>
              <div className="flex items-center gap-1.5 text-xs">
                {isOnline ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <Wifi className="h-3.5 w-3.5" /> Online
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                    <WifiOff className="h-3.5 w-3.5" /> Offline
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              {activeEngine === "gemini-nano" && (
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium text-sm">
                  <div className="p-1.5 rounded-md bg-amber-500/10">
                    <Zap className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-semibold leading-none">Gemini Nano (On-Device)</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Execução 100% local, privada e offline no seu navegador
                    </p>
                  </div>
                </div>
              )}

              {activeEngine === "vertex" && (
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium text-sm">
                  <div className="p-1.5 rounded-md bg-emerald-500/10">
                    <Cloud className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="font-semibold leading-none">Vertex AI (Cloud BYOK)</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Conectado via chave própria (Gemini 2.5 Flash na nuvem)
                    </p>
                  </div>
                </div>
              )}

              {activeEngine === "disconnected" && (
                <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm">
                  <div className="p-1.5 rounded-md bg-muted">
                    <Cpu className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold leading-none">Nenhum motor ativo</p>
                    <p className="text-xs mt-0.5">
                      Ative o Gemini Nano ou insira sua chave Cloud abaixo.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="nano" className="text-xs sm:text-sm gap-1.5" data-cy="tab-gemini-nano" data-testid="tab-gemini-nano">
                <Zap className="h-3.5 w-3.5" />
                Gemini Nano (Offline)
              </TabsTrigger>
              <TabsTrigger value="cloud" className="text-xs sm:text-sm gap-1.5" data-cy="tab-cloud-key" data-testid="tab-cloud-key">
                <Key className="h-3.5 w-3.5" />
                Chave Cloud (BYOK)
              </TabsTrigger>
            </TabsList>

            {/* Aba Gemini Nano */}
            <TabsContent value="nano" className="space-y-3 pt-3">
              <div className="text-xs text-muted-foreground space-y-1.5">
                <p className="font-medium text-foreground">
                  Como ativar o Gemini Nano no Google Chrome:
                </p>
                <p>
                  O Gemini Nano permite analisar documentos e responder perguntas mesmo sem conexão à internet.
                </p>
              </div>

              <div className="space-y-2">
                <div className="p-2.5 rounded-md border bg-background space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">Passo 1: Ativar Prompt API</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() =>
                        handleCopy("chrome://flags/#prompt-api-for-gemini-nano", "flag1")
                      }
                      data-cy="copy-flag-1"
                      data-testid="copy-flag-1"
                    >
                      {copiedFlag === "flag1" ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span className="ml-1">{copiedFlag === "flag1" ? "Copiado" : "Copiar"}</span>
                    </Button>
                  </div>
                  <code className="block p-1.5 bg-muted rounded text-[11px] select-all break-all">
                    chrome://flags/#prompt-api-for-gemini-nano
                  </code>
                  <p className="text-muted-foreground text-[11px]">
                    Defina como <strong>Enabled</strong>.
                  </p>
                </div>

                <div className="p-2.5 rounded-md border bg-background space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">
                      Passo 2: Ativar Optimization Guide
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() =>
                        handleCopy(
                          "chrome://flags/#optimization-guide-on-device-model",
                          "flag2",
                        )
                      }
                      data-cy="copy-flag-2"
                      data-testid="copy-flag-2"
                    >
                      {copiedFlag === "flag2" ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span className="ml-1">{copiedFlag === "flag2" ? "Copiado" : "Copiar"}</span>
                    </Button>
                  </div>
                  <code className="block p-1.5 bg-muted rounded text-[11px] select-all break-all">
                    chrome://flags/#optimization-guide-on-device-model
                  </code>
                  <p className="text-muted-foreground text-[11px]">
                    Defina como <strong>Enabled BypassPrefRequirement</strong> e reinicie o Chrome.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-muted-foreground">
                  Status no navegador:{" "}
                  <strong className="text-foreground">
                    {onDeviceStatus === "available"
                      ? "Disponível ✅"
                      : onDeviceStatus === "downloadable"
                      ? "Baixando modelo ⏳"
                      : "Não detectado ❌"}
                  </strong>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refreshStatus()}
                  className="h-7 text-xs"
                  data-cy="btn-recheck-nano"
                  data-testid="btn-recheck-nano"
                >
                  Verificar novamente
                </Button>
              </div>
            </TabsContent>

            {/* Aba Chave Cloud BYOK */}
            <TabsContent value="cloud" className="space-y-3 pt-3">
              <form
                onSubmit={handleSaveKey}
                className="space-y-3"
                data-webmcp-tool="saveVertexAPIKey"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="gemini-key-input" className="text-xs font-medium">
                    Chave de API Gemini / Vertex AI
                  </Label>
                  <Input
                    id="gemini-key-input"
                    name="apiKey"
                    type="password"
                    placeholder="AIzaSy..."
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    className="text-xs font-mono"
                    data-cy="input-cloud-key"
                    data-testid="input-cloud-key"
                    aria-label="Chave de API do Gemini ou Vertex AI"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Sua chave é armazenada exclusivamente na memória local do seu navegador (BYOK).
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Obter chave gratuita no Google AI Studio
                    <ExternalLink className="h-3 w-3" />
                  </a>

                  <Button
                    type="submit"
                    size="sm"
                    className="h-8 text-xs font-medium"
                    data-cy="btn-save-key"
                    data-testid="btn-save-key"
                  >
                    {savedSuccess ? "Salvo com sucesso!" : "Salvar Chave"}
                  </Button>
                </div>
              </form>

              <div className="p-2.5 rounded-md bg-muted/50 border text-xs text-muted-foreground flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>
                  O VivaVoz utiliza inferência híbrida via Firebase AI Logic. Quando estiver offline,
                  o sistema chaveará automaticamente para o Gemini Nano local.
                </span>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="px-5 py-3 shrink-0 border-t border-border/50 bg-muted/20 sm:justify-end pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto text-xs"
            data-cy="btn-close-modal"
            data-testid="btn-close-modal"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
