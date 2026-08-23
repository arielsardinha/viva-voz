import type { Metadata } from "next";
import { LandingHeader } from "@/components/landing/landing-header";
import { HeroSection } from "@/components/landing/hero-section";
import { BentoGridFeatures } from "@/components/landing/bento-grid-features";
import { HeroGraphFlow } from "@/components/landing/hero-graph-flow";
import { LeadInterestForm } from "@/components/landing/lead-interest-form";
import { LandingFooter } from "@/components/landing/landing-footer";
import { JsonLdSchema } from "@/components/landing/json-ld-schema";

export const metadata: Metadata = {
  title: "VivaVoz — Leitor de Texto em Áudio, Narração Neural & IA Contextual",
  description:
    "Landing page oficial do VivaVoz: converta PDFs, livros e documentos em áudio neural sincronizado em tempo real com Google Gemini e privacidade total.",
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
    title: "VivaVoz — Leitor de Texto em Áudio, Narração Neural & IA Contextual",
    description:
      "Transforme PDFs, artigos e documentos em áudio fluido com sincronização de sentenças e assistência inteligente por IA.",
    type: "website",
    locale: "pt_BR",
    url: "https://vivavoz.com",
    siteName: "VivaVoz",
  },
  twitter: {
    card: "summary_large_image",
    title: "VivaVoz — Leitor de Texto em Áudio & Narração Inteligente",
    description:
      "Transforme PDFs, artigos e documentos em áudio fluido com sincronização de sentenças e assistência inteligente por IA.",
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
        {/* 1. Hero Section com Proposta de Valor e CTAs */}
        <HeroSection />

        {/* 2. Bento Grid com Recursos Principais do Usuário */}
        <BentoGridFeatures />

        {/* 3. Fluxo de Processamento de Documentos e Áudio */}
        <section
          id="como-funciona"
          aria-label="Como o VivaVoz Funciona"
          className="relative py-12 sm:py-16 overflow-hidden"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <HeroGraphFlow />
          </div>
        </section>

        {/* 4. Chamada para Ação e Experimentação Direta */}
        <LeadInterestForm />
      </main>

      {/* Rodapé da Aplicação */}
      <LandingFooter />
    </div>
  );
}
