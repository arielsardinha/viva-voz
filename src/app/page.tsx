import type { Metadata } from "next";
import { LandingHeader } from "@/components/landing/landing-header";
import { HeroSection } from "@/components/landing/hero-section";
import { BentoGridFeatures } from "@/components/landing/bento-grid-features";
import { HeroGraphFlow } from "@/components/landing/hero-graph-flow";
import { UseCasesSection } from "@/components/landing/use-cases-section";
import { FaqSection } from "@/components/landing/faq-section";
import { LeadInterestForm } from "@/components/landing/lead-interest-form";
import { LandingFooter } from "@/components/landing/landing-footer";
import { JsonLdSchema } from "@/components/landing/json-ld-schema";

export const metadata: Metadata = {
  title: "VivaVoz — Ouça qualquer documento como se fosse um audiolivro",
  description:
    "Transforme PDFs, artigos e livros em vozes ultra-realistas. Acompanhe a leitura com frases destacadas em tempo real e tire dúvidas com o assistente Gemini integrado.",
  keywords: [
    "leitor de pdf em audio",
    "tts portugues",
    "leitor de texto com voz",
    "leitura acessivel",
    "gemini pdf chat",
    "narração de livros",
    "graph flow",
    "webmcp",
  ],
  authors: [{ name: "VivaVoz Open Source" }],
  creator: "VivaVoz",
  openGraph: {
    title: "VivaVoz — Ouça qualquer documento como se fosse um audiolivro",
    description:
      "Transforme PDFs, artigos e livros em vozes ultra-realistas. Acompanhe a leitura com frases destacadas em tempo real e tire dúvidas com o assistente Gemini integrado.",
    type: "website",
    locale: "pt_BR",
    url: "https://vivavoz.com",
    siteName: "VivaVoz",
  },
  twitter: {
    card: "summary_large_image",
    title: "VivaVoz — Ouça qualquer documento como se fosse um audiolivro",
    description:
      "Transforme PDFs, artigos e livros em vozes ultra-realistas. Acompanhe a leitura com frases destacadas em tempo real e tire dúvidas com o assistente Gemini integrado.",
  },
  alternates: {
    canonical: "https://vivavoz.com",
  },
};

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-accent selection:text-accent-foreground">
      {/* Schema.org JSON-LD Estruturado */}
      <JsonLdSchema />

      {/* Header com Navegação e Drawer Mobile */}
      <LandingHeader />

      {/* Conteúdo Principal Landmark */}
      <main id="main-content" className="flex-1 w-full overflow-x-hidden">
        {/* 1. Hero Section com Proposta de Valor, CTAs e 2. Formatos Suportados */}
        <HeroSection />

        {/* 3. Pilares e Recursos Principais (Cards de Funcionalidades) */}
        <BentoGridFeatures />

        {/* 4. Como Funciona (3 Passos) */}
        <section
          id="como-funciona"
          aria-label="Como o VivaVoz Funciona"
          className="relative py-12 sm:py-16 overflow-hidden"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <HeroGraphFlow />
          </div>
        </section>

        {/* 5. Casos de Uso / Público */}
        <UseCasesSection />

        {/* 6. Perguntas Frequentes (FAQ) */}
        <FaqSection />

        {/* 7. Banner Final (CTA de Rodapé) */}
        <LeadInterestForm />
      </main>

      {/* Rodapé da Aplicação */}
      <LandingFooter />
    </div>
  );
}
