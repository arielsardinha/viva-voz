import { render, screen } from "@testing-library/react";
import { UseCasesSection } from "./use-cases-section";

describe("UseCasesSection Component", () => {
  it("deve renderizar a seção de Casos de Uso & Público com os 3 perfis", () => {
    render(<UseCasesSection />);

    expect(screen.getByRole("region", { name: /Casos de Uso & Público/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /Casos de Uso & Público/i })).toBeInTheDocument();

    expect(screen.getByText("Estudantes & Concurseiros")).toBeInTheDocument();
    expect(
      screen.getByText(/Devore apostilas e legislações densas em menos tempo/i)
    ).toBeInTheDocument();

    expect(screen.getByText("Pesquisadores & Profissionais")).toBeInTheDocument();
    expect(
      screen.getByText(/Converta artigos e relatórios técnicos em áudio/i)
    ).toBeInTheDocument();

    expect(screen.getByText("Foco & Acessibilidade (TDAH e Dislexia)")).toBeInTheDocument();
    expect(
      screen.getByText(/Reduza o cansaço visual e a dispersão mental/i)
    ).toBeInTheDocument();
  });
});
