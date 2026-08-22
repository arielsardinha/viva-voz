import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { SupportDialog } from "./support-dialog";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/clipboard";

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock("@/lib/clipboard", () => ({
  copyToClipboard: jest.fn().mockResolvedValue(true),
}));

describe("SupportDialog Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve renderizar o botão de acionamento de apoio", () => {
    render(<SupportDialog />);
    expect(
      screen.getByRole("button", { name: /apoiar.*vivavoz/i })
    ).toBeInTheDocument();
  });

  it("deve abrir o modal ao clicar no botão de apoio e exibir dados do Pix diretamente sem abas de desenvolvimento", async () => {
    render(<SupportDialog />);
    
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /apoiar.*vivavoz/i })
      );
    });

    expect(screen.getByRole("heading", { name: /apoie o vivavoz/i })).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /desenvolvimento/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/código aberto & comunidade/i)).not.toBeInTheDocument();

    expect(screen.getByText(/consultas com ia/i)).toBeInTheDocument();
    expect(screen.getByText(/vozes neurais de estúdio/i)).toBeInTheDocument();
    expect(screen.queryByText("QR Code Pix para Contribuição Voluntária")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/chave pix aleatória/i)).toHaveValue("d1b12e3a-a8db-4164-a580-91b6a172e77a");
    expect(screen.queryByText("Ariel Sardinha Moraes Santiago")).not.toBeInTheDocument();

    // QR Code está recolhido inicialmente
    expect(screen.queryByTestId("pix-qrcode-container")).not.toBeInTheDocument();

    // Ao clicar no toggle, exibe o QR Code e carrega o SVG
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /prefere escanear com a câmera/i }));
    });
    expect(screen.getByTestId("pix-qrcode-container")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText(/gerando\.\.\./i)).not.toBeInTheDocument();
      expect(screen.getByText(/abra o app do seu banco e aponte para o qr code acima/i)).toBeInTheDocument();
    });
  });

  it("deve copiar o código Pix (BR Code) e notificar ao clicar em 'Copiar Código Pix'", async () => {
    render(<SupportDialog />);

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /apoiar.*vivavoz/i })
      );
    });

    const copyBtn = screen.getByRole("button", { name: /copiar código pix/i });
    
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    await waitFor(() => {
      expect(copyToClipboard).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        "Código Pix copiado! Cole no aplicativo do seu banco."
      );
    });
  });

  it("deve copiar a chave Pix direta ao clicar em 'Copiar Chave'", async () => {
    render(<SupportDialog />);

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /apoiar.*vivavoz/i })
      );
    });

    const copyKeyBtn = screen.getByRole("button", { name: /copiar chave pix/i });
    
    await act(async () => {
      fireEvent.click(copyKeyBtn);
    });

    await waitFor(() => {
      expect(copyToClipboard).toHaveBeenCalledWith(
        "d1b12e3a-a8db-4164-a580-91b6a172e77a",
        expect.anything()
      );
      expect(toast.success).toHaveBeenCalledWith(
        "Chave Pix copiada com sucesso!"
      );
    });
  });
});

