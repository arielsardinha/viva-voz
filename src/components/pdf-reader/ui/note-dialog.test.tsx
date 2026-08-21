import { render, screen, fireEvent } from "@testing-library/react";
import { NoteDialog } from "./note-dialog";

describe("NoteDialog", () => {
  const mockOnSave = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnOpenChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve renderizar campos de título, citação e textarea", () => {
    render(
      <NoteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        sentenceIndex={1}
        selectedText="Trecho destacado de exemplo"
        page={2}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText("Bloco de Notas")).toBeInTheDocument();
    expect(screen.getByText(/Trecho destacado de exemplo/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Sua Anotação/)).toBeInTheDocument();
  });

  it("deve disparar onSave com dados válidos ao submeter formulário", () => {
    render(
      <NoteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        sentenceIndex={3}
        selectedText="Texto de citação"
        page={1}
        onSave={mockOnSave}
      />
    );

    const textarea = screen.getByLabelText(/Sua Anotação/);
    fireEvent.change(textarea, { target: { value: "Minha anotação importante" } });

    const submitBtn = screen.getByText("Salvar Nota");
    fireEvent.click(submitBtn);

    expect(mockOnSave).toHaveBeenCalledWith({
      sentenceIndex: 3,
      selectedText: "Texto de citação",
      title: undefined,
      content: "Minha anotação importante",
      color: "amber",
      page: 1,
    });
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("deve permitir excluir uma nota existente", () => {
    const existingNote = {
      id: "note-1",
      sentenceIndex: 2,
      selectedText: "Texto",
      title: "Título",
      content: "Conteúdo",
      color: "sky" as const,
      createdAt: 1000,
      updatedAt: 1000,
    };

    render(
      <NoteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        sentenceIndex={2}
        selectedText="Texto"
        editingNote={existingNote}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
      />
    );

    const deleteBtn = screen.getByText("Excluir");
    fireEvent.click(deleteBtn);

    expect(mockOnDelete).toHaveBeenCalledWith("note-1");
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});
