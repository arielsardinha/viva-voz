import { render, screen, fireEvent } from "@testing-library/react";
import { HeroSection } from "./hero-section";
import { HeroGraphFlow } from "./hero-graph-flow";
import { ReaderSettingsProvider } from "@/context/reader-settings-context";

describe("HeroSection Component", () => {
  const renderHero = () =>
    render(
      <ReaderSettingsProvider>
        <HeroSection />
      </ReaderSettingsProvider>
    );

  it("deve renderizar o título H1 com a proposta de valor acolhedora e impactante", () => {
    renderHero();
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toBeInTheDocument();
    expect(h1).toHaveTextContent(/Leitura Neural, Áudio Sincronizado/i);
    expect(h1).toHaveTextContent(/IA Contextual/i);
  });

  it("deve renderizar os dois botões de CTA acessíveis", () => {
    renderHero();
    const primaryCta = screen.getByTestId("hero-cta-primary");
    const secondaryCta = screen.getByTestId("hero-cta-secondary");

    expect(primaryCta).toBeInTheDocument();
    expect(primaryCta).toHaveTextContent(/Iniciar Gratuito/i);
    expect(primaryCta).toHaveAttribute("href", "/leitor");

    expect(secondaryCta).toBeInTheDocument();
    expect(secondaryCta).toHaveTextContent(/Ver Demonstração/i);
  });

  it("deve abrir o modal interativo de demonstração ao clicar em Ver Demonstração", () => {
    renderHero();
    const secondaryCta = screen.getByTestId("hero-cta-secondary");
    fireEvent.click(secondaryCta);

    expect(screen.getByTestId("interactive-demo-modal")).toBeInTheDocument();
    expect(screen.getByText("Demonstração Interativa VivaVoz")).toBeInTheDocument();
  });
});

describe("HeroGraphFlow Component", () => {
  it("deve renderizar o visualizador de fluxo com nós de processamento", () => {
    render(<HeroGraphFlow />);
    expect(screen.getByTestId("hero-graph-flow-container")).toBeInTheDocument();
    expect(screen.getByText("Como o VivaVoz Funciona por Dentro")).toBeInTheDocument();

    // Valida presença dos nós do fluxo
    expect(screen.getByTestId("graph-node-doc-input")).toBeInTheDocument();
    expect(screen.getByTestId("graph-node-splitter-ocr")).toBeInTheDocument();
    expect(screen.getByTestId("graph-node-ai-engine")).toBeInTheDocument();
    expect(screen.getByTestId("graph-node-tts-stream")).toBeInTheDocument();
    expect(screen.getByTestId("graph-node-storage-sync")).toBeInTheDocument();
  });
});
