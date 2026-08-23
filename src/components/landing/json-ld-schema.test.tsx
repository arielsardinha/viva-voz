import { render } from "@testing-library/react";
import { JsonLdSchema } from "./json-ld-schema";

describe("JsonLdSchema Component", () => {
  it("deve renderizar o script JSON-LD com os esquemas SoftwareApplication, Organization e WebPage", () => {
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

    const org = json["@graph"].find((item: any) => item["@type"] === "Organization");
    expect(org.name).toBe("VivaVoz Open Source");
    expect(org.url).toBe("https://vivavoz.com");
    expect(org.logo).toBe("https://vivavoz.com/icon.svg");

    const webpage = json["@graph"].find((item: any) => item["@type"] === "WebPage");
    expect(webpage.inLanguage).toBe("pt-BR");
  });
});
