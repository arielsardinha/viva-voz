import { render, screen } from "@testing-library/react";
import { GoogleDriveBenefitsCard } from "./google-drive-benefits-card";

describe("GoogleDriveBenefitsCard", () => {
  it("deve renderizar a variante padrão com todos os benefícios", () => {
    render(<GoogleDriveBenefitsCard variant="default" />);

    expect(screen.getByText(/Vantagens do Backup no Google Drive/i)).toBeInTheDocument();
    expect(screen.getByText(/Armazenamento Ilimitado em Nuvem:/i)).toBeInTheDocument();
    expect(screen.getByText(/Áudios Neurais Salvos \(TTS\):/i)).toBeInTheDocument();
    expect(screen.getByText(/Sincronização Multi-Dispositivo:/i)).toBeInTheDocument();
    expect(screen.getByText(/Pasta Oculta & 100% Segura:/i)).toBeInTheDocument();
    expect(screen.getByText(/Chave de IA \(BYOK\) Sincronizada:/i)).toBeInTheDocument();

    // Não deve exibir o alerta de memória insuficiente na variante padrão
    expect(screen.queryByText(/Memória interna insuficiente/i)).not.toBeInTheDocument();
  });

  it("deve renderizar a variante storage_alert com o banner de aviso de memória interna", () => {
    render(<GoogleDriveBenefitsCard variant="storage_alert" />);

    expect(screen.getByText(/Memória interna insuficiente no navegador/i)).toBeInTheDocument();
    expect(screen.getByText(/não é possível abrir novos documentos diretamente na memória do dispositivo/i)).toBeInTheDocument();
    expect(screen.getByText(/Conecte sua conta do Google Drive para armazenar seus arquivos na nuvem/i)).toBeInTheDocument();

    // Deve também exibir os itens de benefícios
    expect(screen.getByText(/Armazenamento Ilimitado em Nuvem:/i)).toBeInTheDocument();
    expect(screen.getByText(/Áudios Neurais Salvos \(TTS\):/i)).toBeInTheDocument();
  });
});
