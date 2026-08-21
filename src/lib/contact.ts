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

export interface DeveloperContactConfig {
  email: string;
  githubIssuesUrl: string;
  categories: Record<ContactCategoryKey, ContactCategoryInfo>;
}

export const DEVELOPER_CONTACT_CONFIG: DeveloperContactConfig = {
  email: "ariel.contato.dev@gmail.com",
  githubIssuesUrl: "https://github.com",
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
};

export function generateMailtoLink(subject = "[VivaVoz] Contato com o Desenvolvedor"): string {
  return `mailto:${DEVELOPER_CONTACT_CONFIG.email}?subject=${encodeURIComponent(subject)}`;
}
