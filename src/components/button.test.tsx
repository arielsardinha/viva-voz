import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "./button";

describe("Button component", () => {
  it("renders with default props and text content", () => {
    render(<Button>Clique aqui</Button>);
    const button = screen.getByRole("button", { name: /clique aqui/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("bg-primary");
  });

  it("applies destructive variant styles correctly", () => {
    render(<Button variant="destructive">Excluir</Button>);
    const button = screen.getByRole("button", { name: /excluir/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("bg-destructive");
  });

  it("handles onClick event correctly", () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Ação</Button>);
    const button = screen.getByRole("button", { name: /ação/i });

    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled when disabled prop is provided", () => {
    render(<Button disabled>Desabilitado</Button>);
    const button = screen.getByRole("button", { name: /desabilitado/i });
    expect(button).toBeDisabled();
  });
});
