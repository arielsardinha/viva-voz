<!-- agent-graph-flow:start -->
## agent-graph-flow (`agf`) — viva-voz-text

Este projeto usa **agent-graph-flow** para gestão de execução via grafo persistente SQLite (`workflow-graph/graph.db`). **Tudo via CLI `agf` — zero MCP.**
Para detalhes aprofundados de comandos, gaps e arquitetura, consulte a skill [`agent-graph-flow`](.agents/skills/agent-graph-flow/SKILL.md).

### ⚠️ Regras Inegociáveis de Execução

1. **Grafo é a Fonte Absoluta da Verdade:** Nenhuma linha de código ou refatoração é escrita sem um nó correspondente no grafo (`agf node add` ou `agf start`).
2. **Fluxo de Trabalho Obrigatório:**
   - `agf preflight "<tópico>"` antes de iniciar.
   - `agf node status <id> in_progress` antes de codar.
   - **TDD Rigoroso:** Red → Green → Refactor (teste antes da implementação).
   - `agf check <id>` para validar Definition of Done (DoD).
   - `agf node status <id> done` (ou `agf done <id>`) ao concluir.
3. **Validação Obrigatória de Testes (Jest + Cypress) antes de encerrar qualquer prompt:**
   - Toda nova feature, componente, hook, adapter ou API route **DEVE** vir acompanhada de testes nos três níveis:
     - **Unitário** (`*.test.ts` / `*.test.tsx`) — lógica pura, hooks isolados, adapters, serviços de domínio.
     - **Integração** (`*.integration.test.tsx`) — interação entre componentes e chamadas de API/server actions, usando MSW para mocks de rede.
     - **E2E** (`cypress/e2e/*.cy.ts`) — fluxos críticos do usuário com seletores `data-cy`, `cy.intercept()` e `cy.checkA11y()`.
   - **SEMPRE execute `npm run test` (Jest) E `npm run cy:run` (Cypress)** antes de encerrar qualquer prompt ou tarefa.
   - Ambos devem passar com 100% de asserções e zero regressões antes de concluir a resposta.
   - Zero logs de erro indesejados (`console.error`, `console.warn`, `act()` warnings) e zero regressões.
4. **Qualidade & Arquitetura Clean:**
   - Arquivos < 800 linhas, funções < 50 linhas, responsabilidade única (SRP), imutabilidade, sem `any` e TypeScript estrito.
   - Investigue e expanda o que já existe antes de criar novos módulos (DRY).
   - Responsividade mobile a partir de 370px sem overflow horizontal.

### 📍 Estado do Roadmap Multi-Documento (SDD 00)

> Referência: [`docs/sdd/00-overview-multi-document-architecture.md`](docs/sdd/00-overview-multi-document-architecture.md)

- **Tier 1 — Documentos Essenciais** ✅ **CONCLUÍDO** — `.txt`, `.md`, `.docx`, `.epub`, Quick Paste, PDF, adapter registry completo.
- **Tier 2 — Web Reader e Apresentações** ✅ **CONCLUÍDO** — `.odt`, `.pptx`, `web-article.adapter`, `/api/extract-url`, `web-url-dialog`, `use-web-article-extractor` — todos implementados e testados.
- **Tier 3 — Multimodal e OCR** ⏳ Pendente — Imagens, PDFs digitalizados, OCR (Tesseract / Gemini Vision).
<!-- agent-graph-flow:end -->
