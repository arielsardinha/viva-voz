import { render, screen, fireEvent } from "@testing-library/react";
import { LibrarySidebar } from "./library-sidebar";

// Mock do GoogleDriveSyncButton para isolar o componente
jest.mock("@/components/sync/google-drive-sync-button", () => ({
  GoogleDriveSyncButton: ({ className }: { className?: string }) => (
    <button type="button" className={className} data-testid="google-drive-sync-btn">
      Sincronizar com Google Drive
    </button>
  ),
}));

const defaultProps = {
  activeTab: "library" as const,
  documentCount: 5,
  favoritesCount: 2,
  totalBytes: 2 * 1024 * 1024, // 2 MB
  audioCacheStats: { totalBytes: 512 * 1024, totalTracks: 3 },
  hasApiKey: false,
  maskedKey: null,
  onTabChange: jest.fn(),
  onClearAudioCache: jest.fn(),
  onConnectGemini: jest.fn(),
  onDisconnectGemini: jest.fn(),
};

describe("LibrarySidebar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Navegação de tabs", () => {
    it("deve renderizar os dois botões de navegação", () => {
      render(<LibrarySidebar {...defaultProps} />);
      expect(screen.getByRole("button", { name: /biblioteca/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /favoritos/i })).toBeInTheDocument();
    });

    it("deve exibir a contagem de documentos no botão Biblioteca", () => {
      render(<LibrarySidebar {...defaultProps} />);
      expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("deve exibir a contagem de favoritos no botão Favoritos", () => {
      render(<LibrarySidebar {...defaultProps} />);
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("deve chamar onTabChange com 'library' ao clicar em Biblioteca", () => {
      render(<LibrarySidebar {...defaultProps} activeTab="favorites" />);
      const libraryBtn = screen.getByRole("button", { name: /biblioteca/i });
      fireEvent.click(libraryBtn);
      expect(defaultProps.onTabChange).toHaveBeenCalledWith("library");
    });

    it("deve chamar onTabChange com 'favorites' ao clicar em Favoritos", () => {
      render(<LibrarySidebar {...defaultProps} activeTab="library" />);
      const favBtn = screen.getByRole("button", { name: /favoritos/i });
      fireEvent.click(favBtn);
      expect(defaultProps.onTabChange).toHaveBeenCalledWith("favorites");
    });
  });

  describe("Armazenamento Local", () => {
    it("deve exibir a seção 'Armazenamento Local'", () => {
      render(<LibrarySidebar {...defaultProps} />);
      expect(screen.getByText("Armazenamento Local")).toBeInTheDocument();
    });

    it("deve exibir a contagem de documentos salvos", () => {
      render(<LibrarySidebar {...defaultProps} />);
      expect(screen.getByText(/5 documento\(s\) salvos no navegador/i)).toBeInTheDocument();
    });

    it("deve exibir informações de cache de áudio quando há faixas", () => {
      render(<LibrarySidebar {...defaultProps} />);
      expect(screen.getByText(/3 faixas/i)).toBeInTheDocument();
    });

    it("não deve exibir informações de cache de áudio quando totalTracks for 0", () => {
      render(<LibrarySidebar {...defaultProps} audioCacheStats={{ totalBytes: 0, totalTracks: 0 }} />);
      expect(screen.queryByText(/áudio em cache/i)).not.toBeInTheDocument();
    });

    it("deve exibir o botão de sincronização Google Drive", () => {
      render(<LibrarySidebar {...defaultProps} />);
      expect(screen.getByTestId("google-drive-sync-btn")).toBeInTheDocument();
    });
  });

  describe("Limpar cache de áudio", () => {
    it("deve exibir 'Limpar Cache de Áudio' quando há faixas", () => {
      render(<LibrarySidebar {...defaultProps} audioCacheStats={{ totalBytes: 1024, totalTracks: 3 }} />);
      expect(screen.getByRole("button", { name: /limpar cache de áudio/i })).toBeInTheDocument();
    });

    it("não deve exibir o botão de limpar cache de áudio quando não há faixas", () => {
      render(<LibrarySidebar {...defaultProps} audioCacheStats={{ totalBytes: 0, totalTracks: 0 }} />);
      expect(screen.queryByRole("button", { name: /limpar cache de áudio/i })).not.toBeInTheDocument();
    });

    it("deve chamar onClearAudioCache ao clicar em limpar cache", () => {
      render(<LibrarySidebar {...defaultProps} audioCacheStats={{ totalBytes: 1024, totalTracks: 2 }} />);
      const btn = screen.getByRole("button", { name: /limpar cache de áudio/i });
      fireEvent.click(btn);
      expect(defaultProps.onClearAudioCache).toHaveBeenCalledTimes(1);
    });
  });

  describe("Chave Gemini — estado inativo", () => {
    it("deve exibir status 'Inativa' quando não há chave", () => {
      render(<LibrarySidebar {...defaultProps} hasApiKey={false} />);
      expect(screen.getByText("Inativa")).toBeInTheDocument();
    });

    it("deve exibir botão 'Conectar Chave Gemini' quando sem chave", () => {
      render(<LibrarySidebar {...defaultProps} hasApiKey={false} />);
      expect(screen.getByRole("button", { name: /conectar chave gemini/i })).toBeInTheDocument();
    });

    it("deve chamar onConnectGemini ao clicar em conectar", () => {
      render(<LibrarySidebar {...defaultProps} hasApiKey={false} />);
      const btn = screen.getByRole("button", { name: /conectar chave gemini/i });
      fireEvent.click(btn);
      expect(defaultProps.onConnectGemini).toHaveBeenCalledTimes(1);
    });

    it("deve exibir texto informativo sobre conectar a chave", () => {
      render(<LibrarySidebar {...defaultProps} hasApiKey={false} />);
      expect(screen.getByText(/Conecte sua chave para narrar/i)).toBeInTheDocument();
    });
  });

  describe("Chave Gemini — estado conectado", () => {
    const connectedProps = {
      ...defaultProps,
      hasApiKey: true,
      maskedKey: "AIzaSy...890",
    };

    it("deve exibir status 'Conectada' quando há chave", () => {
      render(<LibrarySidebar {...connectedProps} />);
      expect(screen.getByText("Conectada")).toBeInTheDocument();
    });

    it("deve exibir o botão 'Desconectar Chave Gemini' com data-cy correto", () => {
      render(<LibrarySidebar {...connectedProps} />);
      const btn = screen.getByRole("button", { name: /desconectar chave gemini/i });
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveAttribute("data-cy", "disconnect-gemini-key-btn");
    });

    it("deve exibir a chave mascarada no texto descritivo", () => {
      render(<LibrarySidebar {...connectedProps} />);
      expect(screen.getByText(/AIzaSy\.\.\.890/i)).toBeInTheDocument();
    });

    it("deve chamar onDisconnectGemini ao clicar em desconectar", () => {
      render(<LibrarySidebar {...connectedProps} />);
      const btn = screen.getByRole("button", { name: /desconectar chave gemini/i });
      fireEvent.click(btn);
      expect(defaultProps.onDisconnectGemini).toHaveBeenCalledTimes(1);
    });

    it("deve usar 'ativa' como fallback quando maskedKey for null", () => {
      render(<LibrarySidebar {...connectedProps} maskedKey={null} />);
      expect(screen.getByText(/ativa/i)).toBeInTheDocument();
    });
  });
});
