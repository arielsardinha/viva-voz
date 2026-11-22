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
   - [🤖 IA Local no Navegador (/modelos)](#-ia-local-no-navegador-modelos)
   - [🧩 Quiz A2UI Inteligente](#-quiz-a2ui-inteligente)
   - [📚 Modos do Leitor](#-modos-do-leitor)
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
- 💬 **Assistente de Leitura (Chat com Documento):** Chat contextual fixo ao lado do texto para tirar dúvidas, resumir seções ou explicar trechos do documento aberto, com atalhos de prompt rápidos.
- 🤖 **IA 100% Local (Offline):** Vozes neurais (Kokoro, Piper Cadu e Piper Faber) e chat com Gemma 4 rodando inteiramente no dispositivo, gerenciados pela página dedicada `/modelos`.
- 🔁 **Fallback Automático entre Motores:** No modo *Automático*, o chat tenta **Nuvem → Gemini Nano → Gemma local**, pulando motores indisponíveis e seguindo para o próximo se um falhar antes de responder.
- 🧩 **Quiz A2UI Inteligente:** Gera de 1 a 10 perguntas de múltipla escolha a partir do documento, respeitando o orçamento de tokens de cada motor, com jornada visual de progresso.

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

### 🤖 IA Local no Navegador (`/modelos`)

A página **`/modelos`** é o único lugar para baixar, ativar, atualizar e remover os modelos locais (substituiu a antiga gaveta lateral). A navegação até ela é feita no cliente (`/modelos?model=<id>` destaca o card pedido), então downloads em andamento continuam rodando; o progresso aparece como badge no link **"IA Local"** do cabeçalho. Cada card mostra a *configuração recomendada* da máquina.

| Modelo | Tipo | Tamanho | Licença | Observações |
| :--- | :--- | :--- | :--- | :--- |
| **Kokoro 82M** | Voz (TTS) | ~295 MB | Apache-2.0 | MediaPipe em Web Worker, com popup de carregamento e progresso real |
| **Piper · Cadu (PT-BR)** | Voz (TTS) | ~63 MB | CC0-1.0 | Voz masculina; espeak-ng (WASM) + ONNX Runtime Web em Web Worker |
| **Piper · Faber (PT-BR)** | Voz (TTS) | ~63 MB | CC0-1.0 · base CC-BY-4.0 | Voz masculina; o runtime Piper troca de voz liberando a sessão ONNX anterior |
| **Gemma 4 E2B** | Chat multimodal | ~2,34 GB | Apache-2.0 | Arquivo `gemma-4-E2B-it-gpu.litertlm` (LiteRT-LM), recomendado para a web |
| **Gemma 4 E4B** | Chat multimodal | ~3,31 GB | Apache-2.0 | Somente computador (oculto em celular/tablet, inclusive iPad que se apresenta como Mac) |

**Regras e decisões importantes:**
- **Um modelo de chat por vez:** E2B e E4B são exclusivos entre si; com um instalado (ou baixando), o card do outro pede a remoção antes. O chat local usa o Gemma que estiver instalado.
- **Roteador de voz:** `LocalTtsEngine` aceita qualquer runtime; um roteador escolhe Kokoro ou Piper conforme a voz selecionada (prefixo `piper:`).
- **Download resiliente:** blocos de 32 MB via HTTP `Range`, com retry e retomada; `navigator.storage.persist()` e Wake Lock durante o download; checagem de cota antes de começar (`ModelStorageQuotaError`). O manifesto só é gravado depois de conferir todos os blocos — um manifesto incompleto vira "não baixado" e a retomada baixa apenas o que falta.
- **iOS / WebKit:** detecta o `Range` perdido no redirect cross-origin do Hugging Face e passa a pedir os blocos direto na URL final do CDN; download único acima de 512 MB não é tentado.
- **Perfil "lite" do Gemma:** em iOS e aparelhos com ≤ 4 GB de RAM, só texto (sem codificadores de visão/áudio), janela de 2048 tokens e ~3000 caracteres de documento. Respostas limitadas a 512 (lite) / 1024 (full) tokens, `enable_thinking: false`. Cada pergunta cria uma conversa LiteRT nova para não estourar a janela de contexto.
- **Service Worker:** não intercepta requisições cross-origin nem com `Range`; o cache do app virou `vivavoz-app-v2` (o `v1`, que guardava cópias inteiras dos modelos, é apagado). Os modelos ficam no cache `vivavoz-local-ai-models-v1`.

### 🧩 Quiz A2UI Inteligente

O quiz segue o protocolo **A2UI (Agent-to-User Interface)**, separando estrutura (`surfaceUpdate`), estado vivo (`dataModelUpdate`) e ações (`userAction`). Código em `src/lib/a2ui/` e rota em `src/app/api/quiz/`.

- **1 a 10 perguntas**, com o teto ajustado ao orçamento de tokens de cada motor (`QUIZ_TOKEN_BUDGETS`):

  | Motor | Tokens de entrada | Máx. perguntas |
  | :--- | :--- | :--- |
  | Nuvem / Modo rápido offline | 6000 | 10 |
  | Gemini Nano | 2000 | 8 |
  | Gemma local (full) | 1500 | 8 |
  | Gemma local (lite) | 650 | 4 |

- **Cobertura do documento:** o planejador usa o texto inteiro quando cabe ou uma amostragem estratificada por páginas quando não cabe, e informa a cobertura ao usuário.
- **Modelos locais:** recebem um formato compacto (`correct` + `wrong[]`), a posição da resposta correta é embaralhada e o parser também aceita o molde "achatado" que o Gemma às vezes produz. Lotes que falham são repetidos uma vez, e a meta é completada com perguntas do modo rápido em parágrafos não cobertos.
- A barra "Seu nível de certeza" e o botão "Mais difícil" foram removidos para simplificar a jornada.

### 📚 Modos do Leitor

O leitor tem dois modos: **Assistente IA** (`ai-study`, padrão) e **Zen**. O antigo template *Estúdio Moderno* foi removido e preferências salvas como `modern` migram automaticamente para `ai-study`.

No modo **Assistente IA**:
- o chat "Assistente de leitura" fica fixo à direita durante a rolagem;
- a barra de prompts rápidos (`QuickPromptsBar`) rola na horizontal com roda do mouse, setas ou scrollbar;
- o player de áudio vira um dock flutuante (`FloatingAudioDock`).

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
├── public/                  # Manifest PWA, Service Worker (sw.js), ícones, llms.txt e assets estáticos
├── scripts/                 # run-tests.mjs (roteia `npm test` entre Jest e Cypress)
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/             # Route Handlers / BFF (Auth, Sync, OCR, TTS, Ask, Quiz, Extract URL)
│   │   ├── leitor/          # Página do leitor
│   │   ├── leituras/        # Biblioteca de leituras
│   │   ├── modelos/         # Central de modelos de IA local
│   │   ├── layout.tsx       # Root Layout com Providers e Fontes
│   │   └── page.tsx         # Página principal / Landing & Dashboard
│   ├── components/          # Componentes visuais React (UI / Modais / Player)
│   │   ├── local-ai/        # Cards de modelo, central /modelos e barra multimodal do chat
│   │   ├── pdf-reader/      # Leitor (Assistente IA / Zen), chat, player e Quiz A2UI
│   │   └── ui/              # Design System base (Radix UI / Tailwind)
│   ├── context/             # React Contexts (PlayerContext, LibraryContext, etc.)
│   ├── hooks/               # Custom Hooks (useTTS, useSync, useIndexedDB, etc.)
│   ├── instrumentation.ts   # Configuração de telemetria / Sentry
│   └── lib/                 # Núcleo de lógica e serviços
│       ├── a2ui/            # Quiz A2UI: tipos, planejador de conteúdo, parser e gerador
│       ├── ai/              # Integração Gemini API & Prompt API
│       ├── domain/          # Entidades e Interfaces de Domínio
│       ├── facade/          # Fachadas para orquestração de leitura e áudio
│       ├── local-ai/        # IA local: catálogo, motores (Kokoro, Piper, Gemma), workers, storage e diagnóstico
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
   SENTRY_ORG=sua_org          # padrão: horda-run
   SENTRY_PROJECT=seu_projeto  # padrão: viva-voz
   ```
3. **Tunnel `/monitoring`:** os eventos do cliente saem pelo próprio domínio do app (`tunnelRoute`), para não serem barrados por bloqueadores ou DNS privados que filtram `*.sentry.io`.
4. **Diagnóstico da IA local (`src/lib/local-ai/diagnostics.ts`):** breadcrumbs e logs por bloco de download e por tentativa de inicialização do motor, com contexto do aparelho (cota, persistência, WebGPU, RAM, UA). Uma sentinela no `localStorage` detecta quando o navegador encerra a aba (ex.: falta de memória no iPhone) e reporta, no carregamento seguinte, em qual etapa isso aconteceu.
5. O projeto possui sanitização automática (`beforeSend`) para garantir que chaves de API (`userApiKey`), senhas e dados sensíveis de documentos **nunca** sejam enviados para os servidores do Sentry.

---

## 🧪 Suíte de Testes Automatizados & Qualidade

O projeto adota uma política rigorosa de garantia de qualidade com cobertura nos 3 níveis:

### Testes Unitários & Integração (Jest + RTL + MSW)
Validam a lógica de negócio pura, adapters de parsing, manipulação do IndexedDB, hooks e fluxo de API com mocks de rede via Mock Service Worker (MSW).

```bash
# Executar todos os testes unitários e de integração
npm run test

# Arquivos .cy.ts passados ao npm test vão para o Cypress
# (sobe `next start` se não houver servidor em :3000; exige `npm run build` antes)
npm run test -- cypress/e2e/exemplo.cy.ts

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
| `npm run test` | Executa o Jest; argumentos `*.cy.ts` são encaminhados ao Cypress (`scripts/run-tests.mjs`). |
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

Este projeto é público, gratuito e de código aberto sob a licença **CC BY-NC-SA 4.0** (Creative Commons Atribuição-NãoComercial-CompartilhaIgual 4.0 Internacional).

* ❌ **Uso comercial e vendas são estritamente proibidos.**
* ❌ **Proibida a incorporação em sistemas privados ou proprietários fechados.**
* ✅ **Livre para estudo, uso pessoal e contribuições comunitárias.**

Consulte o arquivo [LICENSE](LICENSE) para mais detalhes.

---

<p align="center">
  Desenvolvido com carinho para transformar texto em voz e conhecimento acessível. 🎧✨
</p>
