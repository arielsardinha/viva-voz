import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { WebUrlDialog } from "./web-url-dialog";
import type { ParsedDocument } from "@/lib/domain/document.types";

const mockParsedDoc: ParsedDocument = {
  id: "doc_web_test",
  metadata: {
    id: "doc_web_test",
    title: "Notícia Extraída",
    format: "web",
    sizeBytes: 1024,
    wordCount: 150,
    estimatedReadingMinutes: 1,
    chapterCount: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  chapters: [{ id: "c1", title: "Capítulo 1", startIndex: 0, endIndex: 1 }],
  sentences: [{ index: 0, page: 1, text: "Conteúdo da notícia." }],
  lastSentenceIndex: 0,
};

describe("WebUrlDialog Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("não deve renderizar quando isOpen for false", () => {
    const { container } = render(
      <WebUrlDialog isOpen={false} onClose={jest.fn()} onSubmit={jest.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("deve renderizar estrutura, input de URL e botão de submissão quando aberto", () => {
    render(<WebUrlDialog isOpen={true} onClose={jest.fn()} onSubmit={jest.fn()} />);

    expect(screen.getByText("Ler Artigo da Web")).toBeInTheDocument();
    expect(screen.getByLabelText(/endereço do artigo/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /extrair e iniciar leitura/i })).toBeDisabled();
  });

  it("deve habilitar o botão apenas quando a URL for válida", () => {
    render(<WebUrlDialog isOpen={true} onClose={jest.fn()} onSubmit={jest.fn()} />);

    const input = screen.getByLabelText(/endereço do artigo/i);
    const submitBtn = screen.getByRole("button", { name: /extrair e iniciar leitura/i });

    fireEvent.change(input, { target: { value: "invalido" } });
    expect(submitBtn).toBeDisabled();

    fireEvent.change(input, { target: { value: "https://g1.globo.com/noticia" } });
    expect(submitBtn).not.toBeDisabled();
  });

  it("deve fechar o modal ao clicar no botão fechar ou pressionar Escape", () => {
    const onCloseMock = jest.fn();
    render(<WebUrlDialog isOpen={true} onClose={onCloseMock} onSubmit={jest.fn()} />);

    const closeBtn = screen.getByLabelText(/fechar diálogo/i);
    fireEvent.click(closeBtn);
    expect(onCloseMock).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: "Escape" });
    // o dialog overlay escuta o keyDown
    const overlay = screen.getByRole("dialog");
    fireEvent.keyDown(overlay, { key: "Escape" });
    expect(onCloseMock).toHaveBeenCalledTimes(2);
  });

  it("deve chamar onSubmit e fechar automaticamente ao extrair a URL com sucesso", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          title: "Notícia Extraída",
          document: mockParsedDoc,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const onSubmitMock = jest.fn();
    const onCloseMock = jest.fn();

    render(
      <WebUrlDialog
        isOpen={true}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
      />
    );

    const input = screen.getByLabelText(/endereço do artigo/i);
    const submitBtn = screen.getByRole("button", { name: /extrair e iniciar leitura/i });

    fireEvent.change(input, { target: { value: "https://noticias.uol.com.br/artigo" } });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(onSubmitMock).toHaveBeenCalledWith(mockParsedDoc);
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    fetchMock.mockRestore();
  });

  it("deve exibir mensagem de erro se a extração falhar", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Site bloqueou acesso." }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    );

    const onSubmitMock = jest.fn();
    const onCloseMock = jest.fn();

    render(
      <WebUrlDialog
        isOpen={true}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
      />
    );

    const input = screen.getByLabelText(/endereço do artigo/i);
    const submitBtn = screen.getByRole("button", { name: /extrair e iniciar leitura/i });

    fireEvent.change(input, { target: { value: "https://paywall.com/artigo" } });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Site bloqueou acesso.");
      expect(onSubmitMock).not.toHaveBeenCalled();
      expect(onCloseMock).not.toHaveBeenCalled();
    });

    fetchMock.mockRestore();
  });
});
