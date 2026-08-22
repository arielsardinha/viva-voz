/**
 * Converte erros técnicos da Google Drive API e OAuth em mensagens acolhedoras e compreensíveis para o usuário final.
 * Garante que nenhum erro bruto (JSON, stack traces, detalhes de escopo ou códigos internos) seja exibido na UI.
 */
export function describeDriveError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");

  // 1. Escopo insuficiente ou permissão negada (403 / permission_denied / ACCESS_TOKEN_SCOPE_INSUFFICIENT)
  if (
    /permission_denied|insufficient.*scope|insufficientPermissions|ACCESS_TOKEN_SCOPE_INSUFFICIENT|PERMISSION_DENIED|403/i.test(
      raw
    )
  ) {
    return "Permissão necessária: Ao conectar com o Google, você precisa marcar a opção \"Ver, criar e excluir os próprios dados de configuração no Google Drive\" para que o VivaVoz possa salvar seus backups. Conecte novamente marcando essa opção.";
  }

  // 2. Sessão ou token expirado / inválido (401 / UNAUTHENTICATED / invalid_grant)
  if (
    /invalid_grant|UNAUTHENTICATED|expired|Sessão expirada|Usuário não conectado|401/i.test(
      raw
    )
  ) {
    return "Sua sessão com o Google Drive expirou. Por favor, conecte novamente com a sua conta Google.";
  }

  // 3. Limite de requisições / cota (429 / 402)
  if (/429|402|rateLimit|quotaExceeded/i.test(raw)) {
    return "Limite temporário de requisições no Google Drive atingido. Aguarde alguns instantes e tente novamente.";
  }

  // 4. Nenhum backup encontrado (404)
  if (/404|Nenhum backup encontrado/i.test(raw)) {
    return "Nenhum backup salvo foi encontrado na sua conta do Google Drive.";
  }

  // 5. Falha de rede / offline
  if (/Failed to fetch|NetworkError|ENOTFOUND|ECONNREFUSED|offline/i.test(raw)) {
    return "Falha de conexão com os servidores do Google. Verifique sua internet e tente novamente.";
  }

  // 6. Mensagem amigável de fallback (nunca expõe JSON ou detalhes técnicos ao usuário)
  return "Não foi possível concluir a sincronização com o Google Drive. Verifique sua conexão e tente novamente.";
}
