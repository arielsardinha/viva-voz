import { render, screen, fireEvent } from "@testing-library/react";
import { BentoGridFeatures } from "./bento-grid-features";

describe("BentoGridFeatures Component", () => {
  it("deve renderizar a seção de features e o cabeçalho H2", () => {
    render(<BentoGridFeatures />);
    expect(screen.getByRole("region", { name: /Pilares e Recursos Principais/i })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /Pilares e Recursos Principais/i,
      })
    ).toBeInTheDocument();
  });

  it("deve renderizar os 3 cards principais com atributos aria-describedby", () => {
    render(<BentoGridFeatures />);

    const ttsCard = screen.getByTestId("bento-card-feature-tts");
    expect(ttsCard).toBeInTheDocument();
    expect(screen.getByText("Escuta Fluida com Realce em Tempo Real")).toBeInTheDocument();
    expect(document.getElementById("desc-feature-tts")).toBeInTheDocument();

    const aiCard = screen.getByTestId("bento-card-feature-ai");
    expect(aiCard).toBeInTheDocument();
    expect(screen.getByText("Converse com o seu Documento via Gemini")).toBeInTheDocument();
    expect(document.getElementById("desc-feature-ai")).toBeInTheDocument();

    const syncCard = screen.getByTestId("bento-card-feature-sync");
    expect(syncCard).toBeInTheDocument();
    expect(screen.getByText("Seus Arquivos Salvos no Seu Google Drive")).toBeInTheDocument();
    expect(document.getElementById("desc-feature-sync")).toBeInTheDocument();
  });

  it("deve aplicar efeito e animação no hover dos cards", () => {
    render(<BentoGridFeatures />);
    const ttsCard = screen.getByTestId("bento-card-feature-tts");

    expect(ttsCard).toHaveClass("border-glow");
    fireEvent.mouseEnter(ttsCard);
    expect(ttsCard).toBeInTheDocument();
    fireEvent.mouseLeave(ttsCard);
  });
});
