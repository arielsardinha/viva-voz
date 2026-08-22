import { render, screen, fireEvent } from "@testing-library/react";
import { GoogleDrivePermissionModal } from "./google-drive-permission-modal";

describe("GoogleDrivePermissionModal", () => {
  it("deve renderizar o título e a opção exata do Google Drive quando aberto", () => {
    render(
      <GoogleDrivePermissionModal
        open={true}
        onOpenChange={jest.fn()}
        onConnect={jest.fn()}
      />
    );

    expect(screen.getByText("Permissão Necessária")).toBeInTheDocument();
    expect(
      screen.getByText("Ver, criar e excluir os próprios dados de configuração no Google Drive.")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /conectar e permitir acesso/i })
    ).toBeInTheDocument();
  });

  it("deve disparar onConnect e fechar o modal ao clicar em Conectar", () => {
    const handleOpenChange = jest.fn();
    const handleConnect = jest.fn();

    render(
      <GoogleDrivePermissionModal
        open={true}
        onOpenChange={handleOpenChange}
        onConnect={handleConnect}
      />
    );

    const connectBtn = screen.getByRole("button", { name: /conectar e permitir acesso/i });
    fireEvent.click(connectBtn);

    expect(handleOpenChange).toHaveBeenCalledWith(false);
    expect(handleConnect).toHaveBeenCalled();
  });
});
