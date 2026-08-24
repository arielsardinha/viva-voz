import { HeroCtaActions } from "./hero-cta-actions";

export function HeroSection() {
  return (
    <section
      id="hero"
      aria-labelledby="hero-title"
      className="relative overflow-hidden pt-8 pb-16 sm:pt-14 sm:pb-20"
    >
      {/* Background Glows & Grid Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[380px] sm:size-[600px] rounded-full bg-gradient-to-tr from-accent/20 via-indigo-600/15 to-purple-600/10 blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center space-y-6">
          {/* Badge superior */}
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-extrabold text-accent shadow-sm">
            <span>⚡ Leitor Inteligente de Texto para Voz com IA</span>
          </div>

          {/* H1 Value Proposition */}
          <h1
            id="hero-title"
            className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.15] sm:leading-[1.12]"
          >
            Ouça qualquer documento como se fosse um audiolivro.
          </h1>

          {/* Subtitle (H2) */}
          <h2 className="text-sm sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto font-normal">
            Transforme PDFs, artigos e livros em vozes ultra-realistas. Acompanhe a leitura com frases destacadas em tempo real e tire dúvidas com o assistente Gemini integrado.
          </h2>

          {/* Dual CTAs */}
          <HeroCtaActions />

          {/* Texto de Apoio / Confiança */}
          <p className="text-xs sm:text-sm font-semibold text-muted-foreground pt-1">
            ✓ Gratuito para testar • Sem instalação • 100% privado no seu Google Drive
          </p>

          {/* 2. BARRA DE FORMATOS SUPORTADOS */}
          <div className="pt-6 border-t border-border/60 mt-8 space-y-3">
            <p className="text-xs sm:text-sm font-semibold text-muted-foreground">
              Compatível com tudo o que você precisa ler:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-secondary/80 px-3.5 py-1.5 text-xs font-bold text-foreground backdrop-blur-xs shadow-xs hover:border-accent/40 transition-colors">
                📄 Arquivos PDF
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-secondary/80 px-3.5 py-1.5 text-xs font-bold text-foreground backdrop-blur-xs shadow-xs hover:border-accent/40 transition-colors">
                📚 Livros EPUB
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-secondary/80 px-3.5 py-1.5 text-xs font-bold text-foreground backdrop-blur-xs shadow-xs hover:border-accent/40 transition-colors">
                🌐 Artigos Web & Links
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-secondary/80 px-3.5 py-1.5 text-xs font-bold text-foreground backdrop-blur-xs shadow-xs hover:border-accent/40 transition-colors">
                📝 Textos Digitados
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
