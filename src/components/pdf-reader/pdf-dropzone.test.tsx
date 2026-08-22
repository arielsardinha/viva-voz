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

  it("deve exibir os badges de formatos incluindo PPTX e URL", () => {
    render(<PdfDropzone onFile={jest.fn()} isLoading={false} progress={null} />);
    expect(screen.getByText("PPTX")).toBeInTheDocument();
    expect(screen.getByText("URL")).toBeInTheDocument();
    expect(screen.getByText("PDF")).toBeInTheDocument();
    expect(screen.getByText("EPUB")).toBeInTheDocument();
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

  it("deve exibir o botão 'Ler Artigo da Web' quando onWebUrl é fornecido", () => {
    render(
      <PdfDropzone
        onFile={jest.fn()}
        onWebUrl={jest.fn()}
        isLoading={false}
        progress={null}
      />
    );

    const webBtn = screen.getByRole("button", { name: /ler artigo da web/i });
    expect(webBtn).toBeInTheDocument();
    expect(webBtn).not.toBeDisabled();
  });

  it("não deve exibir o botão 'Ler Artigo da Web' quando onWebUrl não é fornecido", () => {
    render(<PdfDropzone onFile={jest.fn()} isLoading={false} progress={null} />);
    expect(screen.queryByRole("button", { name: /ler artigo da web/i })).not.toBeInTheDocument();
  });

  it("deve abrir o WebUrlDialog ao clicar em 'Ler Artigo da Web'", () => {
    render(
      <PdfDropzone
        onFile={jest.fn()}
        onWebUrl={jest.fn()}
        isLoading={false}
        progress={null}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /ler artigo da web/i }));
    expect(screen.getByRole("dialog", { name: /ler artigo da web/i })).toBeInTheDocument();
  });

  it("deve desabilitar o botão 'Ler Artigo da Web' durante carregamento", () => {
    render(
      <PdfDropzone
        onFile={jest.fn()}
        onWebUrl={jest.fn()}
        isLoading={true}
        progress={null}
      />
    );

    const webBtn = screen.getByRole("button", { name: /ler artigo da web/i });
    expect(webBtn).toBeDisabled();
  });

  it("o input de arquivo deve aceitar .pptx", () => {
    render(<PdfDropzone onFile={jest.fn()} isLoading={false} progress={null} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.accept).toContain(".pptx");
  });
});
