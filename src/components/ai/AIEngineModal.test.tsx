import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { AIEngineModal } from "./AIEngineModal";
import * as useFirebaseAIHook from "@/hooks/useFirebaseAI";

jest.mock("@/hooks/useFirebaseAI");

describe("AIEngineModal component", () => {
  const mockUseFirebaseAI = useFirebaseAIHook.useFirebaseAI as jest.Mock;
  const mockSetApiKey = jest.fn();
  const mockRefreshStatus = jest.fn();
  const mockOnOpenChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFirebaseAI.mockReturnValue({
      apiKey: "AIzaSyInitialKey",
      setApiKey: mockSetApiKey,
      refreshStatus: mockRefreshStatus,
      activeEngine: "vertex",
      isOnline: true,
      onDeviceStatus: "available",
      sendMessage: jest.fn(),
    });

    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("deve renderizar título e status atual da IA", () => {
    render(
      <AIEngineModal
        open={true}
        onOpenChange={mockOnOpenChange}
        activeEngine="vertex"
        isOnline={true}
        onDeviceStatus="available"
      />,
    );

    expect(screen.getByText("Motor de IA Híbrida VivaVoz")).toBeInTheDocument();
    expect(screen.getByText("Vertex AI (Cloud BYOK)")).toBeInTheDocument();
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it("deve permitir copiar flags do Chrome para a área de transferência", () => {
    render(
      <AIEngineModal
        open={true}
        onOpenChange={mockOnOpenChange}
        activeEngine="gemini-nano"
        isOnline={true}
        onDeviceStatus="available"
      />,
    );

    const copyBtn1 = screen.getByTestId("copy-flag-1");
    fireEvent.click(copyBtn1);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "chrome://flags/#prompt-api-for-gemini-nano",
    );
  });

  it("deve salvar a chave de API na aba de chave cloud", () => {
    render(
      <AIEngineModal
        open={true}
        onOpenChange={mockOnOpenChange}
        activeEngine="vertex"
        isOnline={true}
        onDeviceStatus="available"
        defaultTab="cloud"
      />,
    );

    const input = screen.getByTestId("input-cloud-key");
    fireEvent.change(input, { target: { value: "AIzaSyNewSavedKey999" } });

    const saveBtn = screen.getByTestId("btn-save-key");
    fireEvent.click(saveBtn);

    expect(mockSetApiKey).toHaveBeenCalledWith("AIzaSyNewSavedKey999");
  });

  it("deve fechar o modal ao clicar no botão Fechar", () => {
    render(
      <AIEngineModal
        open={true}
        onOpenChange={mockOnOpenChange}
        activeEngine="vertex"
        isOnline={true}
        onDeviceStatus="available"
      />,
    );

    const closeBtn = screen.getByTestId("btn-close-modal");
    fireEvent.click(closeBtn);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});
