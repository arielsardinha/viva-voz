import { render, screen } from "@testing-library/react";
import { HighlightedSentenceText } from "./highlighted-sentence-text";
import type { TextHighlight } from "@/lib/domain/document-highlight.types";

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
});
