import { render, screen } from "@testing-library/react";
import { LeadInterestForm } from "./lead-interest-form";

describe("LeadInterestForm Component", () => {
  it("deve renderizar a seção de CTA e chamada para o produto real", () => {
    render(<LeadInterestForm />);

    expect(
      screen.getByRole("heading", {
        name: /pronto para transformar a maneira como você lê\?/i,
      })
    ).toBeInTheDocument();

    const openReaderLink = screen.getByTestId("cta-open-reader");
    expect(openReaderLink).toBeInTheDocument();
    expect(openReaderLink).toHaveAttribute("href", "/leitor");

    const openLibraryLink = screen.getByTestId("cta-open-library");
    expect(openLibraryLink).toBeInTheDocument();
    expect(openLibraryLink).toHaveAttribute("href", "/leituras");

    const contactDevBtn = screen.getByTestId("cta-contact-dev");
    expect(contactDevBtn).toBeInTheDocument();
  });

  it("deve exibir selos de transparência e privacidade", () => {
    render(<LeadInterestForm />);

    expect(screen.getByText(/sem coleta de e-mails ou spam/i)).toBeInTheDocument();
    expect(screen.getByText(/100% gratuito & livre/i)).toBeInTheDocument();
  });
});
