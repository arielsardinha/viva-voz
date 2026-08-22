import {
  VIVA_VOZ_GITHUB_CONFIG,
  GITHUB_SUPPORT_POINTS,
} from "./github";

describe("GitHub Configuration & Support Utilities", () => {
  it("deve conter as URLs corretas do repositório oficial no GitHub", () => {
    expect(VIVA_VOZ_GITHUB_CONFIG.repositoryUrl).toBe(
      "https://github.com/arielsardinha/viva-voz"
    );
    expect(VIVA_VOZ_GITHUB_CONFIG.issuesUrl).toBe(
      "https://github.com/arielsardinha/viva-voz/issues"
    );
    expect(VIVA_VOZ_GITHUB_CONFIG.starsUrl).toBe(
      "https://github.com/arielsardinha/viva-voz/stargazers"
    );
    expect(VIVA_VOZ_GITHUB_CONFIG.owner).toBe("arielsardinha");
    expect(VIVA_VOZ_GITHUB_CONFIG.repo).toBe("viva-voz");
  });

  it("deve definir pontos de apoio de desenvolvimento claros", () => {
    expect(GITHUB_SUPPORT_POINTS.length).toBeGreaterThanOrEqual(4);
    const ids = GITHUB_SUPPORT_POINTS.map((p) => p.id);
    expect(ids).toContain("star");
    expect(ids).toContain("ideas");
    expect(ids).toContain("bugs");
    expect(ids).toContain("code");
  });
});
