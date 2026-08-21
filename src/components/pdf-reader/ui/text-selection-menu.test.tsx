import { render, screen, fireEvent, act } from "@testing-library/react";
import { TextSelectionMenu } from "./text-selection-menu";
import * as clipboardModule from "@/lib/clipboard";

jest.mock("@/lib/clipboard", () => ({
  copyToClipboard: jest.fn().mockResolvedValue(true),
}));

describe("TextSelectionMenu", () => {
  const mockContainer = {
    current: document.createElement("div"),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const setupSelection = (text: string) => {
    const range = {
      getBoundingClientRect: () => ({
        left: 200,
        top: 200,
        width: 100,
        height: 20,
        bottom: 220,
        right: 300,
      }),
    };

    const mockAnchorNode = document.createElement("span");
    mockContainer.current.appendChild(mockAnchorNode);

    window.getSelection = jest.fn().mockReturnValue({
      isCollapsed: false,
      toString: () => text,
      anchorNode: mockAnchorNode,
      getRangeAt: () => range,
      removeAllRanges: jest.fn(),
    });
  };

  it("deve renderizar o menu com as opções Marcar Piloto, Bloco de Notas, Explicar e Copiar (sem Ouvir e Resumir)", () => {
    setupSelection("Texto selecionado para teste");

    render(
      <TextSelectionMenu
        containerRef={mockContainer}
        onAddNote={jest.fn()}
      />
    );

    act(() => {
      fireEvent(document, new Event("selectionchange"));
    });

    expect(screen.getByText("Marcar Piloto")).toBeInTheDocument();
    expect(screen.getByText("Bloco de Notas")).toBeInTheDocument();
    expect(screen.getByText("Explicar")).toBeInTheDocument();
    expect(screen.getByTitle("Copiar texto")).toBeInTheDocument();

    // Garante que Ouvir e Resumir foram removidos
    expect(screen.queryByText("Ouvir")).toBeNull();
    expect(screen.queryByText("Resumir")).toBeNull();
  });

  it("deve chamar onAskAI ao clicar em Explicar", () => {
    const onAskAIMock = jest.fn();
    setupSelection("Conceito complexo");

    render(
      <TextSelectionMenu
        containerRef={mockContainer}
        onAskAI={onAskAIMock}
      />
    );

    act(() => {
      fireEvent(document, new Event("selectionchange"));
    });

    const explainBtn = screen.getByText("Explicar");
    act(() => {
      fireEvent.click(explainBtn);
    });

    expect(onAskAIMock).toHaveBeenCalledWith(
      expect.stringContaining("Explique os conceitos e o significado")
    );
  });

  it("deve chamar copyToClipboard com segurança ao clicar em copiar", async () => {
    setupSelection("Texto para copiar");

    render(<TextSelectionMenu containerRef={mockContainer} />);

    act(() => {
      fireEvent(document, new Event("selectionchange"));
    });

    const copyBtn = screen.getByTitle("Copiar texto");
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(clipboardModule.copyToClipboard).toHaveBeenCalledWith(
      "Texto para copiar",
      expect.anything()
    );
  });

  it("deve abrir paleta de cores ao clicar em Marcar Piloto e disparar onHighlight", () => {
    const onHighlightMock = jest.fn();
    setupSelection("Texto para marcar");

    render(
      <TextSelectionMenu
        containerRef={mockContainer}
        onHighlight={onHighlightMock}
      />
    );

    act(() => {
      fireEvent(document, new Event("selectionchange"));
    });

    const markBtn = screen.getByText("Marcar Piloto");
    act(() => {
      fireEvent.click(markBtn);
    });

    const yellowBtn = screen.getByTitle("Marcar com Amarelo Piloto");
    expect(yellowBtn).toBeInTheDocument();

    act(() => {
      fireEvent.click(yellowBtn);
    });

    expect(onHighlightMock).toHaveBeenCalledWith("yellow", "Texto para marcar");
  });

  it("deve disparar onRemoveHighlight ao clicar no botão de desmarcar", () => {
    const onRemoveHighlightMock = jest.fn();
    setupSelection("Texto para desmarcar");

    render(
      <TextSelectionMenu
        containerRef={mockContainer}
        onRemoveHighlight={onRemoveHighlightMock}
      />
    );

    act(() => {
      fireEvent(document, new Event("selectionchange"));
    });

    const markBtn = screen.getByText("Marcar Piloto");
    act(() => {
      fireEvent.click(markBtn);
    });

    const clearBtn = screen.getByTitle("Remover marcação");
    act(() => {
      fireEvent.click(clearBtn);
    });

    expect(onRemoveHighlightMock).toHaveBeenCalledWith("Texto para desmarcar");
  });

  it("deve disparar onAddNote ao clicar no botão de Bloco de Notas", () => {
    const onAddNoteMock = jest.fn();
    setupSelection("Trecho para anotar");

    render(
      <TextSelectionMenu
        containerRef={mockContainer}
        onAddNote={onAddNoteMock}
      />
    );

    act(() => {
      fireEvent(document, new Event("selectionchange"));
    });

    const noteBtn = screen.getByText("Bloco de Notas");
    act(() => {
      fireEvent.click(noteBtn);
    });

    expect(onAddNoteMock).toHaveBeenCalledWith("Trecho para anotar");
  });
});
