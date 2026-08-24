import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DeveloperContactDialog } from "./developer-contact-dialog";
import * as clipboardModule from "@/lib/clipboard";
import { DEVELOPER_CONTACT_CONFIG } from "@/lib/contact";

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

  it("deve abrir o modal ao clicar no botão de trigger e exibir abas de navegação", () => {
    render(<DeveloperContactDialog />);

    const triggerBtn = screen.getByRole("button", {
      name: /entrar em contato com o desenvolvedor/i,
    });
    fireEvent.click(triggerBtn);

    expect(screen.getByText("Falar com o Desenvolvedor")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /contato/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /contribuir/i })).toBeInTheDocument();
  });

  it("deve exibir as orientações de contato na aba padrão e não conter botão de WhatsApp", () => {
    render(<DeveloperContactDialog open={true} />);

    expect(screen.getByText(/sugerir novos recursos/i)).toBeInTheDocument();
    expect(screen.getByText(/usabilidade & acessibilidade/i)).toBeInTheDocument();
    expect(screen.getByText(/vozes neurais & narração/i)).toBeInTheDocument();
    expect(screen.getByText(/dúvidas, parcerias ou feedback/i)).toBeInTheDocument();

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
        DEVELOPER_CONTACT_CONFIG.email,
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

  it("deve alternar para a aba 'Contribuir com o Projeto' e exibir informações open source", () => {
    render(<DeveloperContactDialog open={true} />);

    const contributeTab = screen.getByRole("tab", { name: /contribuir/i });
    fireEvent.pointerDown(contributeTab, { button: 0, ctrlKey: false });
    fireEvent.click(contributeTab);

    // Card Open Source
    expect(screen.getByText(/projeto 100% livre & código aberto/i)).toBeInTheDocument();
    expect(screen.getByText(/código & features/i)).toBeInTheDocument();
    expect(screen.getByText(/design & a11y/i)).toBeInTheDocument();
    expect(screen.getByText(/ia & vozes/i)).toBeInTheDocument();

    // Links para GitHub
    const repoLink = screen.getByRole("link", { name: /repositório github/i });
    expect(repoLink).toHaveAttribute("href", DEVELOPER_CONTACT_CONFIG.githubUrl);
    expect(repoLink).toHaveAttribute("target", "_blank");

    const issuesLink = screen.getByRole("link", { name: /ver issues & ideias/i });
    expect(issuesLink).toHaveAttribute("href", DEVELOPER_CONTACT_CONFIG.githubIssuesUrl);
    expect(issuesLink).toHaveAttribute("target", "_blank");

    // Passos de Como Começar
    expect(screen.getByText(/como enviar sua primeira contribuição:/i)).toBeInTheDocument();
  });

  it("deve permitir abrir diretamente na aba de contribuição via prop defaultTab", () => {
    render(<DeveloperContactDialog open={true} defaultTab="contribute" />);

    expect(screen.getByText(/projeto 100% livre & código aberto/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /repositório github/i })).toBeInTheDocument();
  });

  it("deve copiar o comando de clone ao clicar no botão de copiar da aba de contribuição", async () => {
    render(<DeveloperContactDialog open={true} defaultTab="contribute" />);

    const copyCloneBtn = screen.getByRole("button", {
      name: /copiar comando de clone/i,
    });
    fireEvent.click(copyCloneBtn);

    await waitFor(() => {
      expect(clipboardModule.copyToClipboard).toHaveBeenCalledWith(
        DEVELOPER_CONTACT_CONFIG.cloneCommand,
        expect.anything()
      );
    });
  });
});
