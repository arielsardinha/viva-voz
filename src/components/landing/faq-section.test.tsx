import { render, screen } from "@testing-library/react";
import { FaqSection } from "./faq-section";

describe("FaqSection Component", () => {
  it("deve renderizar as 4 perguntas frequentes e suas respostas", () => {
    render(<FaqSection />);

    expect(screen.getByRole("region", { name: /Perguntas Frequentes \(FAQ\)/i })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /Perguntas Frequentes \(FAQ\)/i })
    ).toBeInTheDocument();

    expect(screen.getByText("O Viva-Voz funciona no celular?")).toBeInTheDocument();
    expect(
      screen.getByText(/Sim! O Viva-Voz foi desenvolvido com arquitetura PWA/i)
    ).toBeInTheDocument();

    expect(screen.getByText("Meus arquivos ficam seguros?")).toBeInTheDocument();
    expect(
      screen.getByText(/Absolutamente. A extração e o processamento de texto de PDFs/i)
    ).toBeInTheDocument();

    expect(screen.getByText("O que a IA Gemini faz durante a leitura?")).toBeInTheDocument();
    expect(
      screen.getByText(/O assistente atua como um tutor acadêmico em tempo real/i)
    ).toBeInTheDocument();

    expect(screen.getByText("Preciso pagar para testar?")).toBeInTheDocument();
    expect(
      screen.getByText(/Não. O Viva-Voz é uma plataforma de código aberto e 100% gratuita/i)
    ).toBeInTheDocument();
  });
});
