import { fireEvent, render, screen } from "@testing-library/react";
import { TemplateSwitcher, TEMPLATES } from "./template-switcher";
import { DEFAULT_READER_SETTINGS } from "@/context/reader-settings-context";

jest.mock("./ambient-sound-player", () => ({
  AmbientSoundPlayer: () => <div data-testid="ambient-sound-player" />,
}));

describe("TemplateSwitcher", () => {
  it("deve exibir apenas Assistente IA e Modo Zen Imersivo (sem Estúdio Moderno)", () => {
    render(
      <TemplateSwitcher
        settings={DEFAULT_READER_SETTINGS}
        onChangeSettings={jest.fn()}
      />,
    );

    expect(TEMPLATES.map((t) => t.id)).toEqual(["ai-study", "zen"]);
    expect(screen.getByText("Assistente IA")).toBeInTheDocument();
    expect(screen.getByText("Modo Zen Imersivo")).toBeInTheDocument();
    expect(screen.queryByText("Estúdio Moderno")).not.toBeInTheDocument();
    expect(screen.queryByText("Estúdio")).not.toBeInTheDocument();
  });

  it("deve chamar onChangeSettings ao alternar entre Assistente IA e Modo Zen Imersivo", () => {
    const onChangeSettings = jest.fn();

    render(
      <TemplateSwitcher
        settings={{ ...DEFAULT_READER_SETTINGS, template: "ai-study" }}
        onChangeSettings={onChangeSettings}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Modo Zen Imersivo/i }));
    expect(onChangeSettings).toHaveBeenCalledWith({ template: "zen" });

    fireEvent.click(screen.getByRole("button", { name: /Assistente IA/i }));
    expect(onChangeSettings).toHaveBeenCalledWith({ template: "ai-study" });
  });
});
