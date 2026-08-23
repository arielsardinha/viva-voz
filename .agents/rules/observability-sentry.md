# Diretrizes de Observabilidade, Telemetria e Monitoramento de Erros (Sentry)

## 1. Princípios Inegociáveis de Segurança e Privacidade

1. **Zero Vazamento de Chaves de IA (BYOK) e Tokens OAuth:**
   - A chave de API do usuário (`userApiKey`, Gemini API Key) e tokens de sessão/Google Drive (`access_token`, `refresh_token`, cookies `HttpOnly`) NUNCA devem ser transmitidos ao Sentry em texto plano.
   - Toda inicialização do Sentry (`sentry.server.config.ts`, `sentry.edge.config.ts`, `src/instrumentation-client.ts`) DEVE conter o gancho `beforeSend` chamando `sanitizeSentryEvent`.
   - Headers sensíveis (`x-goog-api-key`, `authorization`, `cookie`, `set-cookie`, `x-api-key`) são removidos obrigatoriamente.

2. **Privacidade de Conteúdo de Documentos (Zero Content Ingestion):**
   - Textos de documentos do usuário (`documentContent`, `rawText`, `content`) são estritamente redigidos (`[REDACTED]`) em payloads de log, extras ou breadcrumbs.
   - No cliente, a gravação de sessão (Sentry Replay) deve operar com mascaramento obrigatório de texto (`maskAllText: true`) e bloqueio de mídia (`blockAllMedia: true`).

3. **Uso Exclusivo do Utilitário Centralizado `logger`:**
   - É proibido chamar `console.error` ou `Sentry.captureException` diretamente de forma ad-hoc nos componentes.
   - Sempre utilize a instância centralizada [`logger`](file:///d:/project/viva-voz-text/src/lib/monitoring/logger.ts) localizada em `src/lib/monitoring/logger.ts`.

---

## 2. Taxonomia de Tags e Módulos Padronizados

Ao emitir logs ou spans de performance, utilize a taxonomia estruturada do projeto:

| Dimensão / Tag | Valores Permitidos |
| :--- | :--- |
| `module` | `tts_synthesis`, `parser`, `google_drive_sync`, `indexeddb_storage`, `ai_chat`, `auth`, `ui`, `general` |
| `format` | `pdf`, `docx`, `epub`, `txt`, `odt`, `pptx`, `web_article`, `quick_paste` |
| `storage_target` | `indexeddb`, `google_drive` |
| `tts_engine` | `gemini`, `web_speech`, `server_tts` |

---

## 3. Padrões por Domínio da Aplicação

### A. Síntese de Voz (TTS)
- Capturar falhas de quota ou limites de taxa (HTTP 429) com nível `warning` para não poluir alertas críticos.
- Registrar `voice_name`, tamanho de caracteres do chunk e latência da síntese.
- Usar `logger.tts.chunkSynthesized(...)` e `logger.tts.failed(...)`.

### B. Parsers de Arquivos
- Registrar tipo de arquivo, tamanho em KB e tempo de processamento.
- Usar `logger.parser.started(...)`, `logger.parser.success(...)` e `logger.parser.failed(...)`.
- Nunca registrar o conteúdo do arquivo parseado.

### C. Sincronização Google Drive (BFF)
- Monitorar falhas no Resumable Upload e expiração de tokens (`logger.sync.tokenExpired()`).
- Registrar contagem de documentos sincronizados e presença de API Key no manifesto (`logger.sync.backupStarted(...)`).

### D. Armazenamento Local (IndexedDB)
- Capturar erros de `QuotaExceededError` para rastrear eficácia do algoritmo de desalocação LRU (`logger.storage.quotaExceeded(...)`).
- Rastrear desalocações automáticas com `logger.storage.evictionTriggered(...)`.

---

## 4. Rastreamento de Performance (Tracing & Spans)

- Envolva operações assíncronas custosas (parsing de documentos volumosos, decodificação de áudio, sync) com `logger.startSpan`:
```typescript
const result = await logger.startSpan(
  { name: 'Parse PDF Document', op: 'parse.pdf', tags: { format: 'pdf' } },
  async () => {
    return await processPdf(buffer);
  }
);
```

---

## 5. Checklist de Validação para Observabilidade

- [ ] Toda captura de erro utiliza `logger` de `src/lib/monitoring/logger.ts`.
- [ ] Sanitização ativa em `beforeSend` e testada via testes automatizados.
- [ ] Tags padronizadas (`module`, `format`, etc.) adicionadas nos pontos críticos.
- [ ] Zero dados sensíveis de usuários ou chaves de API expostos.
