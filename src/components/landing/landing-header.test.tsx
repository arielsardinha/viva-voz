import { render, screen, fireEvent } from "@testing-library/react";
import { LandingHeader } from "./landing-header";
import { ReaderSettingsProvider } from "@/context/reader-settings-context";

describe("LandingHeader Component", () => {
  const renderHeader = () =>
    render(
      <ReaderSettingsProvider>
        <LandingHeader />
      </ReaderSettingsProvider>
    );

  it("deve renderizar o header com logo e navegação desktop", () => {
    renderHeader();

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByLabelText(/VivaVoz - Início/i)).toBeInTheDocument();

    const nav = screen.getByRole("navigation", { name: /Navegação principal/i });
    expect(nav).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Início" })).not.toBeInTheDocument();
    expect(screen.getByText("Recursos")).toBeInTheDocument();
    expect(screen.getByText("Leitor")).toBeInTheDocument();
    expect(screen.getByText("Biblioteca")).toBeInTheDocument();
    expect(screen.getByText("Apoiar")).toBeInTheDocument();
  });

  it("deve renderizar o botão de alternar tema e o botão de abrir o leitor", () => {
    renderHeader();

    const themeBtn = screen.getByTestId("theme-toggle-btn");
    expect(themeBtn).toBeInTheDocument();
    fireEvent.click(themeBtn);

    const openReaderBtn = screen.getByTestId("header-open-reader-btn");
    expect(openReaderBtn).toBeInTheDocument();
    expect(openReaderBtn).toHaveAttribute("href", "/leitor");
  });

  it("deve abrir o menu drawer em mobile ao acionar o botão", () => {
    renderHeader();

    const drawerTrigger = screen.getByTestId("mobile-drawer-trigger");
    expect(drawerTrigger).toBeInTheDocument();
    fireEvent.click(drawerTrigger);

    expect(screen.getByTestId("mobile-drawer-content")).toBeInTheDocument();
    expect(screen.getByText("VivaVoz Menu")).toBeInTheDocument();
  });
});
