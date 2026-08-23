import { render, screen, fireEvent } from "@testing-library/react";
import { StorageQuotaModal } from "./storage-quota-modal";

const mockConnect = jest.fn();

jest.mock("@/hooks/use-google-drive-sync", () => ({
  useGoogleDriveSync: () => ({
    connect: mockConnect,
    isLoading: false,
    status: { isConnected: false },
  }),
}));

describe("StorageQuotaModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve renderizar o modal quando open=true com título de memória insuficiente", () => {
    render(<StorageQuotaModal open={true} onOpenChange={jest.fn()} />);

    expect(screen.getByText("Memória Interna Insuficiente")).toBeInTheDocument();
    expect(screen.getByText("Armazenamento Cheio")).toBeInTheDocument();
    expect(
      screen.getByText(/O seu armazenamento local \(IndexedDB\) atingiu o limite de capacidade/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Conectar com Google Drive/i })
    ).toBeInTheDocument();
  });

  it("deve disparar a função connect e fechar modal ao clicar em Conectar", () => {
    const onOpenChange = jest.fn();
    render(<StorageQuotaModal open={true} onOpenChange={onOpenChange} />);

    const connectButton = screen.getByRole("button", { name: /Conectar com Google Drive/i });
    fireEvent.click(connectButton);

    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("deve permitir fechar pelo botão Voltar", () => {
    const onOpenChange = jest.fn();
    render(<StorageQuotaModal open={true} onOpenChange={onOpenChange} />);

    const backButton = screen.getByRole("button", { name: /Voltar ao início/i });
    fireEvent.click(backButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
