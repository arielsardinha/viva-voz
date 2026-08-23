import { render, screen, fireEvent } from "@testing-library/react";
import { BentoGridFeatures } from "./bento-grid-features";

describe("BentoGridFeatures Component", () => {
  it("deve renderizar a seção de features e o cabeçalho H2", () => {
    render(<BentoGridFeatures />);
    expect(screen.getByRole("region", { name: /Arquitetura Desenvolvida para Leitura Imersiva/i })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /Arquitetura Desenvolvida para Leitura Imersiva/i,
      })
    ).toBeInTheDocument();
  });

  it("deve renderizar todos os cards do Bento Grid com atributos aria-describedby", () => {
    render(<BentoGridFeatures />);

    const ttsCard = screen.getByTestId("bento-card-feature-tts");
    expect(ttsCard).toBeInTheDocument();
    expect(screen.getByText("Narração Neural com Sincronismo em Tempo Real")).toBeInTheDocument();
    expect(document.getElementById("desc-feature-tts")).toBeInTheDocument();

    const aiCard = screen.getByTestId("bento-card-feature-ai");
    expect(aiCard).toBeInTheDocument();
    expect(screen.getByText("Chat Inteligente com Gemini 2.5 & BYOK")).toBeInTheDocument();
    expect(document.getElementById("desc-feature-ai")).toBeInTheDocument();

    const ocrCard = screen.getByTestId("bento-card-feature-ocr");
    expect(ocrCard).toBeInTheDocument();
    expect(screen.getByText("Multi-Formato Universal & OCR Visual")).toBeInTheDocument();
    expect(document.getElementById("desc-feature-ocr")).toBeInTheDocument();

    const themesCard = screen.getByTestId("bento-card-feature-themes");
    expect(themesCard).toBeInTheDocument();
    expect(screen.getByText("Modos de Leitura Ergonômicos")).toBeInTheDocument();
    expect(document.getElementById("desc-feature-themes")).toBeInTheDocument();

    const syncCard = screen.getByTestId("bento-card-feature-sync");
    expect(syncCard).toBeInTheDocument();
    expect(screen.getByText("Privacidade Local & Google Drive Sync")).toBeInTheDocument();
    expect(document.getElementById("desc-feature-sync")).toBeInTheDocument();

    const agenticCard = screen.getByTestId("bento-card-feature-agentic");
    expect(agenticCard).toBeInTheDocument();
    expect(screen.getByText("Agent-Ready & WebMCP Compliant")).toBeInTheDocument();
    expect(document.getElementById("desc-feature-agentic")).toBeInTheDocument();
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
