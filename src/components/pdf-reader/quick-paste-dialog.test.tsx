import React, { act } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuickPasteDialog } from "./quick-paste-dialog";

describe("QuickPasteDialog Component", () => {
  it("não deve renderizar quando isOpen for false", () => {
    const { container } = render(
      <QuickPasteDialog isOpen={false} onClose={jest.fn()} onSubmit={jest.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("deve renderizar campos de título, textarea e botão de envio quando aberto", () => {
    render(<QuickPasteDialog isOpen={true} onClose={jest.fn()} onSubmit={jest.fn()} />);

    expect(screen.getByText("Colar ou Digitar Texto")).toBeInTheDocument();
    expect(screen.getByLabelText(/título opcional/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/conteúdo de texto/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /criar leitura/i })).toBeDisabled();
  });

  it("deve calcular métricas de palavras e estimativa de áudio dinamicamente", async () => {
    render(<QuickPasteDialog isOpen={true} onClose={jest.fn()} onSubmit={jest.fn()} />);

    const textarea = screen.getByLabelText(/conteúdo de texto/i);
    await act(async () => {
      fireEvent.change(textarea, {
        target: { value: "Esta é uma frase de teste com várias palavras para calcular." },
      });
    });

    expect(screen.getByText(/11 palavras/i)).toBeInTheDocument();
    expect(screen.getByText(/~1 min de áudio/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /criar leitura/i })).not.toBeDisabled();
  });

  it("deve submeter o texto ao clicar em Criar Leitura", async () => {
    const onSubmitMock = jest.fn().mockResolvedValue(undefined);
    const onCloseMock = jest.fn();

    render(
      <QuickPasteDialog
        isOpen={true}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
      />
    );

    const titleInput = screen.getByLabelText(/título opcional/i);
    const textarea = screen.getByLabelText(/conteúdo de texto/i);
    const submitBtn = screen.getByRole("button", { name: /criar leitura/i });

    await act(async () => {
      fireEvent.change(titleInput, { target: { value: "Meu Título" } });
      fireEvent.change(textarea, { target: { value: "Conteúdo completo para narração." } });
    });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(onSubmitMock).toHaveBeenCalledWith("Meu Título", "Conteúdo completo para narração.");
  });
});
