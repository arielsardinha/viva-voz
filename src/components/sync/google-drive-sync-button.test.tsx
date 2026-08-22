import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { GoogleDriveSyncButton } from "./google-drive-sync-button";
import { useGoogleDriveSync } from "@/hooks/use-google-drive-sync";

jest.mock("@/hooks/use-google-drive-sync");

describe("GoogleDriveSyncButton Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve renderizar botão desconectado", () => {
    (useGoogleDriveSync as jest.Mock).mockReturnValue({
      status: { isConnected: false },
      isLoading: false,
      isSyncing: false,
    });

    render(<GoogleDriveSyncButton showLabel={true} />);

    expect(screen.getByText("Backup em Nuvem")).toBeInTheDocument();
  });

  it("deve renderizar botão conectado", () => {
    (useGoogleDriveSync as jest.Mock).mockReturnValue({
      status: { isConnected: true, email: "user@test.com" },
      isLoading: false,
      isSyncing: false,
    });

    render(<GoogleDriveSyncButton showLabel={true} />);

    expect(screen.getByText("Nuvem Conectada")).toBeInTheDocument();
  });

  it("não deve renderizar nada quando hideWhenConnected for true e o status for conectado", () => {
    (useGoogleDriveSync as jest.Mock).mockReturnValue({
      status: { isConnected: true, email: "user@test.com" },
      isLoading: false,
      isSyncing: false,
    });

    const { container } = render(<GoogleDriveSyncButton hideWhenConnected={true} />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("deve renderizar o botão quando hideWhenConnected for true mas o status for desconectado", () => {
    (useGoogleDriveSync as jest.Mock).mockReturnValue({
      status: { isConnected: false },
      isLoading: false,
      isSyncing: false,
    });

    render(<GoogleDriveSyncButton hideWhenConnected={true} />);

    expect(
      screen.getByRole("button", { name: /backup e sincronização no google drive/i })
    ).toBeInTheDocument();
  });
});

