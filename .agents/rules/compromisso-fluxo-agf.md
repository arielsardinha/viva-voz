# Compromisso de Fluxo Obrigatório com `agf` (Agent Graph Flow)

Esta diretriz é uma **regra inegociável e mandatória** para todo e qualquer prompt recebido no projeto **VivaVoz**.

---

## 1. Princípio Fundamental
NENHUMA linha de código, refatoração, correção de bug ou nova funcionalidade pode ser escrita sem que o trabalho esteja devidamente mapeado, rastreado e gerenciado no grafo persistente (`agf`).

---

## 2. Ciclo de Execução Obrigatório a Cada Prompt

Ao receber qualquer solicitação do usuário que envolva alteração, criação ou refatoração de código:

1. **Investigar o Git e o Grafo Primeiro:**
   - Executar `agf preflight "<tópico>"` para verificar branch, conflitos e nodes do tema.
   - Executar `agf stats` ou `agf query` para verificar o estado atual.

2. **Garantir a Existência do Nó no Grafo (`agf node add`):**
   - Se a tarefa não existir no grafo, criá-la imediatamente antes de tocar em código:
     ```bash
     agf node add --type task --title "<Título da Tarefa>" --description "<Descrição clara e objetiva>"
     ```
   - Obter o ID do nó gerado (`<id>`).

3. **Mudar Status para `in_progress` Antes de Codar:**
   - Executar obrigatoriamente antes de modificar ou criar arquivos:
     ```bash
     agf node status <id> in_progress
     ```

4. **Desenvolvimento Orientado a Testes (TDD):**
   - Escrever testes automatizados (Jest / React Testing Library / Cypress).
   - Implementar a funcionalidade com Clean Code, SOLID e respeito aos limites de tamanho de arquivo (< 800 linhas).
   - Validar com `npm run test` garantindo **100% de aprovação e zero logs de erro/warnings**.

5. **Validação de DoD e Conclusão do Nó:**
   - Validar o nó no agf:
     ```bash
     agf check <id>
     ```
   - Marcar como concluído no grafo:
     ```bash
     agf node status <id> done
     # ou
     agf done <id>
     ```

6. **Feedback Transparente:**
   - Informar ao usuário no relatório final o ID do nó concluído no `agf`, o status do grafo (`agf stats`) e os testes validados.

---

> **Sem nó no grafo = Sem código no disco. O `agf` é a única fonte de verdade da execução.**
