---
trigger: always_on
---

# Diretrizes Arquiteturais: Google Drive Sync via BFF (Next.js & appDataFolder)

## 1. Princípios Inegociáveis de Segurança e Arquitetura

1. **Zero Exposição de Variáveis no Client (Sem `NEXT_PUBLIC_` para OAuth/Segredos):**
   - Nenhuma variável de autenticação, segredo ou credencial do Google (`GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, `GOOGLE_DRIVE_REDIRECT_URI`, `ENABLE_GOOGLE_DRIVE_SYNC`) deve conter o prefixo `NEXT_PUBLIC_`.
   - Todas as chaves e segredos residem exclusivamente no lado do servidor (`process.env.*`), conforme as diretrizes de segurança do Next.js.
   - O Client jamais consome SDKs do Google que exijam a exposição de Client IDs no bundle JS do navegador.

2. **Proibido Fallback para Variáveis Inexistentes ou Descontinuadas:**
   - O código não deve utilizar fallbacks para variáveis legadas ou nomes descontinuados (ex: `GOOGLE_CLIENT_ID`, `GOOGLE_API_KEY`, etc.).
   - Utilizar estrita e unicamente as variáveis de ambiente canônicas e ativas no projeto (`GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, `GOOGLE_DRIVE_REDIRECT_URI`, `ENABLE_GOOGLE_DRIVE_SYNC`).

3. **Zero Exposição de Detalhes Técnicos na UI:**
   - É estritamente proibido exibir nomes de variáveis de ambiente (`.env.local`), detalhes técnicos ou diagnósticos de desenvolvedor na interface do usuário final.
   - A interface deve permanecer limpa, acolhedora e com mensagens orientadas ao usuário final.
   - Validações de configuração ausente ou falhas de servidor devem ocorrer naturalmente e ser cobertas e garantidas por testes automatizados (Jest / Cypress).

4. **Arquitetura 100% Baseada em BFF (Backend For Frontend):**
   - Todo o ciclo de vida OAuth 2.0 (iniciação, troca de `code`, renovação de `refresh_token`, revogação) é operado exclusivamente por **Route Handlers** e **Server Actions** no Next.js (`/api/auth/google/*` e `/api/sync/*`).
   - O cliente interage unicamente com o BFF da aplicação através de endpoints semânticos e tipados.

5. **Gerenciamento de Sessão com Cookies Seguros (`HttpOnly`):**
   - Os tokens de acesso e de atualização (`access_token`, `refresh_token`) NUNCA são enviados para o JavaScript do navegador (proibido salvar em `localStorage` ou `sessionStorage`).
   - A sessão é persistida em **Cookies com flags obrigatórias:**
     - `httpOnly: true` (proteção contra XSS).
     - `secure: true` em ambiente de produção (HTTPS).
     - `sameSite: "lax"` (proteção contra CSRF).
     - `path: "/"` com expiração controlada e rotação automática de tokens.
     - Payload do cookie cifrado/selado no servidor (JWE / AES-GCM server-side).

6. **Isolamento de Dados na `appDataFolder` do Google Drive:**
   - O app utiliza exclusivamente o escopo `https://www.googleapis.com/auth/drive.appdata`.
   - Os dados ficam ocultos da interface padrão do Drive do usuário, sem poluir suas pastas pessoais.
   - Proteção de dados provida nativamente por HTTPS/TLS 1.3 em trânsito e criptografia em repouso do Google (AES-256).
   - Zero atrito para o usuário: autenticação transparente via conta Google sem necessidade de senhas mestras adicionais.

7. **IA Generativa 100% BYOK (Bring Your Own Key):**
   - Toda funcionalidade de IA (narração TTS e chat com documento) utiliza estritamente o `userApiKey` fornecido pelo usuário no cliente e transmitido por requisição.
   - É proibido armazenar chaves de IA em variáveis de ambiente do servidor.
   - A `userApiKey` DEVE ser incluída no manifesto de sincronização com o Google Drive (`vivavoz_manifest.json`) para permitir recuperação cross-device.
   - Ao restaurar de outro dispositivo, a API Key é configurada via cookie `HttpOnly` server-side (mesmo fluxo da inserção manual).
   - A remoção da API Key localmente DEVE ser propagada para o Google Drive.

---

## 2. Padrões de Rotas do BFF (Route Handlers)

| Rota BFF | Método | Responsabilidade |
| :--- | :--- | :--- |
| `/api/auth/google/start` | `GET` | Gera `state`/PKCE, grava cookie temporário de validação e redireciona para a tela de consentimento do Google com escopo `drive.appdata` e `access_type=offline`. |
| `/api/auth/google/callback` | `GET` | Valida `state`, troca `code` por `access_token` + `refresh_token` no Google, grava cookie `HttpOnly` selado e redireciona para o app. |
| `/api/auth/google/status` | `GET` | Retorna status da conexão (`{ isConnected: boolean, email?: string, lastSync?: number }`) sem expor tokens. |
| `/api/auth/google/disconnect` | `POST` | Revoga o token na API do Google e limpa os cookies de sessão. |
| `/api/sync/backup` | `POST` | Recebe manifesto estruturado (JSON), valida com Zod, renova token se necessário e executa upload na `appDataFolder`. |
| `/api/sync/restore` | `GET` | Baixa o manifesto da `appDataFolder` e retorna ao client para mesclagem local no IndexedDB. |
| `/api/sync/audio/resumable` | `POST` | Inicializa ou faz proxy de upload resumível de pacotes de áudio TTS (`vivavoz_audio_<docId>.bin`). |
| `/api/sync/audio/[docId]` | `GET` | Baixa o pacote binário de áudio correspondente a um documento para alimentar o cache local. |

---

## 3. Estratégia de Áudio TTS e Resumable Upload

1. **Backup Modular e Incremental:**
   - Metadados, leituras e preferências: `vivavoz_manifest.json` (upload rápido).
   - Blobs de áudio sintetizado: pacotes por documento (`vivavoz_audio_<docId>.bin`).
2. **Áudios Exclusivamente na Nuvem (Zero Cache Local):**
   - Áudios TTS NUNCA são armazenados no IndexedDB local. A tabela é limitada e reservada para documentos.
   - Áudios só são persistidos no Google Drive `appDataFolder`. Se o usuário não estiver conectado à nuvem, áudios são efêmeros (gerados sob demanda e descartados).
3. **Resumable Upload para Áudios:**
   - Pacotes de áudio utilizam o protocolo de Resumable Upload da Google Drive API v3 para suportar oscilações de rede e arquivos maiores que 5MB.
   - O ViewModel expõe progresso granular (0% a 100%) para a interface de usuário.

---

## 4. Checklist de Qualidade e Validação

- [ ] Nenhuma menção a `NEXT_PUBLIC_` em arquivos relacionados a credenciais do Google.
- [ ] Zero fallbacks para variáveis legadas/descontinuadas; apenas variáveis oficiais em uso.
- [ ] Zero detalhes técnicos ou nomes de `.env.local` expostos na UI.
- [ ] Cookies de autenticação com `httpOnly: true`, `secure: true` (prod) e `sameSite: "lax"`.
- [ ] Zero dependência de SDKs de client com chaves embutidas.
- [ ] Testes automatizados cobrindo cenários de sucesso e erro (credenciais ausentes, refresh token, 401/429).
- [ ] Validação estrita de schemas de payload com Zod antes de operações de I/O.
- [ ] IA Generativa operando estritamente com `userApiKey` fornecido pelo usuário.
- [ ] Interface acessível e responsiva (≥ 370px) em conformidade com as regras do VivaVoz.
- [ ] Áudios TTS NÃO são armazenados no IndexedDB (zero blobs de áudio no cache local).
- [ ] Documentos recentes mantidos no IndexedDB com política de eviction LRU.
- [ ] API Key (`userApiKey`) incluída no manifesto de sync com o Google Drive.
- [ ] Remoção de API Key propagada para o Google Drive.
- [ ] Restauração cross-device da API Key via cookie `HttpOnly` server-side.
