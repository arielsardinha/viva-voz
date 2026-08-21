"use client";

import { useState, useCallback, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  useReaderSettings,
  type ReaderTemplateId,
  type ReadingTheme,
  type ReadingFont,
} from "@/context/reader-settings-context";
import { savePreferences } from "@/lib/library-db";
import { cn } from "@/lib/utils";

import {
  TEMPLATE_CHOICES,
  THEME_CHOICES,
  SPEED_PRESETS,
  FONT_SIZE_PRESETS,
} from "./tutorial-steps/tutorial-constants";
import { StepWelcome } from "./tutorial-steps/step-welcome";
import { StepTemplate } from "./tutorial-steps/step-template";
import { StepTheme } from "./tutorial-steps/step-theme";
import { StepFont } from "./tutorial-steps/step-font";
import { StepSpeed } from "./tutorial-steps/step-speed";
import { StepSummary } from "./tutorial-steps/step-summary";

// Re-export constants for full backward compatibility
export { TEMPLATE_CHOICES, THEME_CHOICES, SPEED_PRESETS, FONT_SIZE_PRESETS };

interface PreferencesTutorialDialogProps {
  forceOpen?: boolean;
  onClose?: () => void;
  trigger?: React.ReactNode;
}

export function PreferencesTutorialDialog({
  forceOpen,
  onClose,
  trigger,
}: PreferencesTutorialDialogProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    settings,
    patchSettings,
    setTheme,
    isOnboardingOpen,
    openOnboarding,
    closeOnboarding,
  } = useReaderSettings();

  const open = forceOpen !== undefined ? forceOpen : isOnboardingOpen;

  const [step, setStep] = useState<number>(0);
  const [isPlayingTestVoice, setIsPlayingTestVoice] = useState(false);

  // Estados locais da jornada para permitir preview antes de finalizar ou com efeito imediato
  const [selectedTemplate, setSelectedTemplate] = useState<ReaderTemplateId>(settings.template);
  const [selectedTheme, setSelectedTheme] = useState<ReadingTheme>(settings.theme);
  const [selectedFont, setSelectedFont] = useState<ReadingFont>(settings.font);
  const [selectedFontSize, setSelectedFontSize] = useState<number>(settings.fontSize);
  const [selectedSpeed, setSelectedSpeed] = useState<number>(settings.speed ?? 1.0);

  // Vozes do sistema disponíveis
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        setAvailableVoices(voices);
      }
    };
    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Sincroniza com as configurações atuais quando o modal abre
  useEffect(() => {
    if (open) {
      setSelectedTemplate(settings.template);
      setSelectedTheme(settings.theme);
      setSelectedFont(settings.font);
      setSelectedFontSize(settings.fontSize);
      setSelectedSpeed(settings.speed ?? 1.0);
      setStep(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSkipAll = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingTestVoice(false);
    if (onClose) onClose();
    closeOnboarding(true);
  }, [onClose, closeOnboarding]);

  const handleFinishJourney = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingTestVoice(false);
    patchSettings({
      template: selectedTemplate,
      theme: selectedTheme,
      font: selectedFont,
      fontSize: selectedFontSize,
      speed: selectedSpeed,
      hasCompletedOnboarding: true,
    });
    setTheme(selectedTheme);
    void savePreferences({ speed: String(selectedSpeed) });
    if (onClose) onClose();
    closeOnboarding(true);
  }, [
    selectedTemplate,
    selectedTheme,
    selectedFont,
    selectedFontSize,
    selectedSpeed,
    patchSettings,
    setTheme,
    onClose,
    closeOnboarding,
  ]);

  const handleSelectTheme = (theme: ReadingTheme) => {
    setSelectedTheme(theme);
    setTheme(theme); // Aplica em tempo real para feedback imediato
  };

  const stopVoiceSample = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingTestVoice(false);
  }, []);

  const handlePlayVoiceSample = useCallback(
    (speedToPlay?: number) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

      const targetSpeed = speedToPlay ?? selectedSpeed;

      // Se já estiver tocando e o usuário clicou no botão para pausar
      if (isPlayingTestVoice && speedToPlay === undefined) {
        stopVoiceSample();
        return;
      }

      window.speechSynthesis.cancel();
      setIsPlayingTestVoice(false);

      try {
        const utterance = new SpeechSynthesisUtterance(
          `Demonstração em velocidade ${targetSpeed}x. VivaVoz pronto para ler e narrar seus documentos.`
        );

        const voices =
          availableVoices.length > 0
            ? availableVoices
            : window.speechSynthesis.getVoices();

        const ptVoice =
          voices.find(
            (v) =>
              v.lang === "pt-BR" ||
              v.lang.toLowerCase().replace(/_/g, "-") === "pt-br" ||
              v.lang.toLowerCase().startsWith("pt-br") ||
              v.lang.toLowerCase().includes("portuguese") ||
              v.lang.toLowerCase().startsWith("pt")
          ) || voices[0];

        if (ptVoice) {
          utterance.voice = ptVoice;
          utterance.lang = ptVoice.lang || "pt-BR";
        } else {
          utterance.lang = "pt-BR";
        }
        // Atribuição de rate OBRIGATORIAMENTE após a voz para evitar reset de taxa pelo Chromium
        utterance.rate = Number(targetSpeed) || 1.0;

        utterance.onstart = () => setIsPlayingTestVoice(true);
        utterance.onend = () => setIsPlayingTestVoice(false);
        utterance.onerror = () => setIsPlayingTestVoice(false);

        window.speechSynthesis.speak(utterance);
      } catch {
        setIsPlayingTestVoice(false);
      }
    },
    [availableVoices, isPlayingTestVoice, selectedSpeed, stopVoiceSample]
  );

  const handleSelectSpeed = (speedValue: number) => {
    setSelectedSpeed(speedValue);
    patchSettings({ speed: speedValue });
    void savePreferences({ speed: String(speedValue) });
    // Se a demonstração estiver em execução, reinicia instantaneamente na velocidade nova
    if (isPlayingTestVoice) {
      handlePlayVoiceSample(speedValue);
    }
  };

  // Interrompe o áudio ao sair da etapa 4
  useEffect(() => {
    if (step !== 4 && isPlayingTestVoice) {
      stopVoiceSample();
    }
  }, [step, isPlayingTestVoice, stopVoiceSample]);

  if (!mounted) return null;

  return (
    <Dialog
      open={Boolean(open)}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) closeOnboarding(true);
        else openOnboarding();
      }}
    >
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        data-cy="onboarding-dialog"
        data-testid="onboarding-dialog"
        data-webmcp-tool="configureReaderPreferences"
        data-webmcp-action="saveSettings"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="w-[calc(100%-1.25rem)] xs:w-[calc(100%-2rem)] max-w-2xl sm:max-w-3xl p-0 overflow-hidden border-border/80 bg-background/95 backdrop-blur-xl shadow-2xl rounded-2xl sm:rounded-3xl flex flex-col max-h-[88dvh] sm:max-h-[85vh] my-auto"
      >
        {/* Cabeçalho do Modal com Barra de Progresso */}
        <div className="shrink-0 border-b border-border/60 bg-secondary/30 px-4 sm:px-6 pt-4 sm:pt-5 pb-3.5 sm:pb-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-md shadow-accent/20">
                <Sparkles className="size-3.5 sm:size-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-accent truncate block">
                  {step === 0
                    ? "Bem-vindo ao VivaVoz"
                    : `Jornada de Preferências • Etapa ${step} de 5`}
                </span>
                <DialogTitle className="text-sm sm:text-lg font-bold text-foreground truncate">
                  {step === 0 && "Personalize sua experiência de leitura"}
                  {step === 1 && "Escolha seu Modo de Leitura Favorito"}
                  {step === 2 && "Selecione o Ambiente & Tema Visual"}
                  {step === 3 && "Ajuste a Tipografia & Conforto Visual"}
                  {step === 4 && "Configure a Velocidade de Narração"}
                  {step === 5 && "Tudo Pronto! Resumo da sua Jornada"}
                </DialogTitle>
              </div>
            </div>

            {/* Botão de Pular no topo */}
            <button
              type="button"
              onClick={handleSkipAll}
              data-cy="skip-onboarding-top-btn"
              data-testid="skip-onboarding-top-btn"
              className="shrink-0 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg hover:bg-secondary/80 flex items-center gap-1 cursor-pointer"
            >
              <span className="hidden xs:inline">Pular tudo</span>
              <span className="inline xs:hidden">Pular</span>
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </div>

          {/* Indicador de passos (visível da etapa 1 em diante) */}
          {step > 0 && (
            <div className="mt-3 sm:mt-4 flex items-center gap-1 sm:gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  onClick={() => setStep(s)}
                  className={cn(
                    "h-1.5 flex-1 rounded-full cursor-pointer transition-all duration-300",
                    step >= s ? "bg-accent" : "bg-border/60"
                  )}
                  title={`Ir para etapa ${s}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Corpo do Conteúdo por Etapa */}
        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3 sm:p-7 pb-5 sm:pb-7">
          {step === 0 && <StepWelcome onStart={() => setStep(1)} />}

          {step === 1 && (
            <StepTemplate
              selectedTemplate={selectedTemplate}
              onSelectTemplate={setSelectedTemplate}
            />
          )}

          {step === 2 && (
            <StepTheme
              selectedTheme={selectedTheme}
              onSelectTheme={handleSelectTheme}
            />
          )}

          {step === 3 && (
            <StepFont
              selectedFont={selectedFont}
              onSelectFont={setSelectedFont}
              selectedFontSize={selectedFontSize}
              onSelectFontSize={setSelectedFontSize}
            />
          )}

          {step === 4 && (
            <StepSpeed
              selectedSpeed={selectedSpeed}
              onSelectSpeed={handleSelectSpeed}
              isPlayingTestVoice={isPlayingTestVoice}
              onPlayVoiceSample={handlePlayVoiceSample}
            />
          )}

          {step === 5 && (
            <StepSummary
              selectedTemplate={selectedTemplate}
              selectedTheme={selectedTheme}
              selectedFont={selectedFont}
              selectedFontSize={selectedFontSize}
              selectedSpeed={selectedSpeed}
            />
          )}
        </div>

        {/* Rodapé de Navegação da Jornada com Safe-Area e espaçamento inferior */}
        {step > 0 && (
          <div className="shrink-0 border-t border-border/60 bg-secondary/30 px-3.5 sm:px-6 py-3 sm:py-4 pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))] flex items-center justify-between gap-1.5 sm:gap-3">
            <Button
              type="button"
              data-cy="prev-step-btn"
              data-testid="prev-step-btn"
              variant="outline"
              onClick={() => setStep((curr) => Math.max(0, curr - 1))}
              className="gap-1 sm:gap-1.5 rounded-xl border-border/80 bg-background text-xs font-semibold px-2.5 sm:px-4 py-2 shrink-0 cursor-pointer"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              <span>{step === 1 ? "Voltar ao início" : "Voltar"}</span>
            </Button>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <Button
                type="button"
                data-cy="skip-onboarding-bottom-btn"
                data-testid="skip-onboarding-bottom-btn"
                variant="ghost"
                onClick={handleSkipAll}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground px-2 sm:px-3 shrink-0 cursor-pointer"
              >
                Pular tudo
              </Button>

              {step < 5 ? (
                <Button
                  type="button"
                  data-cy="next-step-btn"
                  data-testid="next-step-btn"
                  onClick={() => setStep((curr) => curr + 1)}
                  className="gap-1 sm:gap-1.5 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 text-xs font-bold shadow-md shadow-accent/20 px-3 sm:px-4 shrink-0 cursor-pointer"
                >
                  <span>Próximo</span>
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
              ) : (
                <Button
                  type="button"
                  data-cy="finish-onboarding-btn"
                  data-testid="finish-onboarding-btn"
                  onClick={handleFinishJourney}
                  className="gap-1.5 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 text-xs font-bold shadow-lg shadow-accent/25 px-3.5 sm:px-5 shrink-0 cursor-pointer"
                >
                  <Zap className="size-4" aria-hidden="true" />
                  <span className="hidden xs:inline">Concluir e Começar</span>
                  <span className="inline xs:hidden">Concluir</span>
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
