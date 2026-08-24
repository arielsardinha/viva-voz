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
    id: "step-1",
    title: "Passo 1: Carregue o Conteúdo",
    subtitle: "Arraste seu PDF, EPUB ou cole o link de um artigo.",
    icon: FileText,
    x: 15,
    y: 45,
    color: "from-blue-500/20 to-cyan-500/20 border-cyan-500/40 text-cyan-400",
    badge: "Passo 1",
  },
  {
    id: "step-2",
    title: "Passo 2: Aperte o Play",
    subtitle: "Escolha a voz neural ideal e ajuste a velocidade como desejar.",
    icon: Volume2,
    x: 50,
    y: 45,
    color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-400",
    badge: "Passo 2",
  },
  {
    id: "step-3",
    title: "Passo 3: Acompanhe e Interaja",
    subtitle: "Leia com áudio e texto sincronizados e tire dúvidas com a IA em tempo real.",
    icon: Sparkles,
    x: 85,
    y: 45,
    color: "from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-400",
    badge: "Passo 3",
  },
];

export function HeroGraphFlow() {
  const [activeNodeId, setActiveNodeId] = useState<string>("step-1");

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
              Como Funciona
            </h3>
            <p className="text-[11px] text-muted-foreground sm:text-xs">
              Três passos simples para transformar seus documentos em audiolivros inteligentes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          <span className="text-[11px] font-semibold text-muted-foreground">3 Passos Simples</span>
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
          {/* Conexões (Edges) entre nós */}
          {/* Node 1 -> Node 2 */}
          <path
            d="M 200 220 C 350 220, 350 220, 500 220"
            fill="none"
            stroke="rgba(99, 102, 241, 0.3)"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
          {/* Node 2 -> Node 3 */}
          <path
            d="M 500 220 C 650 220, 650 220, 800 220"
            fill="none"
            stroke="rgba(16, 185, 129, 0.35)"
            strokeWidth="2"
          />

          {/* Pulsos de Dados Animados (Circulos viajando) */}
          <circle r="4.5" fill="#06b6d4" filter="url(#glow-filter)">
            <animateMotion
              path="M 200 220 C 350 220, 350 220, 500 220"
              dur="2.5s"
              repeatCount="indefinite"
            />
          </circle>
          <circle r="4.5" fill="#10b981" filter="url(#glow-filter)">
            <animateMotion
              path="M 500 220 C 650 220, 650 220, 800 220"
              dur="2.5s"
              repeatCount="indefinite"
            />
          </circle>
        </svg>

        {/* Nós do Grafo Interativos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-6 relative z-10 py-2 sm:py-6">
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
                  "group relative flex flex-col items-start p-4 sm:p-5 rounded-2xl border text-left transition-all duration-300 backdrop-blur-md cursor-pointer",
                  isActive
                    ? "border-accent bg-accent/15 shadow-[0_0_25px_rgba(99,102,241,0.25)] scale-[1.02]"
                    : "border-border/70 bg-card/60 hover:border-accent/50 hover:bg-card/90 hover:scale-[1.01]"
                )}
              >
                {/* Badge de Topo */}
                <div className="flex w-full items-center justify-between gap-1 mb-3">
                  <span
                    className={cn(
                      "inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      isActive
                        ? "bg-accent/25 text-accent"
                        : "bg-secondary text-muted-foreground group-hover:text-foreground"
                    )}
                  >
                    {node.badge}
                  </span>
                  <div
                    className={cn(
                      "flex size-8 items-center justify-center rounded-xl border bg-gradient-to-br transition-transform group-hover:rotate-6",
                      node.color
                    )}
                  >
                    <IconComponent className="size-4" aria-hidden="true" />
                  </div>
                </div>

                {/* Título e Subtítulo */}
                <h4 className="text-sm font-bold text-foreground sm:text-base">{node.title}</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {node.subtitle}
                </p>

                {/* Indicador de Seleção Ativa */}
                <div className="mt-4 flex items-center gap-1 text-[11px] font-semibold text-accent">
                  <span className={cn(isActive ? "opacity-100" : "opacity-0 group-hover:opacity-80 transition-opacity")}>
                    {isActive ? "Etapa Selecionada" : "Ver Detalhes"}
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
            <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
              {activeNodeId === "step-1" &&
                "Passo 1: Carregue o Conteúdo — Arraste seu PDF, EPUB ou cole o link de um artigo."}
              {activeNodeId === "step-2" &&
                "Passo 2: Aperte o Play — Escolha a voz neural ideal e ajuste a velocidade como desejar."}
              {activeNodeId === "step-3" &&
                "Passo 3: Acompanhe e Interaja — Leia com áudio e texto sincronizados e tire dúvidas com a IA em tempo real."}
            </p>
          </div>
          <span className="shrink-0 text-[10px] uppercase font-bold tracking-widest text-accent/80 bg-accent/10 px-2.5 py-1 rounded-lg">
            Etapa Ativa: {activeNodeId === "step-1" ? "1" : activeNodeId === "step-2" ? "2" : "3"}
          </span>
        </div>
      </div>
    </div>
  );
}
