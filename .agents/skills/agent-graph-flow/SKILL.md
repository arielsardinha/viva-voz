---
name: agent-graph-flow
description: Guia arquitetural, operacional e de comandos completos para o agent-graph-flow (agf), gerenciador de execução de tarefas orientado a grafo SQLite persistente, economia de tokens, ciclo de vida em 9 fases, TDD e harness de completude.
---

# Skill: agent-graph-flow (`agf`)

## 1. Visão Geral e Filosofia
O **agent-graph-flow (`agf`)** é o motor determinístico de orquestração de trabalho e governança agêntica.
- **Armazenamento:** Grafo persistente SQLite em `workflow-graph/graph.db` (local, gitignored).
- **Sem MCP:** 100% operado via CLI local determinístico `agf`.
- **Fonte Única de Verdade:** Nenhuma linha de código ou refatoração é feita sem um nó correspondente no grafo.

---

## 2. Ciclo de Vida e Fluxo de Trabalho

### Fluxo Pipeline (2 Comandos)
```bash
agf start                 # wake-up + next + context + marca in_progress
# … implementação com TDD (Red → Green → Refactor) …
agf done <id>             # DoD + memória + marca done + sugere próxima
```

### Fluxo Granular
```bash
agf next                  # puxa a próxima task (pull, WIP=1)
agf context <id>          # context-pack compacto + RAG
# … TDD …
agf check <id>            # Definition of Done + validação AC
agf node status <id> done # transição de status validada
```

---

## 3. Gestão do Grafo (Comandos Essenciais)

| Comando | Descrição |
| :--- | :--- |
| `agf preflight "<tópico>"` | Lê branch, commits pendentes, dirty tree, WIP e risco de duplicatas antes de codar. |
| `agf node add --type task --title "..." --description "..." --ac "..."` | Cria um novo nó no grafo com critérios de aceitação. |
| `agf node status <id> <status>` | Atualiza o status (`backlog`, `in_progress`, `done`, `blocked`). |
| `agf check <id>` | Executa checklist determinístico de Definition of Done (DoD Score). |
| `agf gaps` | Detecta lacunas de rastreabilidade (requirements → tasks → testes). |
| `agf stats` | Mostra métricas agregadas do backlog e status dos nós. |
| `agf query` | Consulta nós do grafo com filtros. |
| `agf brief <id>` | Gera spec atômica de execução/delegação da tarefa. |

---

## 4. Definition of Done (DoD)

Antes de executar `agf done <id>` ou marcar como `done`:
1. **Critérios de Aceitação (AC):** Pelo menos 1 critério verificável preenchido.
2. **INVEST Score ≥ 60:** Clareza e granularidade da tarefa.
3. **Sem Blockers:** Dependências resolvidas.
4. **Status Flow Válido:** Passagem obrigatória por `in_progress`.
5. **Testes Automatizados:** Suíte de Jest (`npm run test`) e Cypress (`npm run cy:run`) passando 100% com zero logs de erro.

---

## 5. Harness de Completude (`agf gaps`)
- `agf gaps --severity required --json`: identifica requisitos sem tasks, tasks sem testes ou AC ambíguos.
- Fechamento determinístico das lacunas apontadas antes de avançar para a próxima fase.

---

## 6. Economia de Tokens e Providers
- **Providers suportados via CLI:** `copilot`, `anthropic`, `openai`, `gemini`, `openrouter`, `deepseek`, `groq`, `ollama`.
- **Alavancas automáticas no gateway:** Diff-edits (somente linhas alteradas), compressão AST, SmartCrusher para JSON, CCR reversível e lossy-gate.
- **Medição:** `agf metrics`, `agf savings`, `agf eval`.
