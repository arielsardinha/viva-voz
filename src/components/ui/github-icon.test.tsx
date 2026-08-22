import React from "react";
import { render } from "@testing-library/react";
import { GithubIcon, GithubBrandBadge } from "./github-icon";

describe("GithubIcon & GithubBrandBadge Components", () => {
  it("deve renderizar o ícone do GitHub corretamente", () => {
    const { container } = render(<GithubIcon className="size-5 text-foreground" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("size-5");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("deve renderizar o badge do GitHub com tamanhos suportados", () => {
    const { container: smContainer } = render(<GithubBrandBadge size="sm" />);
    expect(smContainer.firstChild).toHaveClass("size-6");

    const { container: mdContainer } = render(<GithubBrandBadge size="md" />);
    expect(mdContainer.firstChild).toHaveClass("size-8");

    const { container: lgContainer } = render(<GithubBrandBadge size="lg" />);
    expect(lgContainer.firstChild).toHaveClass("size-12");
  });
});
