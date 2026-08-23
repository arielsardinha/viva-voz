"use client";

import { useState } from "react";
import {
  AudioLines,
  Sparkles,
  Layers,
  Palette,
  ShieldCheck,
  Bot,
  ArrowUpRight,
  CheckCircle2,
  FileCheck,
  Cpu,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BentoItem {
  id: string;
  descId: string;
  title: string;
  category: string;
  description: string;
  icon: typeof AudioLines;
  gradient: string;
  colSpan: string;
  badge: string;
}

const BENTO_FEATURES: BentoItem[] = [
  {
    id: "feature-tts",
    descId: "desc-feature-tts",
    title: "Narração Neural com Sincronismo em Tempo Real",
    category: "Áudio & Síntese",
    description:
      "Sintetização ultra-realista em português brasileiro com realce visual da sentença ativa. Acompanhe a leitura com o olho e o ouvido simultaneamente.",
    icon: AudioLines,
    gradient: "from-accent/20 via-indigo-500/10 to-transparent",
    colSpan: "col-span-1 md:col-span-2 lg:col-span-2",
    badge: "Tempo Real",
  },
  {
    id: "feature-ai",
    descId: "desc-feature-ai",
    title: "Chat Inteligente com Gemini 2.5 & BYOK",
    category: "Inteligência Artificial",
    description:
      "Envie perguntas sobre o documento, solicite resumos estruturados e explicações conceituais com streaming instantâneo e sua própria API key.",
    icon: Sparkles,
    gradient: "from-amber-500/20 via-orange-500/10 to-transparent",
    colSpan: "col-span-1 md:col-span-1 lg:col-span-1",
    badge: "Google Gemini",
  },
  {
    id: "feature-ocr",
    descId: "desc-feature-ocr",
    title: "Multi-Formato Universal & OCR Visual",
    category: "Processamento de Documentos",
    description:
      "Carregue PDFs, EPUBs, DOCX, ODT, PPTX, TXT, Markdown ou extraia artigos da web. Detecta e lê até mesmo páginas escaneadas via OCR inteligente.",
    icon: Layers,
    gradient: "from-cyan-500/20 via-blue-500/10 to-transparent",
    colSpan: "col-span-1 md:col-span-1 lg:col-span-1",
    badge: "Universal",
  },
  {
    id: "feature-themes",
    descId: "desc-feature-themes",
    title: "Modos de Leitura Ergonômicos",
    category: "Ergonomia Visual",
    description:
      "Alternância fluida entre temas Clean (Claro), Papel Zen (Sépia) e Midnight (Escuro), com tipografias consagradas (Inter, Merriweather, Lora, Roboto e Literata).",
    icon: Palette,
    gradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
    colSpan: "col-span-1 md:col-span-1 lg:col-span-1",
    badge: "Conforto Óptico",
  },
  {
    id: "feature-sync",
    descId: "desc-feature-sync",
    title: "Privacidade Local & Google Drive Sync",
    category: "Segurança & Armazenamento",
    description:
      "Seus documentos nunca são salvos em servidores de terceiros. Armazenamento local no IndexedDB e sincronização opcional na pasta oculta do Google Drive.",
    icon: ShieldCheck,
    gradient: "from-violet-500/20 via-fuchsia-500/10 to-transparent",
    colSpan: "col-span-1 md:col-span-1 lg:col-span-1",
    badge: "100% Privado",
  },
  {
    id: "feature-agentic",
    descId: "desc-feature-agentic",
    title: "Agent-Ready & WebMCP Compliant",
    category: "Automação & IA",
    description:
      "Arquitetura acessível com llms.txt, ferramentas WebMCP semânticas e Schema.org JSON-LD para operação perfeita por agentes de IA e humanos.",
    icon: Bot,
    gradient: "from-rose-500/20 via-pink-500/10 to-transparent",
    colSpan: "col-span-1 md:col-span-2 lg:col-span-2",
    badge: "WebMCP",
  },
];

export function BentoGridFeatures() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="relative py-16 sm:py-24 overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho da Seção */}
        <div className="mx-auto max-w-3xl text-center space-y-4 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1 text-xs font-bold text-accent">
            <Cpu className="size-3.5" aria-hidden="true" />
            <span>Recursos de Alta Precisão</span>
          </div>

          <h2
            id="features-heading"
            className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground"
          >
            Arquitetura Desenvolvida para Leitura Imersiva
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Cada recurso foi desenhado com foco em desempenho, conforto visual prolongado e
            inteligência aumentada para transformar sua relação com os textos.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {BENTO_FEATURES.map((item) => {
            const IconComponent = item.icon;
            const isHovered = hoveredCard === item.id;

            return (
              <article
                key={item.id}
                id={item.id}
                data-cy={`bento-card-${item.id}`}
                data-testid={`bento-card-${item.id}`}
                onMouseEnter={() => setHoveredCard(item.id)}
                onMouseLeave={() => setHoveredCard(null)}
                className={`border-glow ${cn(
                  "group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border/80 bg-card/60 p-6 sm:p-7 backdrop-blur-xl transition-all duration-300",
                  item.colSpan,
                  isHovered ? "bg-card/90 -translate-y-1 shadow-2xl" : "hover:border-accent/40"
                )}`}
              >
                {/* Gradiente de fundo sutil */}
                <div
                  className={cn(
                    "absolute -right-12 -top-12 size-48 rounded-full bg-gradient-to-br blur-2xl transition-opacity duration-500 pointer-events-none",
                    item.gradient,
                    isHovered ? "opacity-100 scale-125" : "opacity-40"
                  )}
                />

                {/* Topo do Card */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex size-11 items-center justify-center rounded-2xl border border-border/80 bg-secondary/80 text-foreground shadow-xs group-hover:scale-110 group-hover:bg-accent group-hover:text-accent-foreground group-hover:border-accent transition-all duration-300">
                      <IconComponent className="size-5" aria-hidden="true" />
                    </div>
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                      {item.badge}
                    </span>
                  </div>

                  <span className="text-[11px] font-bold uppercase tracking-wider text-accent">
                    {item.category}
                  </span>

                  <h3 className="text-lg sm:text-xl font-bold tracking-tight text-foreground mt-1 mb-2.5 group-hover:text-accent transition-colors">
                    {item.title}
                  </h3>

                  <p
                    id={item.descId}
                    className="text-xs sm:text-sm text-muted-foreground leading-relaxed"
                  >
                    {item.description}
                  </p>
                </div>

                {/* Micrográfico Interno Interativo do Nó de Fluxo */}
                <div className="mt-6 pt-4 border-t border-border/60">
                  {item.id === "feature-tts" && (
                    <div className="flex items-center justify-between gap-2 rounded-2xl bg-secondary/50 p-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                        <span className="flex size-2 rounded-full bg-accent animate-ping" />
                        <span className="truncate">Sincronismo: 280 WPM • 1.25x</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {[40, 75, 55, 90, 60, 80, 45].map((h, i) => (
                          <div
                            key={i}
                            className={cn(
                              "w-1 rounded-full bg-accent transition-all duration-300",
                              isHovered ? "animate-pulse" : "opacity-60"
                            )}
                            style={{ height: `${(h * 20) / 100}px` }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {item.id === "feature-ai" && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-2xl bg-secondary/50 p-2.5">
                      <Sparkles className="size-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">"Resuma os tópicos principais deste capítulo"</span>
                    </div>
                  )}

                  {item.id === "feature-ocr" && (
                    <div className="flex items-center gap-1.5 overflow-x-auto text-[10px] font-bold text-muted-foreground">
                      <span className="rounded-lg bg-secondary px-2 py-1">.PDF</span>
                      <span className="rounded-lg bg-secondary px-2 py-1">.EPUB</span>
                      <span className="rounded-lg bg-secondary px-2 py-1">.DOCX</span>
                      <span className="rounded-lg bg-secondary px-2 py-1">Web URL</span>
                    </div>
                  )}

                  {item.id === "feature-themes" && (
                    <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="size-2.5 rounded-full bg-slate-100 border" /> Clean
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="size-2.5 rounded-full bg-amber-100 border border-amber-300" /> Zen
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="size-2.5 rounded-full bg-slate-900 border border-slate-700" /> Dark
                      </span>
                    </div>
                  )}

                  {item.id === "feature-sync" && (
                    <div className="flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="size-3.5" />
                        IndexedDB Offline
                      </span>
                      <span className="text-[11px] text-muted-foreground">Google Drive</span>
                    </div>
                  )}

                  {item.id === "feature-agentic" && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
                          data-webmcp-tool
                        </span>
                        <span className="text-[11px] font-mono">/llms.txt</span>
                      </div>
                      <span className="text-[11px] font-semibold text-accent">Lighthouse 100/100</span>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
