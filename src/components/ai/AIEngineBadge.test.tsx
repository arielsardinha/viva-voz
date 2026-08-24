import { render, screen, fireEvent } from "@testing-library/react";
import { AIEngineBadge } from "./AIEngineBadge";
import * as useFirebaseAIHook from "@/hooks/useFirebaseAI";

jest.mock("@/hooks/useFirebaseAI");

describe("AIEngineBadge component", () => {
  const mockUseFirebaseAI = useFirebaseAIHook.useFirebaseAI as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve renderizar o badge com 'Gemini Nano' quando activeEngine for 'gemini-nano'", () => {
    mockUseFirebaseAI.mockReturnValue({
      activeEngine: "gemini-nano",
      isOnline: true,
      onDeviceStatus: "available",
      apiKey: null,
      setApiKey: jest.fn(),
      refreshStatus: jest.fn(),
      sendMessage: jest.fn(),
    });

    render(<AIEngineBadge />);

    expect(screen.getByText("Gemini Nano")).toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-label",
      "Motor de IA atual: Gemini Nano Local",
    );
  });

  it("deve renderizar o badge com 'Vertex AI' quando activeEngine for 'vertex'", () => {
    mockUseFirebaseAI.mockReturnValue({
      activeEngine: "vertex",
      isOnline: true,
      onDeviceStatus: "unavailable",
      apiKey: "AIzaSyTestKey",
      setApiKey: jest.fn(),
      refreshStatus: jest.fn(),
      sendMessage: jest.fn(),
    });

    render(<AIEngineBadge />);

    expect(screen.getByText("Vertex AI")).toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-label",
      "Motor de IA atual: Vertex AI Nuvem",
    );
  });

  it("deve abrir o AIEngineModal ao clicar no badge", () => {
    mockUseFirebaseAI.mockReturnValue({
      activeEngine: "gemini-nano",
      isOnline: true,
      onDeviceStatus: "available",
      apiKey: null,
      setApiKey: jest.fn(),
      refreshStatus: jest.fn(),
      sendMessage: jest.fn(),
    });

    render(<AIEngineBadge />);

    const badgeBtn = screen.getByRole("button");
    fireEvent.click(badgeBtn);

    expect(screen.getByText("Motor de IA Híbrida VivaVoz")).toBeInTheDocument();
  });
});
