"use client";

import { useState } from "react";
import { FileText, Cpu, Sparkles, Volume2, HardDrive, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface GraphNode {
  id: string;
  title: string;
  subtitle: string;
  icon: typeof FileText;
  x: number; // percentual ou coordenadas
  y: number;
  color: string;
  badge: string;
}

const NODES: GraphNode[] = [
  {
    id: "doc-input",
    title: "1. Entrada Universal",
    subtitle: "PDF, EPUB, DOCX, Web URL",
    icon: FileText,
    x: 10,
    y: 45,
    color: "from-blue-500/20 to-cyan-500/20 border-cyan-500/40 text-cyan-400",
    badge: "Multi-Formato",
  },
  {
    id: "splitter-ocr",
    title: "2. Parser & OCR Neural",
    subtitle: "Segmentação & Visão IA",
    icon: Cpu,
    x: 35,
    y: 20,
    color: "from-indigo-500/20 to-purple-500/20 border-indigo-500/40 text-indigo-400",
    badge: "Indexed Sentences",
  },
  {
    id: "ai-engine",
    title: "3. Motor Gemini 2.5",
    subtitle: "Chat contextual & BYOK",
    icon: Sparkles,
    x: 35,
    y: 70,
    color: "from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-400",
    badge: "IA Sem Limites",
  },
  {
    id: "tts-stream",
    title: "4. Narração Neural",
    subtitle: "Vozes fluidas com realce",
    icon: Volume2,
    x: 65,
    y: 35,
    color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-400",
    badge: "Audio Sync",
  },
  {
    id: "storage-sync",
    title: "5. Local + Cloud Sync",
    subtitle: "IndexedDB & appDataFolder",
    icon: HardDrive,
    x: 90,
    y: 55,
    color: "from-violet-500/20 to-fuchsia-500/20 border-violet-500/40 text-violet-400",
    badge: "Zero Rastreio",
  },
];

export function HeroGraphFlow() {
  const [activeNodeId, setActiveNodeId] = useState<string>("doc-input");

  return (
    <div
      data-cy="hero-graph-flow-container"
      data-testid="hero-graph-flow-container"
      className="relative w-full overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-b from-card/80 via-card/40 to-background/90 p-4 sm:p-8 backdrop-blur-xl shadow-2xl"
    >
      {/* Header do Diagrama de Fluxo */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Zap className="size-4 animate-pulse" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-foreground sm:text-base">
              Como o VivaVoz Funciona por Dentro
            </h3>
            <p className="text-[11px] text-muted-foreground sm:text-xs">
              Processamento inteligente do seu arquivo de texto até a narração sincronizada
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          <span className="text-[11px] font-semibold text-muted-foreground">Processamento Ativo</span>
        </div>
      </div>

      {/* SVG Canvas com conexões e pulsos de dados animados */}
      <div className="relative min-h-[360px] sm:min-h-[420px] w-full select-none">
        <svg
          className="absolute inset-0 size-full pointer-events-none"
          viewBox="0 0 1000 450"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="grad-pulse-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="grad-pulse-2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="grad-pulse-3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="grad-pulse-4" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0.8" />
            </linearGradient>
            <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Conexões (Edges) entre nós */}
          {/* Node 1 -> Node 2 */}
          <path
            d="M 160 210 C 230 210, 270 120, 360 110"
            fill="none"
            stroke="rgba(99, 102, 241, 0.25)"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
          {/* Node 1 -> Node 3 */}
          <path
            d="M 160 220 C 230 220, 270 310, 360 320"
            fill="none"
            stroke="rgba(245, 158, 11, 0.25)"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
          {/* Node 2 -> Node 4 */}
          <path
            d="M 460 110 C 540 110, 580 180, 660 180"
            fill="none"
            stroke="rgba(16, 185, 129, 0.3)"
            strokeWidth="2"
          />
          {/* Node 3 -> Node 4 */}
          <path
            d="M 460 320 C 540 320, 580 200, 660 190"
            fill="none"
            stroke="rgba(16, 185, 129, 0.3)"
            strokeWidth="2"
          />
          {/* Node 4 -> Node 5 */}
          <path
            d="M 760 185 C 810 185, 840 250, 890 260"
            fill="none"
            stroke="rgba(168, 85, 247, 0.3)"
            strokeWidth="2"
          />

          {/* Pulsos de Dados Animados (Circulos viajando) */}
          <circle r="4" fill="#06b6d4" filter="url(#glow-filter)">
            <animateMotion
              path="M 160 210 C 230 210, 270 120, 360 110"
              dur="3s"
              repeatCount="indefinite"
            />
          </circle>
          <circle r="4" fill="#f59e0b" filter="url(#glow-filter)">
            <animateMotion
              path="M 160 220 C 230 220, 270 310, 360 320"
              dur="3.5s"
              repeatCount="indefinite"
            />
          </circle>
          <circle r="5" fill="#10b981" filter="url(#glow-filter)">
            <animateMotion
              path="M 460 110 C 540 110, 580 180, 660 180"
              dur="2.5s"
              repeatCount="indefinite"
            />
          </circle>
          <circle r="4" fill="#a855f7" filter="url(#glow-filter)">
            <animateMotion
              path="M 760 185 C 810 185, 840 250, 890 260"
              dur="2.8s"
              repeatCount="indefinite"
            />
          </circle>
        </svg>

        {/* Nós do Grafo Interativos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 relative z-10 py-2 sm:py-6">
          {NODES.map((node) => {
            const IconComponent = node.icon;
            const isActive = activeNodeId === node.id;

            return (
              <button
                key={node.id}
                type="button"
                data-cy={`graph-node-${node.id}`}
                data-testid={`graph-node-${node.id}`}
                onClick={() => setActiveNodeId(node.id)}
                onMouseEnter={() => setActiveNodeId(node.id)}
                className={cn(
                  "group relative flex flex-col items-start p-3.5 sm:p-4 rounded-2xl border text-left transition-all duration-300 backdrop-blur-md cursor-pointer",
                  isActive
                    ? "border-accent bg-accent/15 shadow-[0_0_25px_rgba(99,102,241,0.25)] scale-[1.03]"
                    : "border-border/70 bg-card/60 hover:border-accent/50 hover:bg-card/90 hover:scale-[1.01]"
                )}
              >
                {/* Badge de Topo */}
                <div className="flex w-full items-center justify-between gap-1 mb-2">
                  <span
                    className={cn(
                      "inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      isActive
                        ? "bg-accent/25 text-accent"
                        : "bg-secondary text-muted-foreground group-hover:text-foreground"
                    )}
                  >
                    {node.badge}
                  </span>
                  <div
                    className={cn(
                      "flex size-7 items-center justify-center rounded-xl border bg-gradient-to-br transition-transform group-hover:rotate-6",
                      node.color
                    )}
                  >
                    <IconComponent className="size-3.5" aria-hidden="true" />
                  </div>
                </div>

                {/* Título e Subtítulo */}
                <h4 className="text-xs font-bold text-foreground sm:text-sm">{node.title}</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                  {node.subtitle}
                </p>

                {/* Indicador de Seleção Ativa */}
                <div className="mt-3 flex items-center gap-1 text-[10px] font-semibold text-accent">
                  <span className={cn(isActive ? "opacity-100" : "opacity-0 group-hover:opacity-80 transition-opacity")}>
                    {isActive ? "Etapa Selecionada" : "Ver Etapa"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Painel de Explicação do Nó Ativo */}
        <div className="mt-4 rounded-2xl border border-border/70 bg-secondary/50 p-3.5 sm:p-4 backdrop-blur-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent font-bold text-xs">
              i
            </div>
            <p className="text-xs text-foreground/90 leading-relaxed">
              {activeNodeId === "doc-input" &&
                "Entrada Universal: Carregamento instantâneo de PDF, EPUB, DOCX, ODT, PPTX, TXT, Markdown ou extração de URLs da web com pré-processamento local."}
              {activeNodeId === "splitter-ocr" &&
                "Parser & OCR Neural: Segmentação determinística de sentenças com detecção de scans via OCR Gemini Vision quando o documento é imagem."}
              {activeNodeId === "ai-engine" &&
                "Motor Gemini 2.5: Respostas em streaming, tira-dúvidas e explicações do documento usando sua própria chave BYOK sem custos ocultos."}
              {activeNodeId === "tts-stream" &&
                "Narração Neural: Vozes naturais do Google Cloud TTS e Gemini TTS com sincronismo visual de leitura e realce da sentença ativa."}
              {activeNodeId === "storage-sync" &&
                "Storage Local + Cloud Sync: Cache ultra-rápido no IndexedDB para uso offline e backup seguro na pasta oculta Google Drive appDataFolder."}
            </p>
          </div>
          <span className="shrink-0 text-[10px] uppercase font-bold tracking-widest text-accent/80 bg-accent/10 px-2 py-1 rounded-lg">
            Nó Ativo: {activeNodeId}
          </span>
        </div>
      </div>
    </div>
  );
}
