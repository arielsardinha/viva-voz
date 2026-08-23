import {
  DEVELOPER_CONTACT_CONFIG,
  generateMailtoLink,
} from "./contact";

describe("Developer Contact Utilities", () => {
  it("deve conter categorias de orientação de contato válidas", () => {
    expect(DEVELOPER_CONTACT_CONFIG.categories).toHaveProperty("feature");
    expect(DEVELOPER_CONTACT_CONFIG.categories).toHaveProperty("ux");
    expect(DEVELOPER_CONTACT_CONFIG.categories).toHaveProperty("voice");
    expect(DEVELOPER_CONTACT_CONFIG.categories).toHaveProperty("general");

    // Não deve conter a opção bug
    expect(DEVELOPER_CONTACT_CONFIG.categories).not.toHaveProperty("bug");

    expect(DEVELOPER_CONTACT_CONFIG.categories.feature.title).toContain("Sugerir");
    expect(DEVELOPER_CONTACT_CONFIG.categories.ux.title).toContain("Usabilidade");
  });

  it("deve gerar link de mailto padrão codificado corretamente", () => {
    const mailto = generateMailtoLink();

    expect(mailto.startsWith("mailto:")).toBe(true);
    expect(mailto).toContain(DEVELOPER_CONTACT_CONFIG.email);
    expect(mailto).toContain(encodeURIComponent("[VivaVoz] Contato com o Desenvolvedor"));
  });

  it("deve conter as URLs oficiais do GitHub e comando de clone configurados", () => {
    expect(DEVELOPER_CONTACT_CONFIG.githubUrl).toBe("https://github.com/arielsardinha/viva-voz");
    expect(DEVELOPER_CONTACT_CONFIG.githubIssuesUrl).toBe("https://github.com/arielsardinha/viva-voz/issues");
    expect(DEVELOPER_CONTACT_CONFIG.githubPullsUrl).toBe("https://github.com/arielsardinha/viva-voz/pulls");
    expect(DEVELOPER_CONTACT_CONFIG.cloneCommand).toBe("git clone https://github.com/arielsardinha/viva-voz.git");
  });

  it("deve fornecer áreas de contribuição estruturadas", () => {
    expect(DEVELOPER_CONTACT_CONFIG.contributionAreas.length).toBeGreaterThanOrEqual(3);
    const codeArea = DEVELOPER_CONTACT_CONFIG.contributionAreas.find((a) => a.id === "code");
    expect(codeArea).toBeDefined();
    expect(codeArea?.title).toContain("Código");
  });
});
