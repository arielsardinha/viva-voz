import { render } from "@testing-library/react";
import { JsonLdSchema } from "./json-ld-schema";

describe("JsonLdSchema Component", () => {
  it("deve renderizar o script JSON-LD com os esquemas SoftwareApplication, Organization, WebPage e AudioObjects", () => {
    const { container } = render(<JsonLdSchema />);
    const script = container.querySelector("script[type='application/ld+json']");

    expect(script).toBeInTheDocument();
    const json = JSON.parse(script?.innerHTML || "{}");

    expect(json["@context"]).toBe("https://schema.org");
    expect(json["@graph"]).toHaveLength(3);

    const types = json["@graph"].map((item: any) => item["@type"]);
    expect(types).toContain("SoftwareApplication");
    expect(types).toContain("Organization");
    expect(types).toContain("WebPage");

    const software = json["@graph"].find((item: any) => item["@type"] === "SoftwareApplication");
    expect(software.name).toBe("VivaVoz");
    expect(software.applicationCategory).toBe("MultimediaApplication");
    expect(software.operatingSystem).toBe("Any / Web PWA");
    expect(software.url).toBe("https://www.viva-voz.com");

    const org = json["@graph"].find((item: any) => item["@type"] === "Organization");
    expect(org.name).toBe("VivaVoz Open Source");
    expect(org.url).toBe("https://www.viva-voz.com");
    expect(org.logo).toBe("https://www.viva-voz.com/icon.svg");

    const webpage = json["@graph"].find((item: any) => item["@type"] === "WebPage");
    expect(webpage.inLanguage).toBe("pt-BR");
    expect(webpage.url).toBe("https://www.viva-voz.com");
    expect(webpage.audio).toHaveLength(4);

    expect(webpage.audio[0]).toMatchObject({
      "@type": "AudioObject",
      contentUrl: "https://www.viva-voz.com/audio/01.mp3",
      encodingFormat: "audio/mpeg",
      transcript: "VivaVoz é uma plataforma aberta para audição inteligente de documentos e livros digitais.",
    });

    expect(webpage.audio[3]).toMatchObject({
      "@type": "AudioObject",
      contentUrl: "https://www.viva-voz.com/audio/04.mp3",
      encodingFormat: "audio/mpeg",
      transcript: "Tudo funciona com privacidade absoluta: seus dados são seus e armazenados com segurança no navegador e no Google Drive.",
    });
  });
});