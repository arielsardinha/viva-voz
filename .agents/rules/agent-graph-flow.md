---
trigger: always_on
---

<!-- agent-graph-flow:start -->
<!-- agent-graph-flow:sha256 bb6fa5646e3b24b88dd0529fdc024e50204edf3a57d31d2f84b92fbc592245ce -->
## agent-graph-flow (`agf`) — viva-voz-text

Este projeto usa **agent-graph-flow** para gestão de execução via grafo persistente (SQLite).
Dados em `workflow-graph/graph.db` (local, gitignored). **Tudo via o CLI `agf` — zero MCP.**

### ⚠️ Regra de Execução OBRIGATÓRIA

**O grafo (`agf`) é a fonte de verdade ABSOLUTA. Nenhuma implementação acontece fora do grafo.**

1. **Node deve existir** — crie antes de escrever qualquer código (`agf node add` ou `agf import-prd`).
2. **Fluxo obrigatório** — `agf start → [TDD] → agf done` ou granular (`agf next → agf context <id> → [TDD] → agf check <id> → agf node status <id> done`).
3. **Epic = estrutura primeiro** — crie Epic + tasks + edges antes da implementação.
4. **Status tracking** — `agf node status <id> in_progress` antes de codar; `agf node status <id> done` (ou `agf done <id>`) após completar.
5. **Validação** — `agf check <id>` (DoD + AC + TDD) após cada task.
6. **Zero trabalho não-rastreado** — sem node no grafo = sem código.

### 🌍 Regras Universais de Engenharia

1. **Investigue antes de codar — não duplique:** Leia estado real (git, branches, WIP) antes de implementar. `[advisory]`
2. **Investigue e EXPANDA, nunca recrie:** Procure o módulo dono e estenda; criar do zero só se não existir. `[advisory]`
3. **Fonte única de verdade (DRY):** Extraia e centralize blocos repetidos. `[advisory]`
4. **Legibilidade é multiplicador:** Arquivos e funções pequenos, SRP, early returns, nomes descritivos, zero código morto. `[enforced:file-size-guard]`
5. **Núcleo puro, I/O nas bordas (SOLID/DIP):** Lógica desacoplada de I/O concreto, adapters isolados. `[advisory]`
6. **Teste contra fonte REAL:** Evite dublês/mocks cegos; suba a fonte real se necessário. `[advisory]`
7. **Pronto = critério ↔ código ↔ teste no disco:** O sistema de arquivos vence o relatório. `[advisory]`
8. **Prove valor no modo do consumidor:** Valide o caminho percorrido pelo usuário real. `[advisory]`
9. **Valide a INTERFACE, não só a API:** Exercite telas e fluxos visuais completos. `[advisory]`
10. **Enforcement determinístico:** Regras críticas pertencem a hooks/CI, não à memória. `[advisory]`
11. **Capacidade dormente é vazamento:** Código não-conectado entrega zero. `[advisory]`
12. **Gerar menos reduz custo:** Reutilize scaffolds e edite apenas deltas. `[advisory]`
13. **Filtre na origem:** Busque e projete dados deterministicamente antes de ler tudo. `[enforced:shell-output-compression]`
14. **Comente o porquê:** Registre decisões, invariantes e gotchas. Código vence comentário. `[advisory]`

### ⭐ Regras de Ouro

1. **Investigue git + grafo PRIMEIRO:** Execute `agf preflight "<tópico>"` antes de iniciar (`wip-conflict`/`duplicate-risk` = pare).
2. **Expandir > Recriar:** Use `agf search`/`agf query` + grep para reaproveitar módulos.
3. **Dogfood:** Conduza o ciclo via `agf`; use novos comandos no fluxo.
4. **Ambiente:** No repo, execute sempre `npm run dev -- <cmd>`.
5. **Código/Grafo > Memória:** Reconcilie dados com `agf stats`/`agf query`.
6. **Qualidade & Modularidade:** Arquivos < 800 linhas (`agf lint-files`), funções < 50 linhas, sem `any`, tipos estritos. Scaffolding via CLI: `agf skill new`, `agf agent create`, `agf hooks add`.

### Custo de Token, Providers & Levers

- **Providers:** Selecione com `agf provider use <id>` (Anthropic, OpenAI, OpenRouter, Gemini, Bedrock, Azure, DeepSeek, GLM, Kimi, Groq, Copilot, Ollama). Liste com `agf doctor --providers`.
- **Alavancas Automáticas:** Diff-edits, Repo-map (PageRank), Lossy-gate, SmartCrusher, compressão AST, CCR reversível (`agf retrieve <hash>`).
- **Medição:** `agf metrics [--economy-report|--simulate]`, `agf eval --models <ids> --live`, `agf savings [--reset]`.
- **Levers Bio/Matemáticos:** `agf economy list` / `agf economy on|off <lever>` (`forage_stop`, `ncd_dedup`, `memory_salience`, etc.).
- **Guardrail Shell:** CLIs sem hooks (Copilot, Cursor, Gemini, Codex) devem usar `agf compress run -- <cmd>`. Claude Code comprime via hook nativo.

### Harness de Completude — `agf gaps`

Detecta lacunas (rastreabilidade, AC, NFRs, edge-cases, design drift) deterministicamente (~0 tokens).
1. `agf gaps --severity required --json`
2. Aplique as correções via comandos indicados em `applyVia`.
3. Re-execute `agf gaps` até `ready: true`.

### Brief de Execução & Delegação

- Gere a spec: `agf brief <id>` (`--format markdown|json|claude-prompt`).
- Campos: Intenção (1 linha), Tarefa atômica, Imite, Ler/tocar, Contrato, AC (2–4), NÃO fazer, Blast radius, Orçamento, Incerteza, Teste com (fixture/stub), DoD, Self-review.
- Validação: Parse estruturado com `parseExecutorResult()` e `validateBriefReady()`.
- Retorno padronizado: `{"arquivos":[],"testes":{"passed":N,"failed":0},"desvios":[]}`.

### Fluxos de Trabalho

```bash
# Pipeline rápido
agf start                 # wake-up + next + context + in_progress
# [TDD: Red -> Green -> Refactor]
agf done <id>             # DoD + memória + done + métricas

# Granular
agf next                  # pull (WIP=1)
agf context <id>          # context-pack
agf check <id>            # Definition of Done + TDD
agf node status <id> done # transição validada

# Modo Delegado (sem provider ativo)
agf next
agf brief <id>
# [Implementação externa]
agf submit <id> --result '{"arquivos":["x.ts"],"testes":{"passed":N,"failed":0},"desvios":[]}'
```

### Lifecycle (9 Fases) & Skills

1. **ANALYZE:** `agf import-prd` · `agf node add` · `agf gate`
2. **DESIGN:** `agf node add/edge add` · `agf constitution` · `agf gate design`
3. **PLAN:** `agf decompose` · `agf template apply` (Skill: `graph-backlog-generation` via `agf stats --select data.byStatus`)
4. **IMPLEMENT:** `agf start` → TDD → `agf done` (Skill: `graph-builder-leafcutter`)
5. **VALIDATE:** `agf check <id>` · `agf gate` · `agf metrics`
6. **REVIEW:** `agf export` · `agf insights` · `agf gate review`
7. **HANDOFF:** `agf memory write` · `agf snapshot create` · `agf gate handoff`
8. **DEPLOY:** `agf export` · `agf forecast` · `agf gate deploy` (harness ≥ 70)
9. **LISTENING & HARDEN:** `agf harness --violations` (Skill: `graph-woodpecker`)

### Definition of Done (`agf check <id>`)

| # | Critério | Severidade |
|---|---|---|
| 1-4 | Acceptance Criteria presentes, Score AC ≥ 60 (INVEST), sem blockers, status flow válido | `required` |
| 5-8 | Descrição presente, tamanho adequado (não L/XL), ≥1 AC testável, testFiles preenchido | `recomendado` |

### Princípios de Fluxo & XP

- **WIP = 1:** `agf next` (Pull); fluxo puxado com foco em cycle time e eliminação de gargalos (TOC/Lean).
- **TDD Rigoroso:** Teste antes do código; decomposição atômica (tarefas ≤ 2h); honestidade contra alegações falsas (`agf node add --type risk`).
- **Gates Hierárquicos:** Task (`npm run test:blast`), Épico (`npm run test:node`), PR (`npm test`).
- **Spec-Driven:** `agf constitution`, `agf preset`, `agf spec --generate/--validate`, `agf spec-sync`.
- **Memory ≠ Live:** Código e banco SQLite vencem arquivos de memory; verifique com `agf stats`/`agf query`.

### Contexto do Projeto (Stack)

- **TypeScript:** `strict: true`, sem `any`, tipos explícitos em APIs públicas.
- **React:** Componentes funcionais, props tipadas, hooks sem loops de dependência, testes via React Testing Library (RTL).
- **Jest:** `*.test.ts`, asserções declarativas, isolamento de escopo e mocks explícitos (`jest.fn()`).
- **Node.js & Pacotes:** ESM (`node:` prefix em built-ins) e `npm` (lockfile versionado).

> **Referência rápida sob demanda:** `agf help` (260+ comandos), `agf <cmd> --help`, `agf retrieve-command "<intenção>"`, `agf dashboard` (TUI/Web Graph & Economy).
<!-- agent-graph-flow:end -->
