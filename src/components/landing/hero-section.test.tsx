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
    expect(h1).toHaveTextContent(/Ouça qualquer documento como se fosse um audiolivro/i);
  });

  it("deve renderizar o badge superior, subtítulo H2 e formatos suportados", () => {
    renderHero();
    expect(screen.getByText(/⚡ Leitor Inteligente de Texto para Voz com IA/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Transforme PDFs, artigos e livros em vozes ultra-realistas/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Compatível com tudo o que você precisa ler:/i)).toBeInTheDocument();
    expect(screen.getByText(/📄 Arquivos PDF/i)).toBeInTheDocument();
    expect(screen.getByText(/📚 Livros EPUB/i)).toBeInTheDocument();
    expect(screen.getByText(/🌐 Artigos Web & Links/i)).toBeInTheDocument();
    expect(screen.getByText(/📝 Textos Digitados/i)).toBeInTheDocument();
  });

  it("deve renderizar os dois botões de CTA acessíveis", () => {
    renderHero();
    const primaryCta = screen.getByTestId("hero-cta-primary");
    const secondaryCta = screen.getByTestId("hero-cta-secondary");

    expect(primaryCta).toBeInTheDocument();
    expect(primaryCta).toHaveTextContent(/Começar a Ouvir Gratuitamente/i);
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
  it("deve renderizar o visualizador de fluxo com os 3 passos de Como Funciona", () => {
    render(<HeroGraphFlow />);
    expect(screen.getByTestId("hero-graph-flow-container")).toBeInTheDocument();
    expect(screen.getByText("Como Funciona")).toBeInTheDocument();

    // Valida presença dos 3 passos do fluxo
    expect(screen.getByTestId("graph-node-step-1")).toBeInTheDocument();
    expect(screen.getByTestId("graph-node-step-2")).toBeInTheDocument();
    expect(screen.getByTestId("graph-node-step-3")).toBeInTheDocument();
  });
});
