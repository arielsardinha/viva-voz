import { describeDriveError } from "./drive-error-formatter";

describe("describeDriveError", () => {
  it("deve orientar o usuário sobre permissões quando o erro for 403 / ACCESS_TOKEN_SCOPE_INSUFFICIENT", () => {
    const rawGoogleError = JSON.stringify({
      error: {
        code: 403,
        message: "Request had insufficient authentication scopes.",
        errors: [{ message: "Insufficient Permission", reason: "insufficientPermissions" }],
        status: "PERMISSION_DENIED",
        details: [
          {
            "@type": "type.googleapis.com/google.rpc.ErrorInfo",
            reason: "ACCESS_TOKEN_SCOPE_INSUFFICIENT",
            domain: "googleapis.com",
          },
        ],
      },
    });

    const formatted = describeDriveError(rawGoogleError);
    expect(formatted).toContain("Permissão necessária");
    expect(formatted).toContain("Ver, criar e excluir os próprios dados de configuração no Google Drive");
    expect(formatted).not.toContain("{");
    expect(formatted).not.toContain("ACCESS_TOKEN_SCOPE_INSUFFICIENT");
  });

  it("deve informar sobre sessão expirada em erros 401 / invalid_grant", () => {
    const error = new Error("invalid_grant: Token has been expired or revoked.");
    const formatted = describeDriveError(error);
    expect(formatted).toContain("Sua sessão com o Google Drive expirou");
  });

  it("deve informar sobre limite de cota quando status for 429", () => {
    const formatted = describeDriveError("Erro 429: rateLimitExceeded");
    expect(formatted).toContain("Limite temporário de requisições");
  });

  it("deve informar sobre ausência de backup quando status for 404", () => {
    const formatted = describeDriveError("Nenhum backup encontrado na pasta do aplicativo.");
    expect(formatted).toContain("Nenhum backup salvo foi encontrado");
  });

  it("deve informar sobre falha de conexão quando offline", () => {
    const formatted = describeDriveError(new Error("Failed to fetch"));
    expect(formatted).toContain("Falha de conexão com os servidores do Google");
  });

  it("deve retornar mensagem amigável para erros desconhecidos sem vazar detalhes técnicos", () => {
    const formatted = describeDriveError({ weirdObject: true });
    expect(formatted).toBe(
      "Não foi possível concluir a sincronização com o Google Drive. Verifique sua conexão e tente novamente."
    );
  });
});
