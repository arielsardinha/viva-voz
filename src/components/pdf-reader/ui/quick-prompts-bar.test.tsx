import { fireEvent, render, screen } from "@testing-library/react";
import { QuickPromptsBar } from "./quick-prompts-bar";

const SAMPLE_PROMPTS = [
  "Resumir página 1",
  "Pontos principais do documento",
  "Explicar conceitos-chave",
  "Perguntas de fixação",
];

function mockHorizontalOverflow(
  el: HTMLElement,
  { scrollWidth = 600, clientWidth = 260, scrollLeft = 0 },
) {
  Object.defineProperty(el, "scrollWidth", { configurable: true, value: scrollWidth });
  Object.defineProperty(el, "clientWidth", { configurable: true, value: clientWidth });
  let currentScrollLeft = scrollLeft;
  Object.defineProperty(el, "scrollLeft", {
    configurable: true,
    get: () => currentScrollLeft,
    set: (val: number) => {
      currentScrollLeft = Math.max(0, Math.min(scrollWidth - clientWidth, val));
    },
  });
}

describe("QuickPromptsBar", () => {
  it("renderiza os chips de sugestão e aciona onSelectPrompt ao clicar", () => {
    const onSelectPrompt = jest.fn();
    render(<QuickPromptsBar prompts={SAMPLE_PROMPTS} onSelectPrompt={onSelectPrompt} />);

    for (const prompt of SAMPLE_PROMPTS) {
      expect(screen.getByRole("button", { name: prompt })).toBeInTheDocument();
    }

    fireEvent.click(screen.getByRole("button", { name: "Pontos principais do documento" }));
    expect(onSelectPrompt).toHaveBeenCalledWith("Pontos principais do documento");
  });

  it("respeita o estado disabled nos botões de sugestão", () => {
    const onSelectPrompt = jest.fn();
    render(<QuickPromptsBar prompts={SAMPLE_PROMPTS} disabled onSelectPrompt={onSelectPrompt} />);

    const btn = screen.getByRole("button", { name: "Resumir página 1" });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onSelectPrompt).not.toHaveBeenCalled();
  });

  it("converte wheel vertical em rolagem horizontal quando há overflow", () => {
    render(<QuickPromptsBar prompts={SAMPLE_PROMPTS} onSelectPrompt={jest.fn()} />);

    const scroller = document.querySelector('[data-cy="quick-prompts-scroller"]') as HTMLElement;
    expect(scroller).toBeTruthy();

    mockHorizontalOverflow(scroller, { scrollWidth: 600, clientWidth: 260, scrollLeft: 0 });
    fireEvent(scroller, new Event("scroll"));

    fireEvent.wheel(scroller, { deltaY: 120, deltaX: 0 });
    expect(scroller.scrollLeft).toBe(120);

    fireEvent.wheel(scroller, { deltaY: -60, deltaX: 0 });
    expect(scroller.scrollLeft).toBe(60);
  });

  it("exibe setas de rolagem horizontal e move scrollLeft ao clicar nelas", () => {
    render(<QuickPromptsBar prompts={SAMPLE_PROMPTS} onSelectPrompt={jest.fn()} />);

    const scroller = document.querySelector('[data-cy="quick-prompts-scroller"]') as HTMLElement;
    mockHorizontalOverflow(scroller, { scrollWidth: 600, clientWidth: 260, scrollLeft: 0 });
    scroller.scrollBy = ((opts?: ScrollToOptions) => {
      if (opts && typeof opts.left === "number") {
        scroller.scrollLeft += opts.left;
      }
    }) as typeof scroller.scrollBy;

    fireEvent(scroller, new Event("scroll"));

    const rightBtn = screen.getByRole("button", { name: "Rolar sugestões para a direita" });
    expect(rightBtn).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Rolar sugestões para a esquerda" }),
    ).not.toBeInTheDocument();

    fireEvent.click(rightBtn);
    expect(scroller.scrollLeft).toBe(180);

    const leftBtn = screen.getByRole("button", { name: "Rolar sugestões para a esquerda" });
    expect(leftBtn).toBeInTheDocument();

    fireEvent.click(leftBtn);
    expect(scroller.scrollLeft).toBe(0);
  });
});
