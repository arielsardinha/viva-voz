import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { PdfDropzone } from "./pdf-dropzone";

describe("PdfDropzone Component", () => {
  it("deve renderizar o estado padrão de seleção e os cards de recursos", () => {
    const onFileMock = jest.fn();
    render(<PdfDropzone onFile={onFileMock} isLoading={false} progress={null} />);

    expect(screen.getByText(/arraste seus documentos aqui ou selecione/i)).toBeInTheDocument();
    expect(screen.getByText("Selecionar Arquivo")).toBeInTheDocument();
    expect(screen.getByText("Narração Fluida")).toBeInTheDocument();
    expect(screen.getByText("Assistente de Estudos")).toBeInTheDocument();
    expect(screen.getByText("100% Local & Seguro")).toBeInTheDocument();
  });

  it("deve chamar onFile ao selecionar um arquivo através do input", () => {
    const onFileMock = jest.fn();
    render(<PdfDropzone onFile={onFileMock} isLoading={false} progress={null} />);

    const file = new File(["dummy pdf content"], "documento.pdf", {
      type: "application/pdf",
    });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { files: [file] } });
    expect(onFileMock).toHaveBeenCalledWith(file);
  });

  it("deve chamar onFile ao soltar (drop) um arquivo na área de dropzone", () => {
    const onFileMock = jest.fn();
    render(<PdfDropzone onFile={onFileMock} isLoading={false} progress={null} />);

    const file = new File(["dummy pdf content"], "livro.pdf", {
      type: "application/pdf",
    });

    const dropArea = screen.getByText(/arraste seus documentos aqui ou selecione/i).closest("div");
    expect(dropArea).toBeInTheDocument();

    fireEvent.dragOver(dropArea!);
    fireEvent.drop(dropArea!, {
      dataTransfer: {
        files: [file],
      },
    });

    expect(onFileMock).toHaveBeenCalledWith(file);
  });

  it("deve renderizar estado de carregamento e mensagem de progresso", () => {
    const onFileMock = jest.fn();
    render(
      <PdfDropzone
        onFile={onFileMock}
        isLoading={true}
        progress="Extraindo o texto… página 2 de 5"
      />
    );

    expect(screen.getByText("Processando e preparando narração…")).toBeInTheDocument();
    expect(screen.getByText("Extraindo o texto… página 2 de 5")).toBeInTheDocument();

    const button = screen.getByRole("button", { name: /selecionar arquivo/i });
    expect(button).toBeDisabled();
  });
});
