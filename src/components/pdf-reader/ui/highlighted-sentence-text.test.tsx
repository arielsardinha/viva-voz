import { render, screen, fireEvent } from "@testing-library/react";
import { HighlightedSentenceText } from "./highlighted-sentence-text";
import type { TextHighlight } from "@/lib/domain/document-highlight.types";
import type { DocumentNote } from "@/lib/domain/document-note.types";

describe("HighlightedSentenceText", () => {
  it("deve renderizar texto sem tags mark quando não houver highlights", () => {
    render(<HighlightedSentenceText text="Frase de exemplo comum." />);

    expect(screen.getByText("Frase de exemplo comum.")).toBeInTheDocument();
    expect(document.querySelector("mark")).toBeNull();
  });

  it("deve renderizar trecho destacado com a classe de cor correspondente", () => {
    const highlights: TextHighlight[] = [
      {
        id: "hl-1",
        sentenceIndex: 0,
        startOffset: 6,
        endOffset: 13,
        text: "exemplo",
        color: "green",
        createdAt: 1000,
      },
    ];

    render(
      <HighlightedSentenceText
        text="Frase exemplo comum."
        highlights={highlights}
      />
    );

    const mark = document.querySelector("mark");
    expect(mark).toBeInTheDocument();
    expect(mark?.textContent).toBe("exemplo");
    expect(mark).toHaveClass("highlight-green");
  });

  it("deve exibir badge de anotação com a cor correta da etiqueta selecionada", () => {
    const mockOnOpenNote = jest.fn();
    const notes: DocumentNote[] = [
      {
        id: "n1",
        sentenceIndex: 0,
        selectedText: "Frase teste",
        title: "Anotação Verde",
        content: "Conteúdo da nota",
        color: "emerald",
        createdAt: 1000,
        updatedAt: 1000,
      },
    ];

    render(
      <HighlightedSentenceText
        text="Frase teste com nota."
        notes={notes}
        onOpenNote={mockOnOpenNote}
      />
    );

    const noteBadge = screen.getByLabelText("Abrir bloco de notas desta frase");
    expect(noteBadge).toBeInTheDocument();
    expect(noteBadge).toHaveAttribute("data-note-color", "emerald");
    expect(noteBadge.className).toContain("bg-emerald-500/20");

    fireEvent.click(noteBadge);
    expect(mockOnOpenNote).toHaveBeenCalledWith(notes[0]);
  });

  it("deve renderizar cor roxa quando a nota tiver color: purple", () => {
    const notes: DocumentNote[] = [
      {
        id: "n2",
        sentenceIndex: 0,
        selectedText: "Frase teste",
        content: "Nota roxa",
        color: "purple",
        createdAt: 1000,
        updatedAt: 1000,
      },
    ];

    render(
      <HighlightedSentenceText
        text="Frase teste com nota roxa."
        notes={notes}
      />
    );

    const noteBadge = screen.getByLabelText("Abrir bloco de notas desta frase");
    expect(noteBadge).toHaveAttribute("data-note-color", "purple");
    expect(noteBadge.className).toContain("bg-purple-500/20");
  });
});
