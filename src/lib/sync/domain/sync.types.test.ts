import { ManifestPreferencesSchema } from "./sync.types";

describe("ManifestPreferencesSchema", () => {
  it("aceita ai-study e zen e aplica default ai-study", () => {
    const parsedDefault = ManifestPreferencesSchema.parse({
      readerSettings: {
        theme: "light",
        font: "inter",
        fontSize: 18,
        lineHeight: 1.8,
        hasCompletedOnboarding: true,
      },
    });
    expect(parsedDefault.readerSettings?.template).toBe("ai-study");

    const parsedZen = ManifestPreferencesSchema.parse({
      readerSettings: {
        template: "zen",
      },
    });
    expect(parsedZen.readerSettings?.template).toBe("zen");
  });

  it("migra template legado 'modern' para 'ai-study' sem falha de schema", () => {
    const parsedLegacy = ManifestPreferencesSchema.parse({
      readerSettings: {
        template: "modern",
        theme: "sepia",
        font: "source-serif",
        fontSize: 19,
        lineHeight: 1.8,
        hasCompletedOnboarding: true,
      },
    });

    expect(parsedLegacy.readerSettings?.template).toBe("ai-study");
    expect(parsedLegacy.readerSettings?.theme).toBe("sepia");
  });
});
