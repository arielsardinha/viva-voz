import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { GeminiKeyDialog } from "./gemini-key-dialog";
import { toast } from "sonner";

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

describe("GeminiKeyDialog Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve renderizar botão 'Conectar Gemini' quando não houver chave conectada", () => {
    const onChangeMock = jest.fn();
    render(<GeminiKeyDialog apiKey={null} onChange={onChangeMock} />);

    expect(screen.getByRole("button", { name: /conectar chave gemini/i })).toBeInTheDocument();
  });

  it("deve renderizar botão 'Gemini Conectado' quando houver chave conectada", () => {
    const onChangeMock = jest.fn();
    render(<GeminiKeyDialog apiKey="AIzaSy1234567890" onChange={onChangeMock} />);

    expect(screen.getByRole("button", { name: /chave gemini conectada/i })).toBeInTheDocument();
  });

  it("deve renderizar variante 'audio' quando desconectada e conectada", () => {
    const onChangeMock = jest.fn();
    const { rerender } = render(
      <GeminiKeyDialog apiKey={null} onChange={onChangeMock} variant="audio" />
    );

    expect(
      screen.getByRole("button", { name: /conectar som com ia/i })
    ).toBeInTheDocument();

    rerender(
      <GeminiKeyDialog apiKey="AIzaSy1234567890" onChange={onChangeMock} variant="audio" />
    );
    expect(
      screen.getByRole("button", { name: /voz ia .* conectada/i })
    ).toBeInTheDocument();
  });

  it("deve renderizar variante 'icon'", () => {
    const onChangeMock = jest.fn();
    render(<GeminiKeyDialog apiKey={null} onChange={onChangeMock} variant="icon" />);

    expect(
      screen.getByRole("button", { name: /conectar chave gemini/i })
    ).toBeInTheDocument();
  });

  it("deve abrir o modal ao clicar no botão de conexão", () => {
    const onChangeMock = jest.fn();
    render(<GeminiKeyDialog apiKey={null} onChange={onChangeMock} />);

    fireEvent.click(screen.getByRole("button", { name: /conectar chave gemini/i }));

    expect(
      screen.getByText("Conectar conta do Gemini (Google AI Studio)")
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("AIza...")).toBeInTheDocument();
  });

  it("deve exibir toast de erro se a chave tiver menos de 10 caracteres", () => {
    const onChangeMock = jest.fn();
    render(<GeminiKeyDialog apiKey={null} onChange={onChangeMock} />);

    fireEvent.click(screen.getByRole("button", { name: /conectar chave gemini/i }));

    const input = screen.getByPlaceholderText("AIza...");
    fireEvent.change(input, { target: { value: "curta" } });

    fireEvent.click(screen.getByRole("button", { name: /salvar chave/i }));

    expect(toast.error).toHaveBeenCalledWith("Informe uma chave válida do Google AI Studio.");
    expect(onChangeMock).not.toHaveBeenCalled();
  });

  it("deve salvar a chave quando válida e notificar com toast de sucesso", () => {
    const onChangeMock = jest.fn();
    render(<GeminiKeyDialog apiKey={null} onChange={onChangeMock} />);

    fireEvent.click(screen.getByRole("button", { name: /conectar chave gemini/i }));

    const input = screen.getByPlaceholderText("AIza...");
    fireEvent.change(input, { target: { value: "  AIzaSyValidGeminiKey12345  " } });

    fireEvent.click(screen.getByRole("button", { name: /salvar chave/i }));

    expect(onChangeMock).toHaveBeenCalledWith("AIzaSyValidGeminiKey12345");
    expect(toast.success).toHaveBeenCalledWith("Conta Gemini conectada neste navegador.");
  });

  it("deve fechar o diálogo ao clicar em cancelar", () => {
    const onChangeMock = jest.fn();
    render(<GeminiKeyDialog apiKey={null} onChange={onChangeMock} />);

    fireEvent.click(screen.getByRole("button", { name: /conectar chave gemini/i }));

    const cancelBtn = screen.getByRole("button", { name: /cancelar/i });
    fireEvent.click(cancelBtn);

    expect(screen.queryByText("Conectar conta do Gemini (Google AI Studio)")).not.toBeInTheDocument();
  });
});
