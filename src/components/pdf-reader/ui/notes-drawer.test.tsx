import { render, screen, fireEvent } from "@testing-library/react";
import { NotesDrawer } from "./notes-drawer";
import type { DocumentNote } from "@/lib/domain/document-note.types";

describe("NotesDrawer", () => {
  const mockNotes: DocumentNote[] = [
    {
      id: "n-1",
      sentenceIndex: 2,
      selectedText: "Trecho da citação 1",
      title: "Resumo do Capítulo",
      content: "Este capítulo trata sobre arquitetura de software.",
      color: "amber",
      page: 1,
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: "n-2",
      sentenceIndex: 10,
      selectedText: "Trecho da citação 2",
      title: "Dúvida para pesquisar",
      content: "Verificar compatibilidade com navegadores antigos.",
      color: "sky",
      page: 3,
      createdAt: 2000,
      updatedAt: 2000,
    },
  ];

  it("deve renderizar a lista de notas com títulos e conteúdos", () => {
    render(
      <NotesDrawer
        open={true}
        onOpenChange={jest.fn()}
        notes={mockNotes}
        onSelectSentence={jest.fn()}
        onEditNote={jest.fn()}
        onDeleteNote={jest.fn()}
      />
    );

    expect(screen.getByText("Bloco de Notas")).toBeInTheDocument();
    expect(screen.getByText("Resumo do Capítulo")).toBeInTheDocument();
    expect(screen.getByText("Dúvida para pesquisar")).toBeInTheDocument();
  });

  it("deve filtrar notas pelo campo de busca", () => {
    render(
      <NotesDrawer
        open={true}
        onOpenChange={jest.fn()}
        notes={mockNotes}
        onSelectSentence={jest.fn()}
        onEditNote={jest.fn()}
        onDeleteNote={jest.fn()}
      />
    );

    const input = screen.getByPlaceholderText(/Buscar em anotações/);
    fireEvent.change(input, { target: { value: "arquitetura" } });

    expect(screen.getByText("Resumo do Capítulo")).toBeInTheDocument();
    expect(screen.queryByText("Dúvida para pesquisar")).toBeNull();
  });

  it("deve disparar onSelectSentence ao clicar em 'Ir para o trecho'", () => {
    const onSelectSentenceMock = jest.fn();
    const onOpenChangeMock = jest.fn();

    render(
      <NotesDrawer
        open={true}
        onOpenChange={onOpenChangeMock}
        notes={mockNotes}
        onSelectSentence={onSelectSentenceMock}
        onEditNote={jest.fn()}
        onDeleteNote={jest.fn()}
      />
    );

    const jumpButtons = screen.getAllByText("Ir para o trecho");
    fireEvent.click(jumpButtons[0]);

    expect(onSelectSentenceMock).toHaveBeenCalledWith(2);
    expect(onOpenChangeMock).toHaveBeenCalledWith(false);
  });
});
