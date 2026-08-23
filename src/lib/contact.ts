/**
 * Configuração e utilitários para canais de contato com o desenvolvedor do VivaVoz.
 */

export type ContactCategoryKey = "feature" | "ux" | "voice" | "general";

export interface ContactCategoryInfo {
  id: ContactCategoryKey;
  title: string;
  shortTitle: string;
  description: string;
  iconName: string;
}

export interface ContributionArea {
  id: string;
  title: string;
  description: string;
  iconName: string;
}

export interface DeveloperContactConfig {
  email: string;
  githubUrl: string;
  githubIssuesUrl: string;
  githubPullsUrl: string;
  cloneCommand: string;
  categories: Record<ContactCategoryKey, ContactCategoryInfo>;
  contributionAreas: ContributionArea[];
}

export const DEVELOPER_CONTACT_CONFIG: DeveloperContactConfig = {
  email: "ariel.contato.dev@gmail.com",
  githubUrl: "https://github.com/arielsardinha/viva-voz",
  githubIssuesUrl: "https://github.com/arielsardinha/viva-voz/issues",
  githubPullsUrl: "https://github.com/arielsardinha/viva-voz/pulls",
  cloneCommand: "git clone https://github.com/arielsardinha/viva-voz.git",
  categories: {
    feature: {
      id: "feature",
      title: "Sugerir Novos Recursos",
      shortTitle: "Novo Recurso",
      description: "Ideias de ferramentas, novos modos de estudo ou funções de áudio.",
      iconName: "Lightbulb",
    },
    ux: {
      id: "ux",
      title: "Usabilidade & Acessibilidade",
      shortTitle: "Usabilidade",
      description: "Dicas de layout, temas de cores, tamanhos de fonte ou atalhos.",
      iconName: "Palette",
    },
    voice: {
      id: "voice",
      title: "Vozes Neurais & Narração",
      shortTitle: "Vozes & Áudio",
      description: "Sugestões de entonações, vozes e suporte a outros idiomas.",
      iconName: "AudioWaveform",
    },
    general: {
      id: "general",
      title: "Dúvidas, Parcerias ou Feedback",
      shortTitle: "Dúvidas & Feedback",
      description: "Contato institucional, perguntas e impressões sobre o VivaVoz.",
      iconName: "MessageCircle",
    },
  },
  contributionAreas: [
    {
      id: "code",
      title: "Código & Novas Features",
      description: "Contribua com componentes React, hooks, adapters de arquivo e melhorias no Next.js.",
      iconName: "Code2",
    },
    {
      id: "a11y",
      title: "Acessibilidade & Design",
      description: "Ajude a aprimorar a experiência para leitores de tela, contrastes e navegação tátil.",
      iconName: "Palette",
    },
    {
      id: "ai-tts",
      title: "IA, OCR & Vozes Neurais",
      description: "Aprimore a inteligência multimodal, motores de TTS e sincronização de frases.",
      iconName: "Sparkles",
    },
    {
      id: "community",
      title: "Issues & Discussões",
      description: "Abra sugestões detalhadas, participe de discussões técnicas e teste novas versões.",
      iconName: "GitPullRequest",
    },
  ],
};

export function generateMailtoLink(subject = "[VivaVoz] Contato com o Desenvolvedor"): string {
  return `mailto:${DEVELOPER_CONTACT_CONFIG.email}?subject=${encodeURIComponent(subject)}`;
}
