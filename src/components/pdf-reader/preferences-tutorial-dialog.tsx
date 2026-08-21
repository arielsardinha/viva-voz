"use client";

import { useState, useCallback, useEffect } from "react";
import {
  AudioLines,
  BookOpen,
  Bot,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  Headphones,
  Moon,
  Sparkles,
  Sun,
  Type,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  useReaderSettings,
  READING_FONTS,
  type ReaderTemplateId,
  type ReadingTheme,
  type ReadingFont,
} from "@/context/reader-settings-context";
import { savePreferences } from "@/lib/library-db";
import { cn } from "@/lib/utils";

interface PreferencesTutorialDialogProps {
  forceOpen?: boolean;
  onClose?: () => void;
  trigger?: React.ReactNode;
}

export const TEMPLATE_CHOICES: {
  id: ReaderTemplateId;
  title: string;
  badge: string;
  description: string;
  features: string[];
  icon: typeof Compass;
}[] = [
  {
    id: "modern",
    title: "Estúdio Moderno",
    badge: "Mais Popular",
    description: "Leitor minimalista com dock flutuante, waveform interativa e controles dinâmicos.",
    features: ["Player dock flutuante", "Waveform de áudio", "Foco visual em sentença"],
    icon: Compass,
  },
  {
    id: "ai-study",
    title: "Assistente IA & Estudos",
    badge: "Produtividade",
    description: "Split-view integrado com IA para tirar dúvidas, resumir trechos e gerar insights.",
    features: ["Chat inteligente Gemini", "Resumos e explicações", "Visualização lado a lado"],
    icon: Bot,
  },
  {
    id: "zen",
    title: "Modo Zen Imersivo",
    badge: "Foco Total",
    description: "Experiência de leitura contínua e sem distrações com gerador de som ambiente.",
    features: ["Interface ultra limpa", "Sons de chuva/café/floresta", "Ritmo de leitura fluido"],
    icon: BookOpen,
  },
];

export const THEME_CHOICES: {
  id: ReadingTheme;
  title: string;
  description: string;
  bgPreview: string;
  textPreview: string;
  icon: typeof Sun;
}[] = [
  {
    id: "light",
    title: "Clean (Claro)",
    description: "Fundo branco com contraste perfeito para ambientes bem iluminados.",
    bgPreview: "bg-white border-slate-200",
    textPreview: "text-slate-900",
    icon: Sun,
  },
  {
    id: "sepia",
    title: "Papel Zen (Sépia)",
    description: "Tons quentes de papel envelhecido que reduzem a fadiga visual.",
    bgPreview: "bg-[#FBF0D9] border-amber-300",
    textPreview: "text-[#433422]",
    icon: Sparkles,
  },
  {
    id: "dark",
    title: "Midnight (Escuro)",
    description: "Tema escuro relaxante ideal para leituras noturnas.",
    bgPreview: "bg-[#090D16] border-slate-800",
    textPreview: "text-slate-100",
    icon: Moon,
  },
];

export const SPEED_PRESETS = [
  { label: "0.8x", value: 0.8, desc: "Pausado" },
  { label: "1.0x", value: 1.0, desc: "Padrão" },
  { label: "1.25x", value: 1.25, desc: "Dinâmico" },
  { label: "1.5x", value: 1.5, desc: "Rápido" },
];

export const FONT_SIZE_PRESETS = [
  { label: "Padrão", size: 16 },
  { label: "Confortável", size: 18 },
  { label: "Ampliado", size: 20 },
  { label: "Grande", size: 22 },
];

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
    isInitialized,
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

  const handlePlayVoiceSample = useCallback((speedToPlay?: number) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const targetSpeed = speedToPlay ?? selectedSpeed;

    // Se já estiver tocando e o usuário clicou no botão para pausar
    if (isPlayingTestVoice && speedToPlay === undefined) {
      stopVoiceSample();
      return;
    }

    window.speechSynthesis.cancel();
    setIsPlayingTestVoice(false);

    // Timeout breve de 50ms para contornar race-condition do Chrome no cancel()
    setTimeout(() => {
      try {
        const utterance = new SpeechSynthesisUtterance(
          "VivaVoz configurado com sucesso! A sua leitura e narração em áudio começam agora."
        );
        utterance.rate = Number(targetSpeed) || 1.0;

        const voices =
          availableVoices.length > 0
            ? availableVoices
            : window.speechSynthesis.getVoices();

        const ptVoice =
          voices.find(
            (v) =>
              v.lang === "pt-BR" ||
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

        utterance.onstart = () => setIsPlayingTestVoice(true);
        utterance.onend = () => setIsPlayingTestVoice(false);
        utterance.onerror = () => setIsPlayingTestVoice(false);

        window.speechSynthesis.speak(utterance);
      } catch {
        setIsPlayingTestVoice(false);
      }
    }, 50);
  }, [availableVoices, isPlayingTestVoice, selectedSpeed, stopVoiceSample]);

  const handleSelectSpeed = (speedValue: number) => {
    setSelectedSpeed(speedValue);
    patchSettings({ speed: speedValue });
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
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="max-w-2xl sm:max-w-3xl p-0 overflow-hidden border-border/80 bg-background/95 backdrop-blur-xl shadow-2xl rounded-3xl"
      >
        {/* Cabeçalho do Modal com Barra de Progresso */}
        <div className="border-b border-border/60 bg-secondary/30 px-6 pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-md shadow-accent/20">
                <Sparkles className="size-4" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-accent">
                  {step === 0
                    ? "Bem-vindo ao VivaVoz"
                    : `Jornada de Preferências • Etapa ${step} de 5`}
                </span>
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
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
              className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-lg hover:bg-secondary/80 flex items-center gap-1 cursor-pointer"
            >
              <span>Pular tudo</span>
              <X className="size-3.5" />
            </button>
          </div>

          {/* Indicador de passos (visível da etapa 1 em diante) */}
          {step > 0 && (
            <div className="mt-4 flex items-center gap-1.5 sm:gap-2">
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
        <div className="p-5 sm:p-7 max-h-[70vh] overflow-y-auto">
          {/* ================= ETAPA 0: BOAS-VINDAS ================= */}
          {step === 0 && (
            <div className="space-y-6 text-center py-2">
              <div className="mx-auto flex size-16 sm:size-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-accent/20 via-accent/10 to-indigo-500/20 text-accent ring-1 ring-accent/30 shadow-inner">
                <AudioLines className="size-8 sm:size-10" />
              </div>

              <div className="space-y-2 max-w-lg mx-auto">
                <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                  Transforme qualquer PDF em áudio inteligente
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Você pode configurar rapidamente seu estilo de leitor, temas visuais e velocidade de narração, ou começar direto com os padrões recomendados.
                </p>
              </div>

              {/* Grid com destaques do app */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left max-w-xl mx-auto pt-2">
                <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/60 space-y-1">
                  <div className="flex items-center gap-2 text-accent font-semibold text-xs">
                    <Compass className="size-3.5" />
                    <span>3 Modos de Leitura</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Estúdio Clean, Assistente com IA Gemini ou Modo Zen imersivo.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/60 space-y-1">
                  <div className="flex items-center gap-2 text-amber-500 font-semibold text-xs">
                    <Sparkles className="size-3.5" />
                    <span>Temas Confortáveis</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Clean, Papel Zen com tons quentes ou Modo Escuro suave.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/60 space-y-1">
                  <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs">
                    <Volume2 className="size-3.5" />
                    <span>Áudio Sincronizado</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Acompanhamento do texto em tempo real com narração fluida.
                  </p>
                </div>
              </div>

              {/* Botões de Ação Inicial */}
              <div className="flex items-center justify-center pt-4 max-w-sm mx-auto">
                <Button
                  type="button"
                  data-cy="start-journey-btn"
                  data-testid="start-journey-btn"
                  onClick={() => setStep(1)}
                  className="w-full gap-2 rounded-2xl bg-accent text-accent-foreground hover:bg-accent/90 py-5 text-sm font-bold shadow-lg shadow-accent/25 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <Sparkles className="size-4" />
                  <span>Fazer a Jornada (Personalizar)</span>
                </Button>
              </div>
            </div>
          )}

          {/* ================= ETAPA 1: MODO DE LEITURA (TEMPLATE) ================= */}
          {step === 1 && (
            <div className="space-y-4">
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                Escolha o layout que melhor se adapta à sua rotina. Você poderá alternar entre eles a qualquer momento no leitor.
              </DialogDescription>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
                {TEMPLATE_CHOICES.map((t) => {
                  const Icon = t.icon;
                  const isSelected = selectedTemplate === t.id;
                  return (
                    <div
                      key={t.id}
                      data-cy={`template-option-${t.id}`}
                      data-testid={`template-option-${t.id}`}
                      onClick={() => setSelectedTemplate(t.id)}
                      className={cn(
                        "group relative flex flex-col justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200",
                        isSelected
                          ? "border-accent bg-accent/5 shadow-md shadow-accent/10 ring-1 ring-accent"
                          : "border-border/70 bg-card/60 hover:border-border hover:bg-secondary/40"
                      )}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div
                            className={cn(
                              "flex size-9 items-center justify-center rounded-xl transition-colors",
                              isSelected
                                ? "bg-accent text-accent-foreground"
                                : "bg-secondary text-muted-foreground group-hover:text-foreground"
                            )}
                          >
                            <Icon className="size-4" />
                          </div>
                          <span
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                              isSelected
                                ? "bg-accent/20 text-accent border-accent/40"
                                : "bg-secondary text-muted-foreground border-border/50"
                            )}
                          >
                            {t.badge}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                            {t.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {t.description}
                          </p>
                        </div>

                        <div className="space-y-1 pt-1 border-t border-border/40">
                          {t.features.map((feat, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                            >
                              <Check className="size-3 text-accent shrink-0" />
                              <span>{feat}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 pt-2 border-t border-border/40 flex items-center justify-between text-xs font-semibold">
                        <span className={isSelected ? "text-accent" : "text-muted-foreground"}>
                          {isSelected ? "Selecionado" : "Selecionar"}
                        </span>
                        <div
                          className={cn(
                            "size-4 rounded-full border flex items-center justify-center transition-colors",
                            isSelected
                              ? "border-accent bg-accent text-accent-foreground"
                              : "border-border"
                          )}
                        >
                          {isSelected && <Check className="size-2.5 stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= ETAPA 2: AMBIENTE & TEMA ================= */}
          {step === 2 && (
            <div className="space-y-4">
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                Escolha o esquema de cores para sua leitura. O tema será aplicado na hora para você testar.
              </DialogDescription>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                {THEME_CHOICES.map((th) => {
                  const Icon = th.icon;
                  const isSelected = selectedTheme === th.id;
                  return (
                    <div
                      key={th.id}
                      data-cy={`theme-option-${th.id}`}
                      data-testid={`theme-option-${th.id}`}
                      onClick={() => handleSelectTheme(th.id)}
                      className={cn(
                        "group relative flex flex-col justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200",
                        isSelected
                          ? "border-accent bg-accent/5 shadow-md ring-1 ring-accent"
                          : "border-border/70 bg-card/60 hover:border-border hover:bg-secondary/40"
                      )}
                    >
                      <div className="space-y-3">
                        {/* Mini preview visual do tema */}
                        <div
                          className={cn(
                            "h-20 w-full rounded-xl border p-2.5 flex flex-col justify-between shadow-xs transition-transform group-hover:scale-[1.02]",
                            th.bgPreview
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <Icon className="size-4 text-accent" />
                            <div className="flex gap-1">
                              <span className="size-1.5 rounded-full bg-accent/60" />
                              <span className="size-1.5 rounded-full bg-accent/40" />
                            </div>
                          </div>
                          <div className={cn("text-[11px] font-semibold", th.textPreview)}>
                            Exemplo de texto do leitor...
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-foreground">{th.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {th.description}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 pt-2 border-t border-border/40 flex items-center justify-between text-xs font-semibold">
                        <span className={isSelected ? "text-accent" : "text-muted-foreground"}>
                          {isSelected ? "Ativo agora" : "Escolher"}
                        </span>
                        <div
                          className={cn(
                            "size-4 rounded-full border flex items-center justify-center transition-colors",
                            isSelected
                              ? "border-accent bg-accent text-accent-foreground"
                              : "border-border"
                          )}
                        >
                          {isSelected && <Check className="size-2.5 stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= ETAPA 3: TIPOGRAFIA & TAMANHO ================= */}
          {step === 3 && (
            <div className="space-y-5">
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                Selecione a fonte ideal e o tamanho do texto para uma leitura sem cansaço visual.
              </DialogDescription>

              {/* Escolha da Família da Fonte */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Família da Fonte Google
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {READING_FONTS.map((font) => {
                    const isSelected = selectedFont === font.id;
                    return (
                      <div
                        key={font.id}
                        data-cy={`font-option-${font.id}`}
                        data-testid={`font-option-${font.id}`}
                        onClick={() => setSelectedFont(font.id)}
                        className={cn(
                          "p-3 rounded-2xl border-2 cursor-pointer transition-all duration-200",
                          isSelected
                            ? "border-accent bg-accent/5 ring-1 ring-accent"
                            : "border-border/70 bg-card/60 hover:bg-secondary/40"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={cn("text-base font-bold text-foreground", font.fontClass)}
                          >
                            {font.name}
                          </span>
                          {isSelected && <Check className="size-3.5 text-accent stroke-[3]" />}
                        </div>
                        <span className="text-[10px] text-accent font-semibold">
                          {font.category}
                        </span>
                        <p className="text-[11px] text-muted-foreground mt-1 leading-tight line-clamp-2">
                          {font.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Escolha do Tamanho do Texto */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Tamanho do Texto
                  </label>
                  <span className="text-xs font-bold text-accent">{selectedFontSize}px</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {FONT_SIZE_PRESETS.map((preset) => (
                    <button
                      key={preset.size}
                      type="button"
                      onClick={() => setSelectedFontSize(preset.size)}
                      className={cn(
                        "py-2 px-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-between",
                        selectedFontSize === preset.size
                          ? "border-accent bg-accent/10 text-accent ring-1 ring-accent"
                          : "border-border bg-card/60 text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                      )}
                    >
                      <span>{preset.label}</span>
                      <span className="text-[11px] opacity-70">{preset.size}px</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Caixa de Exemplo ao Vivo */}
              <div className="p-4 rounded-2xl bg-secondary/50 border border-border/80 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Prévia em Tempo Real
                </span>
                <p
                  className={cn(
                    "text-foreground leading-relaxed transition-all",
                    READING_FONTS.find((f) => f.id === selectedFont)?.fontClass
                  )}
                  style={{ fontSize: `${selectedFontSize}px` }}
                >
                  “A leitura engrandece a alma e a narração em áudio dá vida e ritmo a cada palavra escrita.”
                </p>
              </div>
            </div>
          )}

          {/* ================= ETAPA 4: VELOCIDADE & TESTE DE VOZ ================= */}
          {step === 4 && (
            <div className="space-y-5">
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                Defina o ritmo de audição padrão e experimente o áudio com um teste sonoro.
              </DialogDescription>

              {/* Seletor de Velocidade */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Velocidade de Reprodução Padrão
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {SPEED_PRESETS.map((sp) => {
                    const isSelected = selectedSpeed === sp.value;
                    return (
                      <button
                        key={sp.label}
                        type="button"
                        data-cy={`speed-option-${sp.label}`}
                        data-testid={`speed-option-${sp.label}`}
                        onClick={() => handleSelectSpeed(sp.value)}
                        className={cn(
                          "p-3 rounded-2xl border-2 text-left transition-all cursor-pointer",
                          isSelected
                            ? "border-accent bg-accent/10 text-accent ring-1 ring-accent"
                            : "border-border bg-card/60 text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-base font-extrabold">{sp.label}</div>
                          {isSelected && <Check className="size-3.5 text-accent stroke-[3]" />}
                        </div>
                        <div className="text-[11px] opacity-80">{sp.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Demonstração Sonora com Web Speech */}
              <div className="p-4 rounded-2xl bg-secondary/50 border border-border/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-left">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-accent/20 text-accent">
                    <Headphones className="size-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-foreground">Teste Sonoro Instantâneo</h5>
                    <p className="text-[11px] text-muted-foreground">
                      Ouça uma frase de demonstração na velocidade selecionada ({selectedSpeed}x).
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  data-cy="voice-test-btn"
                  data-testid="voice-test-btn"
                  onClick={() => handlePlayVoiceSample()}
                  variant="outline"
                  className={cn(
                    "w-full sm:w-auto gap-2 rounded-xl border-accent/40 bg-accent/10 hover:bg-accent/20 text-accent font-bold text-xs shrink-0 cursor-pointer",
                    isPlayingTestVoice && "animate-pulse ring-2 ring-accent bg-accent/20"
                  )}
                >
                  {isPlayingTestVoice ? (
                    <>
                      <VolumeX className="size-3.5 text-destructive" />
                      <span>Parar demonstração</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="size-3.5" />
                      <span>Ouvir demonstração ({selectedSpeed}x)</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* ================= ETAPA 5: CONCLUSÃO ================= */}
          {step === 5 && (
            <div className="space-y-6 text-center py-2">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500 ring-4 ring-emerald-500/10">
                <CheckCircle2 className="size-7" />
              </div>

              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-lg sm:text-xl font-extrabold text-foreground">
                  Configurações salvas com sucesso!
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Aqui está o resumo da sua experiência personalizada no VivaVoz:
                </p>
              </div>

              {/* Resumo das escolhas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-xl mx-auto text-left">
                <div className="p-3 rounded-2xl bg-secondary/50 border border-border/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Modo
                  </span>
                  <span className="text-xs font-bold text-foreground">
                    {TEMPLATE_CHOICES.find((t) => t.id === selectedTemplate)?.title}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-secondary/50 border border-border/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Tema
                  </span>
                  <span className="text-xs font-bold text-foreground">
                    {THEME_CHOICES.find((th) => th.id === selectedTheme)?.title}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-secondary/50 border border-border/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Fonte
                  </span>
                  <span className="text-xs font-bold text-foreground">
                    {READING_FONTS.find((f) => f.id === selectedFont)?.name} ({selectedFontSize}px)
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-secondary/50 border border-border/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Velocidade
                  </span>
                  <span className="text-xs font-bold text-foreground">{selectedSpeed}x</span>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                Você pode alterar qualquer uma dessas opções a qualquer momento no topo do leitor ou reabrir este tutorial.
              </p>
            </div>
          )}
        </div>

        {/* Rodapé de Navegação da Jornada */}
        {step > 0 && (
          <div className="border-t border-border/60 bg-secondary/30 px-6 py-4 flex items-center justify-between gap-3">
            <Button
              type="button"
              data-cy="prev-step-btn"
              data-testid="prev-step-btn"
              variant="outline"
              onClick={() => setStep((curr) => Math.max(0, curr - 1))}
              className="gap-1.5 rounded-xl border-border/80 bg-background text-xs font-semibold"
            >
              <ChevronLeft className="size-4" />
              <span>{step === 1 ? "Voltar ao início" : "Voltar"}</span>
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                data-cy="skip-onboarding-bottom-btn"
                data-testid="skip-onboarding-bottom-btn"
                variant="ghost"
                onClick={handleSkipAll}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Pular tudo
              </Button>

              {step < 5 ? (
                <Button
                  type="button"
                  data-cy="next-step-btn"
                  data-testid="next-step-btn"
                  onClick={() => setStep((curr) => curr + 1)}
                  className="gap-1.5 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 text-xs font-bold shadow-md shadow-accent/20 px-4"
                >
                  <span>Próximo</span>
                  <ChevronRight className="size-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  data-cy="finish-onboarding-btn"
                  data-testid="finish-onboarding-btn"
                  onClick={handleFinishJourney}
                  className="gap-1.5 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 text-xs font-bold shadow-lg shadow-accent/25 px-5"
                >
                  <Zap className="size-4" />
                  <span>Concluir e Começar</span>
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
