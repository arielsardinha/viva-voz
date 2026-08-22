---
name: agent-graph-flow
description: Guia arquitetural, operacional, de governança e comandos determinísticos para o agent-graph-flow (agf) — orquestrador agêntico orientado a grafo SQLite persistente, ciclo de vida em 9 fases, TDD estrito, otimização de contexto e visualização.
---

# Skill: agent-graph-flow (`agf`)

## 1. Visão Geral e Arquitetura
O **agent-graph-flow (`agf`)** é o motor determinístico de orquestração de trabalho e governança agêntica para desenvolvimento orientado a especificações.
- **Persistência Local:** Grafo armazenado em banco SQLite em `workflow-graph/graph.db` (gitignored por padrão).
- **Sem Dependência MCP:** Operação 100% via CLI local determinística (`agf`).
- **Fonte Única de Verdade (SSoT):** Nenhuma alteração de código ou refatoração é realizada sem um nó correspondente no grafo.
- **Transições de Estado Válidas:** `backlog` → `in_progress` → `done` (ou `blocked`).

---

## 2. Ciclo de Vida Operacional

### Fluxo Pipeline Rápido (2 Comandos)
```bash
agf start                  # wake-up + checkout de task + context pack + status in_progress
# ... ciclo TDD (Red → Green → Refactor) ...
agf done <id>              # validação DoD + registro de memória + status done + sugestão da próxima
```

### Fluxo Granular (Controle Fino)
```bash
agf preflight "<tópico>"   # Análise de branch, commits, dirty tree e risco de duplicatas
agf next                   # Identifica a próxima tarefa prioritária (WIP limit = 1)
agf context <id>           # Gera context-pack compacto com RAG e dependências
# ... ciclo TDD ...
agf check <id>             # Executa checklist determinístico de Definition of Done (DoD Score)
agf node status <id> done  # Atualiza o status após validação completa
```

---

## 3. Gestão e Consulta do Grafo

| Comando | Finalidade |
| :--- | :--- |
| `agf preflight "<tópico>"` | Avalia estado do git, dirty tree, WIP e duplicatas antes de criar nós. |
| `agf node add --type <tipo> --title "..." --description "..." --ac "..."` | Cria nó (`requirement`, `epic`, `feature`, `task`, `bugfix`). |
| `agf node update <id> --title "..." --ac "..."` | Atualiza metadados ou critérios de aceitação do nó. |
| `agf node status <id> <status>` | Atualiza o estado (`backlog`, `in_progress`, `done`, `blocked`). |
| `agf check <id>` | Valida o DoD Score determinístico e conformidade dos Critérios de Aceitação. |
| `agf gaps --severity <level> --json` | Rastreia lacunas (ex: requisitos sem tasks, tasks sem testes). |
| `agf brief <id>` | Emite spec atômica para execução ou delegação de sub-agentes. |
| `agf query --status <status> --type <tipo>` | Filtra e lista nós por atributos e dependências. |
| `agf stats` | Exibe métricas agregadas do grafo e progresso geral. |
| `agf dashboard` | Inicia o servidor local da API e painel visual em `http://127.0.0.1:3000`. |

---

## 4. Definition of Done (DoD) & Governança de Qualidade

A transição para `done` via `agf done <id>` ou `agf node status <id> done` exige validação dos 5 pilares:

1. **Critérios de Aceitação (AC):** Pelo menos 1 critério verificável e testável preenchido.
2. **INVEST Score ≥ 60:** Granularidade, independência e clareza da tarefa avaliadas pelo motor.
3. **Resolução de Dependências:** Ausência de nós bloqueadores pendentes no grafo.
4. **Trilha de Auditoria de Estado:** Passagem obrigatória e registrada por `in_progress`.
5. **Automação e Testes:** 
   - Testes unitários/integração e E2E executados e passando com 100% de sucesso.
   - Ausência de regressões e logs de erro residuais.

---

## 5. Harness de Completude & Rastreabilidade (`agf gaps`)

O fechamento de lacunas é obrigatório antes da conclusão de épicos e fases:
- **Níveis de Severidade:** `--severity required | recommended | optional`.
- **Rastreabilidade Bidirecional:**
  - Todo `requirement` deve originar pelo menos uma `task`.
  - Toda `task` deve possuir critérios de aceitação e cobertura de testes mapeada.
  - Correção imediata de nós com `INVEST Score < 60`.

---

## 6. Otimização de Contexto e Gateway de Modelos

- **Provedores Integrados:** `copilot`, `anthropic`, `openai`, `gemini`, `openrouter`, `deepseek`, `groq`, `ollama`.
- **Mecanismos de Economia de Tokens:**
  - *Diff-Edits:* Envio exclusivo de blocos e linhas modificadas.
  - *Compressão AST & SmartCrusher:* Minificação semântica de payloads JSON e árvores de código.
  - *Compact Context Retrieval (CCR):* RAG local focado no grafo e nos nós diretamente conectados.
- **Monitoramento:** `agf metrics`, `agf savings` e `agf eval`.