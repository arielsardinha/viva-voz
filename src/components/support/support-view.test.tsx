import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { SupportView } from "./support-view";
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

describe("SupportView Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve renderizar o título da página e os dados do Pix sem nome pessoal e sem texto redundante", async () => {
    render(<SupportView />);

    expect(screen.getByRole("heading", { name: /apoie o vivavoz/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/chave pix aleatória/i)).toHaveValue("d1b12e3a-a8db-4164-a580-91b6a172e77a");
    expect(screen.queryByText("Ariel Sardinha Moraes Santiago")).not.toBeInTheDocument();

    // QR Code está recolhido inicialmente
    expect(screen.queryByTestId("pix-qrcode-container")).not.toBeInTheDocument();

    // Ao clicar no toggle, exibe o QR Code
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /prefere escanear com a câmera/i }));
    });
    expect(screen.getByTestId("pix-qrcode-container")).toBeInTheDocument();
  });

  it("deve permitir copiar o código Pix com feedback de toast", async () => {
    render(<SupportView />);

    const copyCodeBtn = screen.getByRole("button", { name: /copiar código pix/i });
    
    await act(async () => {
      fireEvent.click(copyCodeBtn);
    });

    await waitFor(() => {
      expect(copyToClipboard).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        "Código Pix copiado! Cole no aplicativo do seu banco."
      );
    });
  });

  it("deve permitir copiar a chave Pix com feedback de toast", async () => {
    render(<SupportView />);

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
