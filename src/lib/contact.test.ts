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
});
