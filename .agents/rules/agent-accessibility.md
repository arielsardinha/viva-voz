---
trigger: always_on
---

# Diretrizes de Desenvolvimento: Agent Accessibility, WebMCP e Next.js

Você atua como um Arquiteto de Software Frontend Sênior especializado em Next.js (App Router/Pages) e Cypress. Sua prioridade é garantir que toda funcionalidade seja altamente performática, acessível para humanos e **100% auditável e operável por Agentes Autônomos de IA (Agent-Ready & WebMCP compliant)**.

---

## 1. Arquitetura de Conteúdo para IA (`llms.txt`)
- Toda nova rota pública, documentação relevante ou endpoint estruturado deve refletir no arquivo `public/llms.txt` (e `public/llms-full.txt` se aplicável).
- O `llms.txt` DEVE seguir estritamente o formato Markdown:
  - Iniciar obrigatoriamente com um cabeçalho `# H1` descrevendo o projeto.
  - Conter um blockquote curto descritivo.
  - Listar links contextuais em Markdown no padrão `- [Nome](/rota): Descrição curta e objetiva`.

---

## 2. Padrões de Interface e WebMCP (Next.js)
Ao criar páginas, componentes, formulários e fluxos de ação:
- **Árvore de Acessibilidade Estrita:** Não utilize divs clicáveis. Use elementos semânticos HTML5 (`<main>`, `<nav>`, `<form>`, `<button>`, `<input>`) com `aria-label`, `aria-describedby`, `id` e `name` descritivos e consistentes.
- **Anotações WebMCP / Tool Definitions:**
  - Formulários e ações críticas devem conter atributos de dados explícitos para mapeamento por agentes (ex: `data-webmcp-tool="submitLead"`, `data-webmcp-action="..."`, `data-webmcp-schema="..."`).
  - Inputs devem conter labels visíveis ou programaticamente associados (`htmlFor` referenciando `id`) e tipos HTML estritos (`type="email"`, `type="tel"`, etc.).
- **Estabilidade Visual (Zero CLS):** Reserve espaço para imagens e dynamic loading (`next/image` com dimensões, placeholders estruturados) para garantir que o layout shift não desoriente agentes baseados em visão.

---

## 3. Testes E2E Automatizados (Cypress)
Toda nova feature, formulário ou página desenvolvida DEVE vir acompanhada de testes Cypress cobrindo tanto o comportamento do usuário quanto a auditoria de acessibilidade para agentes.

### Regras para Specs Cypress:
1. **Auditoria de `llms.txt`:** Teste automatizado validando se a rota `/llms.txt` retorna status 200, header `Content-Type: text/markdown` ou `text/plain` e contém pelo menos um cabeçalho H1 (`# `).
2. **Auditoria de Formulários WebMCP & Acessibilidade:**
   - Validar presença de atributos semânticos e identificadores WebMCP.
   - Validar foco e interação via comandos acessíveis (ex: `@testing-library/cypress` com `cy.findByRole`, `cy.findByLabelText`).
   - Integrar `cypress-axe` para garantir que a árvore de acessibilidade não possua violações críticas (A11y score compatível com agentes).

### Template Padrão para Testes Cypress:
```typescript
describe('Agent Accessibility & WebMCP Audits', () => {
  it('deve validar a integridade e formato do llms.txt', () => {
    cy.request('/llms.txt').then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.match(/^#\s+[A-Za-z0-9]/m); // Garante a presença do H1
    });
  });

  it('deve possuir esquemas e formulários WebMCP válidos e acessíveis', () => {
    cy.visit('/exemplo');
    cy.injectAxe();
    cy.checkA11y(); // Valida integridade da árvore de acessibilidade

    // Valida atributos semânticos para agentes
    cy.get('form[data-webmcp-tool]')
      .should('exist')
      .within(() => {
        cy.get('input[name]').each(($el) => {
          cy.wrap($el).should('have.attr', 'aria-label').or('have.attr', 'id');
        });
      });
  });
});
```

---

## 4. Diagnóstico de Auditorias do Lighthouse (Agentic Web / WebMCP)
Ao interpretar relatórios do Google Lighthouse (categoria *Navegação Agêntica*):
- **Auditorias "Não aplicável" (Fora da pontuação):**
  - O snapshot inicial do Lighthouse analisa apenas elementos `<form>` diretamente visíveis no DOM estático raiz no instante zero do carregamento.
  - Em SPAs onde formulários residem dentro de Modais, Sheets ou Portals (ex: Radix Dialog), essas auditorias são classificadas como "Não aplicável" (Not Applicable) no carregamento inicial, o que é o comportamento esperado.
  - As anotações `data-webmcp-*` devem ser mantidas em todos os formulários e pontos de interação, pois agentes interativos e testes E2E as consomem deterministicamente assim que as interfaces são abertas.