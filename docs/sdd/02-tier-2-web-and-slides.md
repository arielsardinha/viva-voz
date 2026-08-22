# SDD 02: Tier 2 — Web Reader e Apresentações (URLs, .pptx, .odt)

> **Status:** Implementado ✅ — todos os artefatos concluídos e testados (322 testes passando)  
> **Prioridade:** P1 (Fase 2)  
> **Padrões Aplicados:** MVVM, Facade, Adapters, Builder & SOLID  
> **Componentes Afetados:** `src/app/api/extract-url/`, `src/lib/parsers/`, `src/components/pdf-reader/`  
> **Data:** Agosto de 2026  

---

## 1. Escopo e Objetivos

O **Tier 2** expande a versatilidade do VivaVoz para duas áreas essenciais de produtividade e consumo de conteúdo:
1. **Leitor de Artigos da Web (URL Reader):** Permite ao usuário colar o link de qualquer notícia, blog post ou artigo científico online e ouvir uma versão limpa, sem poluição visual, pop-ups ou anúncios.
2. **Apresentações de Slides (`.pptx`):** Permite a estudantes e profissionais ouvirem o conteúdo de slides de palestras e aulas, incluindo notas do apresentador.
3. **Documentos OpenDocument (`.odt`):** Compatibilidade com suítes livres como LibreOffice e Apache OpenOffice.

---

## 2. Arquitetura Técnica e Adapters

```
src/
  ├── app/
  │   └── api/
  │       └── extract-url/
  │           └── route.ts              # Route Handler Server-side (CORS bypass + Readability)
  ├── lib/
  │   └── parsers/
  │       ├── web-article.adapter.ts    # Implementa IDocumentParserAdapter (via API route)
  │       ├── pptx.adapter.ts           # Implementa IDocumentParserAdapter (XML DrawingML)
  │       └── odt.adapter.ts            # Implementa IDocumentParserAdapter (ODF XML)
  └── components/
      └── pdf-reader/
          └── web-url-dialog.tsx        # [VIEW] Diálogo de inserção de URL
```

---

## 3. Especificação dos Componentes do Tier 2

### 3.1. Leitor de Artigos Web (`web-article.adapter.ts` + Route Handler)
- **Problema:** O navegador bloqueia requisições HTTP para outros domínios via CORS.
- **Solução Server-First (RSC / Next.js Route Handler):**
  1. O usuário submete a URL no componente cliente `WebUrlDialog`.
  2. O cliente chama a API Route `POST /api/extract-url` (Server-side) passando a URL.
  3. O backend executa o fetch do HTML com timeout de 8 segundos e headers de browser padrão.
  4. Utiliza o algoritmo **Mozilla Readability** para extrair:
     - Título do artigo
     - Autor / Publicação
     - Texto limpo do corpo principal (descartando menus, anúncios, comentários e rodapés)
     - Imagem principal (*og:image* ou primeira imagem do corpo)
  5. Retorna o `ParsedDocument` estruturado construído via `ParsedDocumentBuilder`.

### 3.2. Extrator de Slides PowerPoint (`pptx.adapter.ts`)
- **Estratégia:**
  - Implementa `IDocumentParserAdapter`.
  - Utiliza `jszip` no client-side para ler a pasta `ppt/slides/slide*.xml`.
  - Ordena os slides numericamente (`slide1.xml`, `slide2.xml`, etc.).
  - Mapeia cada slide como um `DocumentChapter` ("Slide 1: Título", "Slide 2: ...").
  - Extrai textos contidos dentro de nós `<a:t>` (DrawingML text elements).
  - Extrai as notas do apresentador contidas em `ppt/notesSlides/`.

### 3.3. Extrator OpenDocument Text (`odt.adapter.ts`)
- **Estratégia:**
  - Implementa `IDocumentParserAdapter`.
  - Utiliza `jszip` para ler o arquivo `content.xml` na raiz do pacote ODT.
  - Extrai parágrafos `<text:p>` e cabeçalhos `<text:h>` preservando a hierarquia.

---

## 4. Interface do Usuário (UI/UX) e ViewModel

### 4.1. ViewModel de Extração Web (`useWebArticleExtractor.ts`)
- Encapsula o estado de validação de URL, requisição à API e feedback visual de loading/erro.

### 4.2. Diálogo "Ler da Web" (`web-url-dialog.tsx`)
- Botão elegante na barra de ações rápidas: `"🌐 Ler Artigo da Web"`.
- Modal acessível com atributos WebMCP (`data-webmcp-tool="extractWebArticle"`):
  - Input para URL com validação em tempo real (`https://...`).
  - Card de pré-visualização contendo título, site de origem, contagem de palavras e tempo estimado.
  - Botão de confirmação: `"Iniciar Leitura"`.

---

## 5. Critérios de Aceitação (BDD / INVEST)

### Cenário 1: Ingestão de Artigo da Web via URL
```gherkin
Dado que o usuário clica em "Ler Artigo da Web"
Quando ele insere o link "https://g1.globo.com/tecnologia/noticia-exemplo"
E clica em "Extrair Conteúdo"
Então o sistema deve consultar a rota "/api/extract-url"
E exibir a prévia do título e texto limpo sem anúncios
E ao confirmar, o artigo deve ser carregado no Player de voz
```

### Cenário 2: Upload de Apresentação PPTX
```gherkin
Dado que o usuário arrasta um arquivo "aula-historia.pptx"
Quando a extração for concluída
Então cada slide deve ser listado como uma seção no menu de capítulos
E o leitor deve narrar o texto de cada slide na ordem correta
```

---

## 6. Estratégia de Testes

### 6.1. Testes de Integração com MSW (Mock Service Worker)
- Mock da API `POST /api/extract-url` retornando artigos simulados e cenários de erro (404, 500, timeout, página protegida por paywall).
- Teste unitário do `pptx.adapter.test.ts` e `odt.adapter.test.ts` com fixtures XML reais.

### 6.2. Testes E2E (Cypress)
- Validação de abertura do modal de URL, inserção de link, tratamento de URLs inválidas e início de leitura.
- Auditoria de acessibilidade `cy.checkA11y()` no diálogo WebMCP.
