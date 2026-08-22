import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DocumentCard, FORMAT_THEMES } from "./document-card";
import type { DocumentMetadata } from "@/lib/domain/document.types";

// Mock do next/link para evitar router context
jest.mock("next/link", () => {
  const MockLink = ({ href, children, className }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  );
  MockLink.displayName = "MockLink";
  return MockLink;
});

const mockDoc: DocumentMetadata = {
  id: "doc-1",
  title: "Apostila de TypeScript",
  format: "pdf",
  sizeBytes: 2048,
  chapterCount: 3,
  wordCount: 1500,
  estimatedReadingMinutes: 8,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const defaultProps = {
  doc: mockDoc,
  isFav: false,
  editingId: null,
  draftTitle: "",
  docCache: undefined,
  onToggleFavorite: jest.fn(),
  onSetEditingId: jest.fn(),
  onSetDraftTitle: jest.fn(),
  onSaveTitle: jest.fn().mockResolvedValue(undefined),
  onDownload: jest.fn(),
  onDeleteAudioCache: jest.fn(),
  onDeleteDocument: jest.fn(),
};

describe("DocumentCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Renderização básica", () => {
    it("deve renderizar o título do documento", () => {
      render(<DocumentCard {...defaultProps} />);
      expect(screen.getByText("Apostila de TypeScript")).toBeInTheDocument();
    });

    it("deve renderizar o link de 'Ouvir Áudio' apontando para o documento", () => {
      render(<DocumentCard {...defaultProps} />);
      const link = screen.getByRole("link", { name: /ouvir áudio/i });
      expect(link).toHaveAttribute("href", "/?doc=doc-1");
    });

    it("deve renderizar o badge de formato PDF", () => {
      render(<DocumentCard {...defaultProps} />);
      // Há dois badges: no ícone (label) e no badge colorido
      const badges = screen.getAllByText("PDF");
      expect(badges.length).toBeGreaterThanOrEqual(1);
    });

    it("deve renderizar informações de tempo estimado de leitura", () => {
      render(<DocumentCard {...defaultProps} />);
      expect(screen.getByText(/~8 min/i)).toBeInTheDocument();
    });

    it("deve renderizar a contagem de palavras quando disponível", () => {
      render(<DocumentCard {...defaultProps} />);
      expect(screen.getByText("1500 palavras")).toBeInTheDocument();
    });

    it("deve renderizar a contagem de capítulos quando > 1", () => {
      render(<DocumentCard {...defaultProps} />);
      expect(screen.getByText(/3 capítulos/i)).toBeInTheDocument();
    });

    it("não deve renderizar contagem de capítulos quando chapterCount <= 1", () => {
      const doc = { ...mockDoc, chapterCount: 1 };
      render(<DocumentCard {...defaultProps} doc={doc} />);
      expect(screen.queryByText(/capítulo/i)).not.toBeInTheDocument();
    });

    it("deve exibir o badge 'Voz Neural'", () => {
      render(<DocumentCard {...defaultProps} />);
      expect(screen.getByText("Voz Neural")).toBeInTheDocument();
    });
  });

  describe("Cache de áudio", () => {
    it("não deve exibir badge de cache quando docCache for undefined", () => {
      render(<DocumentCard {...defaultProps} docCache={undefined} />);
      expect(screen.queryByText(/áudio:/i)).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /apagar cache/i })).not.toBeInTheDocument();
    });

    it("não deve exibir badge de cache quando trackCount === 0", () => {
      render(<DocumentCard {...defaultProps} docCache={{ trackCount: 0, sizeBytes: 0 }} />);
      expect(screen.queryByText(/áudio:/i)).not.toBeInTheDocument();
    });

    it("deve exibir badge de cache e botão de apagar quando há cache", () => {
      render(
        <DocumentCard
          {...defaultProps}
          docCache={{ trackCount: 3, sizeBytes: 1024 * 512 }}
        />
      );
      expect(screen.getByText(/áudio:/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /apagar cache de áudio/i })).toBeInTheDocument();
    });

    it("deve usar 'faixa' no singular quando trackCount === 1", () => {
      render(
        <DocumentCard
          {...defaultProps}
          docCache={{ trackCount: 1, sizeBytes: 1024 }}
        />
      );
      expect(screen.getByText(/1 faixa/i)).toBeInTheDocument();
    });

    it("deve usar 'faixas' no plural quando trackCount > 1", () => {
      render(
        <DocumentCard
          {...defaultProps}
          docCache={{ trackCount: 4, sizeBytes: 4096 }}
        />
      );
      expect(screen.getByText(/4 faixas/i)).toBeInTheDocument();
    });
  });

  describe("Favoritar", () => {
    it("deve chamar onToggleFavorite com o id do documento ao clicar em favoritar", () => {
      render(<DocumentCard {...defaultProps} />);
      const favBtn = screen.getByRole("button", { name: /favoritar/i });
      fireEvent.click(favBtn);
      expect(defaultProps.onToggleFavorite).toHaveBeenCalledWith("doc-1");
    });

    it("deve mostrar aria-label 'Remover dos Favoritos' quando isFav = true", () => {
      render(<DocumentCard {...defaultProps} isFav={true} />);
      const favBtn = screen.getByRole("button", { name: /remover dos favoritos/i });
      expect(favBtn).toBeInTheDocument();
    });
  });

  describe("Download", () => {
    it("deve chamar onDownload com o id do documento ao clicar em baixar", () => {
      render(<DocumentCard {...defaultProps} />);
      const downloadBtn = screen.getByRole("button", { name: /baixar arquivo original/i });
      fireEvent.click(downloadBtn);
      expect(defaultProps.onDownload).toHaveBeenCalledWith("doc-1");
    });
  });

  describe("Exclusão do documento", () => {
    it("deve chamar onDeleteDocument com o documento ao clicar em excluir", () => {
      render(<DocumentCard {...defaultProps} />);
      const deleteBtn = screen.getByRole("button", { name: /excluir leitura/i });
      fireEvent.click(deleteBtn);
      expect(defaultProps.onDeleteDocument).toHaveBeenCalledWith(mockDoc);
    });
  });

  describe("Exclusão de cache de áudio", () => {
    it("deve chamar onDeleteAudioCache com o documento ao clicar em apagar cache", () => {
      render(
        <DocumentCard
          {...defaultProps}
          docCache={{ trackCount: 2, sizeBytes: 2048 }}
        />
      );
      const cacheBtn = screen.getByRole("button", { name: /apagar cache de áudio/i });
      fireEvent.click(cacheBtn);
      expect(defaultProps.onDeleteAudioCache).toHaveBeenCalledWith(mockDoc);
    });
  });

  describe("Edição de título inline", () => {
    it("deve mostrar input de edição quando editingId === doc.id", () => {
      render(<DocumentCard {...defaultProps} editingId="doc-1" draftTitle="Título rascunho" />);
      const input = screen.getByRole("textbox");
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue("Título rascunho");
    });

    it("deve chamar onSetDraftTitle ao digitar no input", () => {
      render(<DocumentCard {...defaultProps} editingId="doc-1" draftTitle="Rascunho" />);
      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "Novo Título" } });
      expect(defaultProps.onSetDraftTitle).toHaveBeenCalledWith("Novo Título");
    });

    it("deve salvar o título ao pressionar Enter", async () => {
      render(<DocumentCard {...defaultProps} editingId="doc-1" draftTitle="Rascunho" />);
      const input = screen.getByRole("textbox");
      fireEvent.keyDown(input, { key: "Enter" });
      await waitFor(() => {
        expect(defaultProps.onSaveTitle).toHaveBeenCalledWith("doc-1");
      });
    });

    it("deve cancelar edição ao pressionar Escape", () => {
      render(<DocumentCard {...defaultProps} editingId="doc-1" draftTitle="Rascunho" />);
      const input = screen.getByRole("textbox");
      fireEvent.keyDown(input, { key: "Escape" });
      expect(defaultProps.onSetEditingId).toHaveBeenCalledWith(null);
    });

    it("deve ativar edição ao clicar em Renomear e chamar onSetEditingId e onSetDraftTitle", () => {
      render(<DocumentCard {...defaultProps} editingId={null} />);
      const renameBtn = screen.getByTitle("Renomear");
      fireEvent.click(renameBtn);
      expect(defaultProps.onSetDraftTitle).toHaveBeenCalledWith("Apostila de TypeScript");
      expect(defaultProps.onSetEditingId).toHaveBeenCalledWith("doc-1");
    });
  });

  describe("FORMAT_THEMES", () => {
    it("deve conter todos os formatos esperados", () => {
      const expectedFormats = ["pdf", "epub", "docx", "txt", "md", "paste", "web", "pptx", "odt", "ocr"];
      for (const fmt of expectedFormats) {
        expect(FORMAT_THEMES).toHaveProperty(fmt);
      }
    });

    it("deve ter badgeColor, gradient e label definidos para cada formato", () => {
      for (const [, theme] of Object.entries(FORMAT_THEMES)) {
        expect(theme.badgeColor).toBeTruthy();
        expect(theme.gradient).toBeTruthy();
        expect(theme.label).toBeTruthy();
      }
    });
  });
});
