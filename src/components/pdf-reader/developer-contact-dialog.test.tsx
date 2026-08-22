import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DeveloperContactDialog } from "./developer-contact-dialog";
import * as clipboardModule from "@/lib/clipboard";

// Mock do módulo de clipboard
jest.mock("@/lib/clipboard", () => ({
  copyToClipboard: jest.fn().mockResolvedValue(true),
}));

// Mock do toast do sonner
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe("DeveloperContactDialog Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve renderizar o botão de trigger de contato no estado fechado", () => {
    render(<DeveloperContactDialog />);

    const triggerBtn = screen.getByRole("button", {
      name: /entrar em contato com o desenvolvedor/i,
    });
    expect(triggerBtn).toBeInTheDocument();
    expect(triggerBtn).toHaveTextContent(/contato/i);
  });

  it("deve abrir o modal ao clicar no botão de trigger", () => {
    render(<DeveloperContactDialog />);

    const triggerBtn = screen.getByRole("button", {
      name: /entrar em contato com o desenvolvedor/i,
    });
    fireEvent.click(triggerBtn);

    expect(screen.getByText("Falar com o Desenvolvedor")).toBeInTheDocument();
  });

  it("deve exibir as orientações de quando enviar e-mail e não conter opção de bug nem WhatsApp", () => {
    render(<DeveloperContactDialog open={true} />);

    expect(screen.getByText(/sugerir novos recursos/i)).toBeInTheDocument();
    expect(screen.getByText(/usabilidade & acessibilidade/i)).toBeInTheDocument();
    expect(screen.getByText(/vozes neurais & narração/i)).toBeInTheDocument();
    expect(screen.getByText(/dúvidas, parcerias ou feedback/i)).toBeInTheDocument();

    // NÃO deve conter a opção Reportar Erro / Bug
    expect(screen.queryByText(/reportar erro/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/reportar um bug/i)).not.toBeInTheDocument();

    // NÃO deve conter o link de abrir issue no GitHub
    expect(screen.queryByText(/abrir issue no github/i)).not.toBeInTheDocument();

    // NÃO deve conter o botão de WhatsApp
    expect(screen.queryByRole("button", { name: /falar via whatsapp/i })).not.toBeInTheDocument();
  });

  it("deve copiar o e-mail do desenvolvedor ao clicar no botão de copiar", async () => {
    render(<DeveloperContactDialog open={true} />);

    const copyBtn = screen.getByRole("button", {
      name: /copiar e-mail/i,
    });
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(clipboardModule.copyToClipboard).toHaveBeenCalledWith(
        "ariel.contato.dev@gmail.com",
        expect.anything()
      );
    });
  });

  it("deve disparar abertura de e-mail ao clicar no botão principal de enviar e-mail", () => {
    render(<DeveloperContactDialog open={true} />);

    const mailBtn = screen.getByRole("button", {
      name: /enviar e-mail para o desenvolvedor/i,
    });
    expect(mailBtn).toBeInTheDocument();
  });
});
