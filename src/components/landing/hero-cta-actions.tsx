"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import { InteractiveDemoModal } from "./interactive-demo-modal";

export function HeroCtaActions() {
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-2">
        {/* CTA Primário: Começar a Ouvir Gratuitamente */}
        <Link
          href="/leitor"
          data-cy="hero-cta-primary"
          data-testid="hero-cta-primary"
          aria-label="Começar a Ouvir Gratuitamente - Abrir o leitor VivaVoz"
          className="group relative inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-accent via-indigo-600 to-indigo-700 px-6 sm:px-8 py-3.5 sm:py-4 text-sm sm:text-base font-extrabold text-accent-foreground shadow-lg shadow-accent/25 hover:shadow-accent/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer"
        >
          <span>Começar a Ouvir Gratuitamente</span>
          <ArrowRight className="size-4 sm:size-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </Link>

        {/* CTA Secundário: Ver Demonstração */}
        <button
          type="button"
          data-cy="hero-cta-secondary"
          data-testid="hero-cta-secondary"
          onClick={() => setDemoOpen(true)}
          aria-label="Ver Demonstração interativa do VivaVoz"
          className="group inline-flex items-center justify-center gap-2.5 rounded-2xl border border-border/90 bg-background/80 hover:bg-secondary/90 px-6 sm:px-8 py-3.5 sm:py-4 text-sm sm:text-base font-bold text-foreground shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer backdrop-blur-md"
        >
          <div className="flex size-6 items-center justify-center rounded-full bg-accent/15 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
            <Play className="size-3 fill-current ml-0.5" aria-hidden="true" />
          </div>
          <span>Ver Demonstração</span>
        </button>
      </div>

      {/* Modal Interativo de Demonstração */}
      <InteractiveDemoModal open={demoOpen} onOpenChange={setDemoOpen} />
    </>
  );
}
