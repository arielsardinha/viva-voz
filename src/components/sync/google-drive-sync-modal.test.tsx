import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { GoogleDriveSyncModal } from "./google-drive-sync-modal";
import { useGoogleDriveSync } from "@/hooks/use-google-drive-sync";

jest.mock("@/hooks/use-google-drive-sync");

describe("GoogleDriveSyncModal Component", () => {
  const mockConnect = jest.fn();
  const mockDisconnect = jest.fn();
  const mockBackupNow = jest.fn();
  const mockRestoreNow = jest.fn();
  const mockSyncBidirectional = jest.fn();
  const mockSetShowPermissionModal = jest.fn();
  const mockCheckStatus = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve renderizar tela de conexão quando desconectado", () => {
    (useGoogleDriveSync as jest.Mock).mockReturnValue({
      status: { isConnected: false },
      isLoading: false,
      isSyncing: false,
      syncPhase: "idle",
      progress: 0,
      errorMessage: null,
      showPermissionModal: false,
      setShowPermissionModal: mockSetShowPermissionModal,
      checkStatus: mockCheckStatus,
      connect: mockConnect,
      disconnect: mockDisconnect,
      backupNow: mockBackupNow,
      restoreNow: mockRestoreNow,
      syncBidirectional: mockSyncBidirectional,
    });

    render(<GoogleDriveSyncModal open={true} onOpenChange={jest.fn()} />);

    expect(screen.getByText("Backup no Google Drive")).toBeInTheDocument();
    expect(screen.getByText(/Vantagens do Backup no Google Drive/i)).toBeInTheDocument();
    expect(screen.getByText(/Armazenamento Ilimitado em Nuvem:/i)).toBeInTheDocument();
    expect(screen.getByText("Conectar com Google")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Conectar com Google"));
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it("deve renderizar botões de sincronização inteligente, backup e restaurar quando conectado", () => {
    (useGoogleDriveSync as jest.Mock).mockReturnValue({
      status: { isConnected: true, email: "usuario@teste.com", lastSyncTimestamp: 1700000000000 },
      isLoading: false,
      isSyncing: false,
      syncPhase: "idle",
      progress: 0,
      errorMessage: null,
      showPermissionModal: false,
      setShowPermissionModal: mockSetShowPermissionModal,
      checkStatus: mockCheckStatus,
      connect: mockConnect,
      disconnect: mockDisconnect,
      backupNow: mockBackupNow,
      restoreNow: mockRestoreNow,
      syncBidirectional: mockSyncBidirectional,
    });

    render(<GoogleDriveSyncModal open={true} onOpenChange={jest.fn()} />);

    expect(screen.getByText("usuario@teste.com")).toBeInTheDocument();
    expect(screen.getByText("Sincronizar Agora (Enviar & Receber)")).toBeInTheDocument();
    expect(screen.getByText("Apenas Baixar")).toBeInTheDocument();
    expect(screen.getByText("Apenas Enviar")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Sincronizar Agora (Enviar & Receber)"));
    expect(mockSyncBidirectional).toHaveBeenCalledTimes(1);
  });
});
