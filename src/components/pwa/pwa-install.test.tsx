import { render, screen, fireEvent } from "@testing-library/react";
import { PwaInstallButton } from "./pwa-install-button";
import { PwaInstallDialog } from "./pwa-install-dialog";
import { usePwaInstall } from "@/hooks/use-pwa-install";

jest.mock("@/hooks/use-pwa-install", () => ({
  usePwaInstall: jest.fn(),
}));

describe("PWA Install Components", () => {
  const mockUsePwaInstall = usePwaInstall as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("PwaInstallButton", () => {
    it("não deve renderizar se o app já estiver instalado", () => {
      mockUsePwaInstall.mockReturnValue({
        canInstall: true,
        isInstalled: true,
        isIos: false,
        promptInstall: jest.fn(),
      });

      const { container } = render(<PwaInstallButton />);
      expect(container.firstChild).toBeNull();
    });

    it("deve renderizar o botão quando o app for instalável", () => {
      mockUsePwaInstall.mockReturnValue({
        canInstall: true,
        isInstalled: false,
        isIos: false,
        promptInstall: jest.fn(),
      });

      render(<PwaInstallButton variant="default" />);
      expect(screen.getByRole("button", { name: /instalar aplicativo vivavoz/i })).toBeInTheDocument();
    });

    it("deve abrir o diálogo ao clicar no botão", () => {
      mockUsePwaInstall.mockReturnValue({
        canInstall: true,
        isInstalled: false,
        isIos: false,
        promptInstall: jest.fn(),
      });

      render(<PwaInstallButton variant="default" />);
      fireEvent.click(screen.getByRole("button", { name: /instalar aplicativo vivavoz/i }));

      expect(screen.getByText("Instalar o VivaVoz")).toBeInTheDocument();
      expect(screen.getByText("100% Offline")).toBeInTheDocument();
    });
  });

  describe("PwaInstallDialog", () => {
    it("deve renderizar instruções do iOS quando isIos for true", () => {
      mockUsePwaInstall.mockReturnValue({
        canInstall: true,
        isInstalled: false,
        isIos: true,
        promptInstall: jest.fn(),
      });

      render(<PwaInstallDialog open={true} onOpenChange={jest.fn()} />);

      expect(screen.getByText(/como instalar no safari do iphone/i)).toBeInTheDocument();
      expect(screen.getByText(/adicionar à tela de início/i)).toBeInTheDocument();
    });

    it("deve renderizar botão Instalar Agora para navegadores padrão quando instalável", () => {
      mockUsePwaInstall.mockReturnValue({
        canInstall: true,
        isInstalled: false,
        isIos: false,
        promptInstall: jest.fn(),
      });

      render(<PwaInstallDialog open={true} onOpenChange={jest.fn()} />);

      expect(screen.getByRole("button", { name: /instalar agora/i })).toBeInTheDocument();
    });
  });
});
