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
   - **SEMPRE execute `npm run test` (Jest) E `npm run cy:run` (Cypress)** antes de encerrar qualquer prompt ou tarefa.
   - Ambos os comandos devem ser executados e aprovados com 100% de asserções passando antes de concluir sua resposta.
   - Zero logs de erro indesejados (`console.error`, `console.warn`, `act()` warnings) e zero regressões.
4. **Qualidade & Arquitetura Clean:**
   - Arquivos < 800 linhas, funções < 50 linhas, responsabilidade única (SRP), imutabilidade, sem `any` e TypeScript estrito.
   - Investigue e expanda o que já existe antes de criar novos módulos (DRY).
   - Responsividade mobile a partir de 370px sem overflow horizontal.
<!-- agent-graph-flow:end -->
