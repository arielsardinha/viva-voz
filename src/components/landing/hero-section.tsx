import { Sparkles, ShieldCheck, Zap, AudioLines } from "lucide-react";
import { HeroCtaActions } from "./hero-cta-actions";

export function HeroSection() {
  return (
    <section
      id="hero"
      aria-labelledby="hero-title"
      className="relative overflow-hidden pt-8 pb-16 sm:pt-14 sm:pb-24"
    >
      {/* Background Glows & Grid Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[380px] sm:size-[600px] rounded-full bg-gradient-to-tr from-accent/20 via-indigo-600/15 to-purple-600/10 blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center space-y-6">
          {/* H1 Value Proposition */}
          <h1
            id="hero-title"
            className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.15] sm:leading-[1.12]"
          >
            Leitura Neural, Áudio Sincronizado e{" "}
            <span className="bg-gradient-to-r from-accent via-indigo-500 to-purple-500 bg-clip-text text-transparent">
              IA Contextual
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Transforme PDFs, livros e artigos em narrações neurais fluidas com realce de sentenças
            em tempo real, tira-dúvidas via Gemini e privacidade absoluta com backup no Google Drive.
          </p>

          {/* Dual CTAs */}
          <HeroCtaActions />

          {/* Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-4 text-xs font-semibold text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-emerald-500" aria-hidden="true" />
              <span>Privacidade Local (IndexedDB)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="size-4 text-amber-500" aria-hidden="true" />
              <span>Google Gemini 2.5 BYOK</span>
            </div>
            <div className="flex items-center gap-1.5">
              <AudioLines className="size-4 text-accent" aria-hidden="true" />
              <span>Sincronismo Neural PT-BR</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
