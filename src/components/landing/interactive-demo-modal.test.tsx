import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { InteractiveDemoModal, DEMO_SENTENCES } from "./interactive-demo-modal";

describe("InteractiveDemoModal (Demonstração Interativa VivaVoz)", () => {
  const onOpenChangeMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    window.HTMLMediaElement.prototype.play = jest.fn().mockImplementation(() => Promise.resolve());
    window.HTMLMediaElement.prototype.pause = jest.fn();
  });

  it("não deve renderizar quando open for false", () => {
    render(<InteractiveDemoModal open={false} onOpenChange={onOpenChangeMock} />);
    expect(screen.queryByTestId("interactive-demo-modal")).not.toBeInTheDocument();
  });

  it("deve renderizar o modal com 4 frases e elemento de áudio nativo", () => {
    render(<InteractiveDemoModal open={true} onOpenChange={onOpenChangeMock} />);

    expect(screen.getByTestId("interactive-demo-modal")).toBeInTheDocument();
    expect(screen.getByText("Demonstração Interativa VivaVoz")).toBeInTheDocument();
    expect(screen.getByText(/Voz Neural VivaVoz HD/i)).toBeInTheDocument();

    DEMO_SENTENCES.forEach((s, idx) => {
      expect(screen.getByTestId(`demo-sentence-${idx}`)).toBeInTheDocument();
    });

    const audioElement = screen.getByTestId("demo-audio-element") as HTMLAudioElement;
    expect(audioElement).toBeInTheDocument();
    expect(audioElement.src).toContain("/audio/01.mp3");
  });

  it("deve iniciar a reprodução ao clicar em 'Ouvir Exemplo' e pausar ao clicar novamente", () => {
    render(<InteractiveDemoModal open={true} onOpenChange={onOpenChangeMock} />);

    const playBtn = screen.getByTestId("demo-play-btn");
    expect(screen.getByText("Ouvir Exemplo")).toBeInTheDocument();

    fireEvent.click(playBtn);
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(screen.getByText("Pausar")).toBeInTheDocument();

    fireEvent.click(playBtn);
    expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    expect(screen.getByText("Ouvir Exemplo")).toBeInTheDocument();
  });

  it("deve mudar de frase e atualizar o arquivo de áudio ao clicar em uma frase específica", () => {
    render(<InteractiveDemoModal open={true} onOpenChange={onOpenChangeMock} />);

    const sentence3 = screen.getByTestId("demo-sentence-2");
    fireEvent.click(sentence3);

    const audioElement = screen.getByTestId("demo-audio-element") as HTMLAudioElement;
    expect(audioElement.src).toContain("/audio/03.mp3");
    expect(screen.getByText("Sentença 3 de 4")).toBeInTheDocument();
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  it("deve avançar para a próxima frase quando o áudio atual terminar", () => {
    render(<InteractiveDemoModal open={true} onOpenChange={onOpenChangeMock} />);

    const audioElement = screen.getByTestId("demo-audio-element");
    expect(screen.getByText("Sentença 1 de 4")).toBeInTheDocument();

    // Simula evento ended
    fireEvent.ended(audioElement);

    expect(screen.getByText("Sentença 2 de 4")).toBeInTheDocument();
    expect((audioElement as HTMLAudioElement).src).toContain("/audio/02.mp3");
  });

  it("deve resetar o progresso ao clicar em Reiniciar", () => {
    render(<InteractiveDemoModal open={true} onOpenChange={onOpenChangeMock} />);

    // Clica na última frase
    const sentence4 = screen.getByTestId("demo-sentence-3");
    fireEvent.click(sentence4);
    expect(screen.getByText("Sentença 4 de 4")).toBeInTheDocument();

    // Clica em reset
    const resetBtn = screen.getByTestId("demo-reset-btn");
    fireEvent.click(resetBtn);

    expect(screen.getByText("Sentença 1 de 4")).toBeInTheDocument();
    expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });

  it("deve alterar a taxa de velocidade ao clicar nos botões de velocidade", () => {
    render(<InteractiveDemoModal open={true} onOpenChange={onOpenChangeMock} />);

    const speedBtn15 = screen.getByTestId("demo-speed-1.5");
    fireEvent.click(speedBtn15);

    const audioElement = screen.getByTestId("demo-audio-element") as HTMLAudioElement;
    expect(audioElement.playbackRate).toBe(1.5);
  });

  it("deve fechar o modal ao clicar em fechar", () => {
    render(<InteractiveDemoModal open={true} onOpenChange={onOpenChangeMock} />);

    const closeBtn = screen.getByTestId("demo-close-btn");
    fireEvent.click(closeBtn);

    expect(onOpenChangeMock).toHaveBeenCalledWith(false);
  });
});
