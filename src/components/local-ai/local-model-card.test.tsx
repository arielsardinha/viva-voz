import { render, screen, fireEvent } from "@testing-library/react";
import { getLocalModelById } from "@/lib/local-ai/domain/local-model-catalog";
import type { LocalModelState } from "@/lib/local-ai/domain/local-model.types";
import { LocalModelCard } from "./local-model-card";

const runtimeOk = {
  webGpuSupported: true,
  cacheApiSupported: true,
  wasmSupported: true,
};

describe("LocalModelCard", () => {
  const kokoro = getLocalModelById("kokoro-82m-tts")!;
  const gemma = getLocalModelById("gemma-4-e2b-chat")!;

  const baseState: LocalModelState = {
    id: "kokoro-82m-tts",
    status: "not_downloaded",
    downloadedBytes: 0,
    totalBytes: kokoro.sizeBytes,
    progressPercent: 0,
    speedBytesPerSec: 0,
    errorMessage: null,
    cachedAt: null,
    cachedSizeBytes: 0,
  };

  it("deve renderizar o botão Baixar Modelo quando não baixado e disparar onDownload", () => {
    const onDownload = jest.fn();
    render(
      <LocalModelCard
        descriptor={kokoro}
        state={baseState}
        runtimeSupport={runtimeOk}
        onDownload={onDownload}
        onCancel={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    expect(screen.getByText(kokoro.name)).toBeInTheDocument();
    expect(screen.getByText("Não baixado")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /baixar modelo/i }));
    expect(onDownload).toHaveBeenCalledWith("kokoro-82m-tts");
  });

  it("deve exibir barra de progresso e botão Cancelar durante o download", () => {
    const onCancel = jest.fn();
    render(
      <LocalModelCard
        descriptor={kokoro}
        state={{
          ...baseState,
          status: "downloading",
          downloadedBytes: 140_000_000,
          totalBytes: 280_000_000,
          progressPercent: 50,
          speedBytesPerSec: 5 * 1024 * 1024,
        }}
        runtimeSupport={runtimeOk}
        onDownload={jest.fn()}
        onCancel={onCancel}
        onDelete={jest.fn()}
      />,
    );

    const progress = screen.getByRole("progressbar");
    expect(progress).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByText("Baixando 50%")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /cancelar download/i }));
    expect(onCancel).toHaveBeenCalledWith("kokoro-82m-tts");
  });

  it("deve exibir botões Usar agora e Remover quando o modelo estiver pronto", () => {
    const onActivate = jest.fn();
    const onDelete = jest.fn();
    render(
      <LocalModelCard
        descriptor={gemma}
        state={{
          ...baseState,
          id: "gemma-4-e2b-chat",
          status: "ready",
          downloadedBytes: gemma.sizeBytes,
          totalBytes: gemma.sizeBytes,
          progressPercent: 100,
          cachedSizeBytes: gemma.sizeBytes,
        }}
        runtimeSupport={runtimeOk}
        onDownload={jest.fn()}
        onCancel={jest.fn()}
        onDelete={onDelete}
        onActivate={onActivate}
      />,
    );

    expect(screen.getByText("Pronto offline")).toBeInTheDocument();
    expect(screen.getByText("Imagem")).toBeInTheDocument();
    expect(screen.getByText("Áudio")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /usar agora/i }));
    expect(onActivate).toHaveBeenCalledWith("gemma-4-e2b-chat");

    fireEvent.click(screen.getByRole("button", { name: /remover modelo/i }));
    expect(onDelete).toHaveBeenCalledWith("gemma-4-e2b-chat");
  });

  it("deve alertar amigavelmente quando WebGPU não estiver disponível para modelo que exige WebGPU", () => {
    render(
      <LocalModelCard
        descriptor={gemma}
        state={{ ...baseState, id: "gemma-4-e2b-chat" }}
        runtimeSupport={{ ...runtimeOk, webGpuSupported: false }}
        onDownload={jest.fn()}
        onCancel={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    expect(screen.getByText(/requer navegador com WebGPU ativo/i)).toBeInTheDocument();
  });
});
