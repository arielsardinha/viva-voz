import { act, fireEvent, render, screen } from "@testing-library/react";
import {
  INITIAL_LOCAL_TTS_LOAD_STATE,
  type LocalTtsLoadState,
} from "@/lib/local-ai/domain/local-tts-load-state";
import {
  LocalTtsLoadingPopup,
  LocalTtsLoadingPopupView,
  LOCAL_TTS_READY_FLASH_MS,
} from "./local-tts-loading-popup";
import { resetLocalTtsEngineForTests } from "@/lib/local-ai/engines/local-tts.engine";
import type { LocalTtsWorkerLike } from "@/lib/local-ai/engines/local-tts.engine";
import type { LocalTtsWorkerResponse } from "@/lib/local-ai/engines/local-tts.protocol";

const MB = 1024 * 1024;

function state(patch: Partial<LocalTtsLoadState>): LocalTtsLoadState {
  return { ...INITIAL_LOCAL_TTS_LOAD_STATE, startedAt: 1_000, ...patch };
}

describe("LocalTtsLoadingPopupView", () => {
  it("não renderiza nada quando ocioso", () => {
    const { container } = render(
      <LocalTtsLoadingPopupView state={INITIAL_LOCAL_TTS_LOAD_STATE} now={0} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("mostra a porcentagem real e os MB durante a leitura do modelo", () => {
    render(
      <LocalTtsLoadingPopupView
        state={state({ phase: "model", delegate: "GPU", loadedBytes: 41 * MB, totalBytes: 82 * MB })}
        now={13_500}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Preparando a voz local");
    expect(screen.getByText("Carregando o modelo de voz")).toBeInTheDocument();
    expect(screen.getByText(/Etapa 2 de 4/)).toBeInTheDocument();
    expect(screen.getByText("50% · 41 MB de 82 MB")).toBeInTheDocument();
    expect(screen.getByText("GPU (WebGPU)")).toBeInTheDocument();
    expect(screen.getByText("12s")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
  });

  it("usa barra indeterminada nas etapas sem progresso exposto", () => {
    render(
      <LocalTtsLoadingPopupView state={state({ phase: "initializing", delegate: "CPU" })} now={1_000} />,
    );

    expect(screen.getByText("Preparando o modelo")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).not.toHaveAttribute("aria-valuenow");
    expect(screen.getByText("CPU (WASM)")).toBeInTheDocument();
  });

  it("mostra o erro com botão para fechar", () => {
    const onDismissError = jest.fn();
    render(
      <LocalTtsLoadingPopupView
        state={state({ phase: "error", errorMessage: "Sem memória de GPU" })}
        now={0}
        onDismissError={onDismissError}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar a voz local");
    expect(screen.getByText("Sem memória de GPU")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Fechar aviso" }));
    expect(onDismissError).toHaveBeenCalled();
  });
});

describe("LocalTtsLoadingPopup (conectado ao engine)", () => {
  afterEach(() => {
    jest.useRealTimers();
    resetLocalTtsEngineForTests();
  });

  it("aparece durante o carregamento, confirma quando fica pronto e some sozinho", async () => {
    jest.useFakeTimers();
    let emit: (message: LocalTtsWorkerResponse) => void = () => undefined;
    const worker: LocalTtsWorkerLike = {
      postMessage: jest.fn(),
      addEventListener: ((type: string, listener: (event: MessageEvent) => void) => {
        if (type === "message") emit = (data) => listener({ data } as MessageEvent);
      }) as LocalTtsWorkerLike["addEventListener"],
      terminate: jest.fn(),
    };
    const engine = resetLocalTtsEngineForTests({ createWorker: async () => worker });

    render(<LocalTtsLoadingPopup />);
    expect(screen.queryByTestId("local-tts-loading-popup")).not.toBeInTheDocument();

    await act(async () => {
      await engine.warmup();
    });
    act(() => emit({ type: "progress", event: { phase: "runtime" } }));
    expect(screen.getByTestId("local-tts-loading-popup")).toHaveAttribute("data-phase", "runtime");

    act(() => emit({ type: "progress", event: { phase: "ready" } }));
    expect(screen.getByText("Voz local pronta")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(LOCAL_TTS_READY_FLASH_MS + 10);
    });
    expect(screen.queryByTestId("local-tts-loading-popup")).not.toBeInTheDocument();
  });
});
