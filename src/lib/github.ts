/**
 * Configuração e utilitários para apoio ao desenvolvimento do VivaVoz no GitHub.
 */

export interface VivaVozGithubConfig {
  repositoryUrl: string;
  issuesUrl: string;
  starsUrl: string;
  pullRequestsUrl: string;
  owner: string;
  repo: string;
}

export const VIVA_VOZ_GITHUB_CONFIG: VivaVozGithubConfig = {
  owner: "arielsardinha",
  repo: "viva-voz",
  repositoryUrl: "https://github.com/arielsardinha/viva-voz",
  issuesUrl: "https://github.com/arielsardinha/viva-voz/issues",
  starsUrl: "https://github.com/arielsardinha/viva-voz/stargazers",
  pullRequestsUrl: "https://github.com/arielsardinha/viva-voz/pulls",
};

export const GITHUB_SUPPORT_POINTS = [
  {
    id: "star",
    title: "Deixar uma Estrela (Star)",
    description: "Ajude o VivaVoz a alcançar mais pessoas e ganhar destaque no GitHub.",
  },
  {
    id: "ideas",
    title: "Sugerir Novas Ideias & Recursos",
    description: "Abra issues com ideias de novas ferramentas, modos de estudo e temas.",
  },
  {
    id: "bugs",
    title: "Relatar Problemas & Bugs",
    description: "Ajude a manter o leitor cada vez mais estável, rápido e acessível.",
  },
  {
    id: "code",
    title: "Contribuir com Código & PRs",
    description: "Envie melhorias no frontend, novas integrações de voz ou documentação.",
  },
] as const;
