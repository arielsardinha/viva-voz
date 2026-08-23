# 🎙️ VivaVoz — Leitor de Texto & Áudio Inteligente (PWA)

[![Next.js](https://img.shields.io/badge/Next.js-16+-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0+-38bdf8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![Jest](https://img.shields.io/badge/Jest-30+-C21325?style=for-the-badge&logo=jest)](https://jestjs.io/)
[![Cypress](https://img.shields.io/badge/Cypress-15+-17202C?style=for-the-badge&logo=cypress)](https://www.cypress.io/)
[![Sentry](https://img.shields.io/badge/Sentry-Monitored-362D59?style=for-the-badge&logo=sentry)](https://sentry.io/)
[![PWA](https://img.shields.io/badge/PWA-Offline_First-5A0FC8?style=for-the-badge&logo=pwa)](https://web.dev/progressive-web-apps/)

> O **VivaVoz** é uma plataforma moderna, acessível e *local-first* de leitura inteligente e síntese de voz (TTS), projetada para transformar qualquer documento, artigo web ou texto colado em uma experiência sonora e visual imersiva, fluida e personalizada.

---

## 📑 Sumário

1. [📖 Visão Geral do Projeto](#-visão-geral-do-projeto)
   - [Proposta de Valor](#proposta-de-valor)
   - [Principais Funcionalidades](#principais-funcionalidades)
   - [Formatos e Fontes Suportados](#formatos-e-fontes-suportados)
2. [🏗️ Arquitetura & Engenharia](#️-arquitetura--engenharia)
   - [Padrão Arquitetural (Ports & Adapters / Clean Architecture)](#padrão-arquitetural-ports--adapters--clean-architecture)
   - [Estratégia Local-First & Dual-Storage](#estratégia-local-first--dual-storage)
   - [Segurança & Privacidade (BYOK & BFF)](#segurança--privacidade-byok--bff)
   - [Server-Side Rendering & Component Boundaries](#server-side-rendering--component-boundaries)
3. [📂 Estrutura de Pastas](#-estrutura-de-pastas)
4. [🚀 Guia de Configuração e Execução Local](#-guia-de-configuração-e-execução-local)
   - [Pré-requisitos](#pré-requisitos)
   - [Passo a Passo de Instalação](#passo-a-passo-de-instalação)
   - [Configuração do Google Drive Sync (OAuth 2.0 BFF)](#configuração-do-google-drive-sync-oauth-20-bff)
   - [Configuração de Observabilidade (Sentry)](#configuração-de-observabilidade-sentry)
5. [🧪 Suíte de Testes Automatizados & Qualidade](#-suíte-de-testes-automatizados--qualidade)
   - [Testes Unitários & Integração (Jest + RTL + MSW)](#testes-unitários--integração-jest--rtl--msw)
   - [Testes End-to-End & Acessibilidade (Cypress + Axe + Lighthouse)](#testes-end-to-end--acessibilidade-cypress--axe--lighthouse)
6. [🛠️ Scripts NPM Disponíveis](#️-scripts-npm-disponíveis)
7. [🤝 Guia de Contribuição & Boas Práticas](#-guia-de-contribuição--boas-práticas)
8. [📄 Licença](#-licença)

---

## 📖 Visão Geral do Projeto

### Proposta de Valor
O **VivaVoz** nasceu para democratizar o acesso à leitura e ao estudo produtivo. Seja para pessoas com deficiência visual, dislexia, estudantes que absorvem melhor conteúdo em áudio ou profissionais multitarefa, o VivaVoz unifica extração de texto multimodal, narração sintetizada de alta qualidade e uma interface limpa e livre de distrações.

### Principais Funcionalidades

- 🧠 **OCR Multimodal Híbrido:** Extração de texto a partir de imagens escaneadas e PDFs via **Gemini Vision API** com fallback automático offline via **Tesseract.js**.
- 🔊 **Player TTS com Sincronia de Sentenças:** Síntese de voz com suporte a Web Speech API do navegador e provedores de IA em nuvem, com destaque visual de palavras/sentenças em tempo real, ajuste de velocidade e tom.
- 🧘 **Leitor Zen (Modo Foco):** Interface minimalista dedicada à leitura sem distrações, com opções de tipografia, modo escuro, sepia, ajuste de espaçamento e rolagem automática.
- 💾 **Arquitetura Local-First (Offline por Padrão):** Documentos, histórico de leitura, progresso e preferências são salvos instantaneamente no **IndexedDB** local, funcionando 100% offline via PWA.
- ☁️ **Sincronização em Nuvem Privada (Google Drive AppData):** Backup incremental e restauração cross-device via pasta isolada e oculta (`appDataFolder`) usando Backend-For-Frontend (BFF) com cookies seguros `HttpOnly`.
- 🔑 **IA 100% BYOK (Bring Your Own Key):** O usuário tem controle total sobre suas chaves de API (Gemini), que nunca são salvas em servidores de terceiros ou em variáveis de ambiente públicas.
- 💬 **Ask AI (Chat com Documento):** Assistente contextual integrado para tirar dúvidas, resumir seções ou explicar trechos do documento aberto.

### Formatos e Fontes Suportados

| Formato / Fonte | Adapter Responsável | Método de Extração |
| :--- | :--- | :--- |
| **PDF** (`.pdf`) | `PdfAdapter` / `OcrAdapter` | `pdfjs-dist` (texto nativo) com fallback para Gemini Vision/Tesseract |
| **EPUB** (`.epub`) | `EpubAdapter` | `JSZip` + parser XML de capítulos e metadados |
| **Word DOCX** (`.docx`) | `DocxAdapter` | `mammoth` (conversão semântica HTML/texto) |
| **OpenDocument** (`.odt`) | `OdtAdapter` | `JSZip` + parser do manifesto `content.xml` |
| **PowerPoint** (`.pptx`) | `PptxAdapter` | `JSZip` + extração de texto de slides em ordem sequencial |
| **Texto / Markdown** (`.txt`, `.md`) | `TxtAdapter` / `MdAdapter` | Extração pura e estruturação de cabeçalhos |
| **Artigos da Web (URL)** | `WebArticleAdapter` | Route Handler BFF + `@mozilla/readability` + `jsdom` |
| **Colar Rápido** | `QuickPasteAdapter` | Sanitização e segmentação imediata de texto |

---

## 🏗️ Arquitetura & Engenharia

O projeto segue princípios de **Clean Architecture**, **Ports & Adapters (Hexagonal)** e **Backend For Frontend (BFF)**.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND / CLIENT LAYER                          │
│                                                                          │
│   ┌─────────────────────┐  React Server Components (RSC) & UI Components │
│   │   App Router (UI)   │  (Tailwind CSS, Radix UI, Lucide, Sonner)      │
│   └──────────┬──────────┘                                                │
│              ▼                                                           │
│   ┌─────────────────────┐  Domain Entities, ViewModels & Facades         │
│   │    Domain Layer     │  (Document, Chapter, ReadingProgress, Sync)    │
│   └──────────┬──────────┘                                                │
│              ▼                                                           │
│   ┌─────────────────────┐  Adapters & Repositories                       │
│   │  Parsers & Storage  │  (AdapterRegistry, IndexedDB - library-db.ts)  │
│   └──────────┬──────────┘                                                │
└──────────────┼───────────────────────────────────────────────────────────┘
               │ HTTP / JSON & Streaming
┌──────────────▼───────────────────────────────────────────────────────────┐
│                       BACKEND FOR FRONTEND (BFF)                         │
│                                                                          │
│   ┌─────────────────────┐  Next.js Route Handlers & Server Actions       │
│   │  Route Handlers     │  (/api/auth/google/*, /api/sync/*, /api/ocr)   │
│   └──────────┬──────────┘                                                │
│              ▼                                                           │
│   ┌─────────────────────┐  Adapters de Infraestrutura Server-Side        │
│   │ Server Services     │  (GoogleDriveClient, JWE Session, AI Gateway)  │
│   └─────────────────────┘                                                │
└──────────────────────────────────────────────────────────────────────────┘
```

### Padrão Arquitetural (Ports & Adapters / Clean Architecture)
- **Domínio Puro (`src/lib/domain`):** Entidades e regras de negócio sem dependências de frameworks.
- **Portas e Adapters (`src/lib/parsers`):** Todos os parsers de arquivo implementam a interface comum `DocumentParserAdapter`, sendo instanciados via `AdapterRegistry`.
- **Fachadas e Repositórios (`src/lib/repository`, `src/lib/facade`):** O `library-db.ts` encapsula as operações do IndexedDB sob uma API simples e fortemente tipada.

### Estratégia Local-First & Dual-Storage

1. **IndexedDB como Single Source of Truth Local:**
   - O IndexedDB armazena metadados, capítulos e texto estruturado para acesso instantâneo offline.
   - **Política de Eviction LRU (Least Recently Used):** Para respeitar cotas de armazenamento do navegador, quando o limite é atingido, os documentos acessados há mais tempo são liberados do cache local (permanecendo salvos na nuvem).
2. **Zero Áudios TTS no IndexedDB:**
   - Blobs de áudio volumosos **nunca** são persistidos no IndexedDB.
   - Em sessões offline, áudios são gerados e mantidos em memória durante o uso. Na nuvem, são transmitidos via upload resumível (`vivavoz_audio_<docId>.bin`) para a pasta de dados do Google Drive.
3. **Dual-Write Assíncrono:**
   - Operações de escrita ocorrem primeiro no IndexedDB (sem bloqueio) e são enfileiradas para sincronização paralela com o Google Drive quando há conexão ativa.

### Segurança & Privacidade (BYOK & BFF)

- **Zero Credenciais no Navegador:** Nenhuma credencial confidencial do Google (`GOOGLE_DRIVE_CLIENT_SECRET`, `GOOGLE_DRIVE_CLIENT_ID`) ou segredo de servidor utiliza o prefixo `NEXT_PUBLIC_`.
- **Sessão Segura via Cookies `HttpOnly`:** Os tokens OAuth 2.0 (`access_token`, `refresh_token`) são mantidos em cookies selados no servidor com flags `httpOnly: true`, `secure: true` e `sameSite: "lax"`.
- **Google Drive `appDataFolder`:** O escopo utilizado é restrito a `https://www.googleapis.com/auth/drive.appdata`. A aplicação só tem acesso à sua própria pasta de dados oculta, sem permissão para ler outros arquivos do usuário.
- **Sincronização de API Key (BYOK):** A chave do Gemini fornecida pelo usuário (`userApiKey`) é armazenada em cookie `HttpOnly` seguro e enviada de forma criptografada no manifesto de backup (`vivavoz_manifest.json`), permitindo recuperação automática entre dispositivos.

### Server-Side Rendering & Component Boundaries
- **Server Components (RSC) por padrão:** Otimização máxima de payload e SEO inicial.
- **Client Components (`'use client'`) isolados:** Limitados exclusivamente a componentes folha com eventos do usuário (players de áudio, botões de ação, inputs e modais).

---

## 📂 Estrutura de Pastas

```
viva-voz-text/
├── .agents/                 # Regras, skills e governança de IA / agent-graph-flow
├── cypress/                 # Testes E2E, Acessibilidade (Axe) e Auditoria Lighthouse
│   ├── e2e/                 # Especificações de fluxo do usuário
│   ├── fixtures/            # Arquivos de teste e mocks
│   └── support/             # Comandos customizados Cypress
├── public/                  # Manifest PWA, ícones, llms.txt e assets estáticos
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/             # Route Handlers / BFF (Auth, Sync, OCR, TTS, Ask AI)
│   │   ├── layout.tsx       # Root Layout com Providers e Fontes
│   │   └── page.tsx         # Página principal / Landing & Dashboard
│   ├── components/          # Componentes visuais React (UI / Modais / Player)
│   │   ├── modals/          # Modais de Configuração, Sync, Google Drive, Chave API
│   │   ├── reader/          # Leitor Zen, Canvas de Leitura e Controles de Texto
│   │   └── ui/              # Design System base (Radix UI / Tailwind)
│   ├── context/             # React Contexts (PlayerContext, LibraryContext, etc.)
│   ├── hooks/               # Custom Hooks (useTTS, useSync, useIndexedDB, etc.)
│   ├── instrumentation.ts   # Configuração de telemetria / Sentry
│   └── lib/                 # Núcleo de lógica e serviços
│       ├── ai/              # Integração Gemini API & Prompt API
│       ├── domain/          # Entidades e Interfaces de Domínio
│       ├── facade/          # Fachadas para orquestração de leitura e áudio
│       ├── monitoring/      # Utilitários de telemetria e sanitização de logs
│       ├── ocr/             # Orquestrador OCR (Gemini Vision + Tesseract)
│       ├── parsers/         # Adapters para PDF, EPUB, DOCX, ODT, PPTX, MD, TXT, Web
│       ├── repository/      # Camada de persistência IndexedDB
│       └── sync/            # Módulos de Sincronização Google Drive (Client & Server BFF)
├── .env.example             # Modelo de variáveis de ambiente
├── jest.config.ts           # Configuração de testes unitários e cobertura
├── jest.setup.ts            # Mocks globais de ambiente (IndexedDB, SpeechSynthesis, MSW)
├── cypress.config.ts        # Configuração do Cypress E2E
├── next.config.ts           # Configuração do Next.js e Sentry Plugin
└── package.json             # Dependências e scripts
```

---

## 🚀 Guia de Configuração e Execução Local

### Pré-requisitos
- **Node.js:** Versão 20.x ou superior (LTS recomendada).
- **Gerenciador de Pacotes:** `npm` (versão 10+), `pnpm` ou `yarn`.
- **Git:** Instalado e configurado.

### Passo a Passo de Instalação

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/seu-usuario/viva-voz-text.git
   cd viva-voz-text
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   ```bash
   cp .env.example .env.local
   ```

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.

---

### Configuração do Google Drive Sync (OAuth 2.0 BFF)

Para testar a sincronização em nuvem localmente, é necessário criar credenciais OAuth 2.0 no **Google Cloud Console**:

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2. Crie um novo projeto (ex: `VivaVoz - Dev`).
3. Vá em **APIs e Serviços > Biblioteca** e ative a **Google Drive API**.
4. Em **APIs e Serviços > Tela de permissão OAuth**:
   - Tipo de usuário: **Externo**.
   - Preencha o nome do app e email de suporte.
   - Em **Escopos**, adicione o escopo restrito `.../auth/drive.appdata` (*Ver e gerenciar os próprios dados de configuração do app no Google Drive*).
   - Em **Usuários de teste**, adicione o seu endereço de e-mail do Google.
5. Em **APIs e Serviços > Credenciais > Criar Credenciais > ID do cliente OAuth**:
   - Tipo de aplicativo: **Aplicativo da Web**.
   - Nome: `VivaVoz Local Development`.
   - **Origens JavaScript autorizadas:** `http://localhost:3000`
   - **URIs de redirecionamento autorizados:** `http://localhost:3000/api/auth/google/callback`
6. Copie o **ID do cliente** e a **Chave secreta do cliente** para o seu `.env.local`:
   ```env
   ENABLE_GOOGLE_DRIVE_SYNC=true
   GOOGLE_DRIVE_CLIENT_ID=seu_client_id.apps.googleusercontent.com
   GOOGLE_DRIVE_CLIENT_SECRET=sua_client_secret
   GOOGLE_DRIVE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
   ```

---

### Configuração de Observabilidade (Sentry)

O VivaVoz utiliza o Sentry para captura de erros e monitoramento de desempenho em todas as camadas (Client, Server e Edge).

1. Para desenvolvimento local, o Sentry é **opcional**.
2. Caso queira conectar seu projeto do Sentry, adicione no `.env.local`:
   ```env
   NEXT_PUBLIC_SENTRY_DSN=https://sua_chave@o0.ingest.sentry.io/0
   SENTRY_AUTH_TOKEN=seu_auth_token_de_build
   SENTRY_ORG=sua_org
   SENTRY_PROJECT=seu_projeto
   ```
3. O projeto possui sanitização automática (`beforeSend`) para garantir que chaves de API (`userApiKey`), senhas e dados sensíveis de documentos **nunca** sejam enviados para os servidores do Sentry.

---

## 🧪 Suíte de Testes Automatizados & Qualidade

O projeto adota uma política rigorosa de garantia de qualidade com cobertura nos 3 níveis:

### Testes Unitários & Integração (Jest + RTL + MSW)
Validam a lógica de negócio pura, adapters de parsing, manipulação do IndexedDB, hooks e fluxo de API com mocks de rede via Mock Service Worker (MSW).

```bash
# Executar todos os testes unitários e de integração
npm run test

# Executar com relatório de cobertura de código
npm run test:coverage
```

### Testes End-to-End & Acessibilidade (Cypress + Axe + Lighthouse)
Validam fluxos críticos do usuário, conformidade WCAG 2.1 via `cypress-axe`, integridade de anotações WebMCP e métricas Core Web Vitals via Lighthouse.

```bash
# Abrir interface interativa do Cypress
npm run cy:open

# Executar suíte completa de testes E2E em modo headless
npm run cy:run

# Executar auditoria automatizada do Lighthouse
npm run cy:lighthouse
```

---

## 🛠️ Scripts NPM Disponíveis

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia o servidor de desenvolvimento Next.js em `http://localhost:3000`. |
| `npm run build` | Compila a aplicação para produção com otimizações de bundle e rotas. |
| `npm run start` | Inicia o servidor de produção após o build. |
| `npm run lint` | Executa o ESLint para validação de regras de código e TypeScript. |
| `npm run test` | Executa a suíte de testes unitários e integração com o Jest. |
| `npm run test:coverage` | Executa os testes com mapa detalhado de cobertura de código. |
| `npm run cy:open` | Abre o runner interativo do Cypress. |
| `npm run cy:run` | Executa os testes E2E com o Cypress em modo headless. |
| `npm run cy:lighthouse` | Executa as auditorias de Performance e Acessibilidade do Lighthouse. |

---

## 🤝 Guia de Contribuição & Boas Práticas

Contribuições da comunidade são muito bem-vindas! Para manter a excelência técnica do código, siga as diretrizes abaixo:

### 1. Padrões de Código & TypeScript
- **TypeScript Estrito:** Não utilize `any`. Todos os parâmetros, retornos e payloads devem possuir interfaces ou tipos explícitos.
- **Clean Architecture & SOLID:** Isole lógica de domínio e parsers de I/O em arquivos dedicados (`< 800` linhas por arquivo, funções pequenas com responsabilidade única).
- **Zero Vazamento de PII:** Nunca logue no console textos integrais de documentos ou chaves de API.

### 2. Responsividade & Acessibilidade (A11y)
- Todas as interfaces e modais devem ser funcionais e confortáveis em telas a partir de **370px** (sem overflow horizontal).
- Utilize elementos semânticos HTML5 (`<main>`, `<nav>`, `<button>`, `<input>`) com `aria-label` e `aria-describedby` apropriados.
- Preserve anotações `data-webmcp-*` nos formulários e pontos de interação para interoperabilidade com agentes de IA.

### 3. Fluxo de Trabalho Git
1. Crie uma branch para a sua feature/fix a partir da `main`:
   ```bash
   git checkout -b feature/minha-nova-funcionalidade
   ```
2. Escreva o código e os testes correspondentes (Unitário, Integração e E2E).
3. Certifique-se de que todos os testes passem:
   ```bash
   npm run test
   npm run cy:run
   ```
4. Faça commit seguindo o padrão [Conventional Commits](https://www.conventionalcommits.org/):
   ```bash
   git commit -m "feat(parsers): adiciona suporte ao formato xyz com testes"
   ```
5. Abra um Pull Request detalhando as alterações e os testes executados.

---

## 📄 Licença

Este projeto está sob a licença [MIT](LICENSE). Consulte o arquivo de licença para mais informações.

---

<p align="center">
  Desenvolvido com carinho para transformar texto em voz e conhecimento acessível. 🎧✨
</p>
