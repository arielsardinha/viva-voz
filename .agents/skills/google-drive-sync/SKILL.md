---
name: google-drive-sync
description: "Guia arquitetural, operacional e de implementação para sincronização de dados e áudios TTS do VivaVoz com a pasta oculta Google Drive appDataFolder via Next.js BFF (Backend For Frontend) e Cookies Seguros HttpOnly."
model: inherit
background: false
allowed-tools: Read, Edit, CommandExecution
metadata:
  version: 1.2.0
---

# Google Drive Sync & Backup Skill (VivaVoz)

**Use esta skill quando:** Você for implementar, refatorar, testar ou debugar qualquer funcionalidade relacionada à autenticação OAuth 2.0 com Google, sincronização em nuvem na pasta isolada `appDataFolder` do Google Drive, gerenciamento de cookies de sessão no BFF (Next.js App Router) ou persistência de dados e áudios TTS resumíveis.

---

## 1. Visão e Diretrizes Fundamentais

1. **Zero Exposição de Variáveis de Ambiente no Client:**
   - **NUNCA** prefixe variáveis do Google com `NEXT_PUBLIC_` (ex: use `process.env.GOOGLE_DRIVE_CLIENT_ID`, `process.env.GOOGLE_DRIVE_CLIENT_SECRET`, `process.env.GOOGLE_DRIVE_REDIRECT_URI`).
   - O cliente interage estritamente com os endpoints do BFF Next.js (`/api/auth/google/*` e `/api/sync/*`).
2. **Autenticação no BFF com Cookies `HttpOnly`:**
   - O fluxo de autorização gera `code_challenge` / `state`, redireciona via server e troca o authorization code por `access_token` + `refresh_token` no servidor.
   - Os tokens são armazenados em cookies seguros com `httpOnly: true`, `secure: true` (em produção), `sameSite: 'lax'`, `path: '/'`.
3. **IA Generativa 100% BYOK (Bring Your Own Key):**
   - As funcionalidades de IA generativa (Voz TTS e Chat) dependem exclusivamente da chave `userApiKey` fornecida pelo usuário no navegador.
   - Nenhuma chave de IA é mantida nas variáveis de ambiente do servidor.
4. **Experiência de Usuário Fluida e Sem Atrito:**
   - O usuário conecta sua conta Google com 1 clique e a sincronização é imediata, sem necessidade de memorizar ou digitar senhas adicionais de criptografia.
   - Segurança garantida pelo isolamento da `appDataFolder`, TLS 1.3 em trânsito e criptografia em repouso do Google (AES-256).
5. **Sincronização Modular (Metadados + Áudios Resumíveis):**
   - Manifesto estruturado (`vivavoz_manifest.json`) validado com **Zod** e sincronizado via upload multipart rápido.
   - Cache de áudios TTS (`vivavoz_audio_<docId>.bin`) transferido via Google Drive Resumable Upload com feedback de progresso na UI.

---

## 2. Mapa de Rotas e Contratos do BFF

### 2.1. Endpoints de Autenticação (`/api/auth/google/`)
- `GET /api/auth/google/start`: Inicia o fluxo OAuth 2.0. Gera state/PKCE, salva cookie de verificação e redireciona para `https://accounts.google.com/o/oauth2/v2/auth` com escopo `https://www.googleapis.com/auth/drive.appdata` e `access_type=offline&prompt=consent`.
- `GET /api/auth/google/callback`: Recebe o `code` e `state`, valida contra o cookie temporário, troca por tokens em `https://oauth2.googleapis.com/token`, sela o cookie de sessão `vivavoz_gdrive_session` e redireciona de volta para `/`.
- `GET /api/auth/google/status`: Retorna `{ isConnected: boolean, email?: string, lastSyncTimestamp?: number }`.
- `POST /api/auth/google/disconnect`: Revoga o token no Google e deleta os cookies de sessão.

### 2.2. Endpoints de Sincronização (`/api/sync/`)
- `POST /api/sync/backup`: Recebe o manifesto JSON de dados do cliente, valida com Zod e faz upload para a `appDataFolder`.
- `GET /api/sync/restore`: Baixa o último manifesto JSON do Google Drive e entrega ao cliente para merge no IndexedDB.
- `POST /api/sync/audio/resumable`: Inicia sessão de upload resumível para pacote de áudio TTS de um documento específico.
- `GET /api/sync/audio/:documentId`: Baixa o pacote binário de áudio correspondente a um documento.

---

## 3. Padrões de Código e Implementação

### 3.1. Sessão e Cookies Seguros no Servidor
```typescript
import { cookies } from "next/headers";

export interface DriveSessionData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // timestamp ms
}

export const G_DRIVE_COOKIE = "vivavoz_gdrive_session";

export async function getDriveSession(): Promise<DriveSessionData | null> {
  const cookieStore = await cookies();
  const c = cookieStore.get(G_DRIVE_COOKIE);
  if (!c?.value) return null;
  try {
    return JSON.parse(c.value) as DriveSessionData;
  } catch {
    return null;
  }
}
```

---

## 4. Estratégia de Testes

1. **Unitários & Integração (Jest + MSW):**
   - Mock do servidor OAuth do Google (`https://oauth2.googleapis.com/token`).
   - Mock da Google Drive API v3 (`https://www.googleapis.com/drive/v3/files` e endpoints de upload).
   - Validação de rotação automática de token expirado com `refresh_token`.
2. **End-to-End (Cypress):**
   - Fluxo de conexão com o Drive, disparo de backup e verificação de indicadores de estado.
   - Auditoria de acessibilidade (`cypress-axe`) e responsividade em 370px de largura.

---

## 5. Checklist Obrigatório ao Criar / Modificar Recursos

- [ ] Variáveis de ambiente mantidas no servidor (`GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, etc.).
- [ ] Cookies protegidos com `httpOnly: true`, `sameSite: 'lax'`, `secure: true` (prod).
- [ ] IA Generativa operando unicamente via `userApiKey`.
- [ ] Manipulação de áudios TTS usando fluxo resumível com tracking de progresso.
- [ ] Zero logs de erro ou warnings no console durante os testes (`npm run test`).
