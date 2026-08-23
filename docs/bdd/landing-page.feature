# language: pt
Funcionalidade: Landing Page Moderna, Foco no Usuário Final, SEO 100/100 e Navegação Agêntica
  Como um visitante leitor/estudante humano ou agente autônomo de IA
  Eu quero acessar uma landing page rápida, visualmente elegante e focada na experiência de audição de documentos
  Para compreender os recursos reais do VivaVoz, explorar a biblioteca e iniciar a leitura em áudio

  Contexto:
    Dado que a aplicação Next.js está rodando com Server-Side Rendering (SSR) e Static Site Generation (SSG)
    E o tema padrão ativo é o Dark Mode com paleta harmoniosa e nós de fluxo visual

  @ui @visual @hero
  Cenário: Renderização do Hero Section com proposta de valor clara e CTA duplo
    Quando o usuário acessa a rota "/" da landing page
    Então a página deve carregar com tempo de FCP (First Contentful Paint) inferior a 0.8s
    E o elemento principal "main#main-content" deve estar visível
    E o título H1 deve conter a proposta de valor acolhedora de leitura neural e áudio sincronizado
    E o menu de navegação deve exibir os links "[Recursos]", "[Leitor]", "[Biblioteca]" e "[Apoiar]" sem link redundante de início
    E devem existir dois botões de CTA acessíveis no Hero:
      | Botão               | Ação / Destino          | Seletor                     |
      | Iniciar Gratuito    | Redirecionar para leitor| [data-cy="hero-cta-primary"] |
      | Ver Demonstração    | Abrir player interativo | [data-cy="hero-cta-secondary"]|

  @bento @features @ux
  Cenário: Interação e navegação no Bento Grid de funcionalidades reais
    Dado que o usuário rolou até a seção "#features"
    Quando o usuário passa o mouse (hover) sobre um dos cards do Bento Grid
    Então o card deve aplicar efeito de glassmorphism com borda com brilho sutil (border-glow)
    E o micrográfico interno correspondente deve animar suavemente
    E o leitor de tela deve anunciar a descrição completa da funcionalidade através de atributos "aria-describedby"

  @fluxo @processamento
  Cenário: Visualização do fluxo de processamento de documentos e voz
    Dado que o usuário rolou até a seção "#como-funciona"
    Então o container "[data-cy='hero-graph-flow-container']" deve estar visível
    E os nós de processamento devem detalhar em linguagem simples as etapas do documento até a voz

  @cta @conversao
  Cenário: Chamada para ação e experimentação direta do produto
    Dado que o usuário rolou até a seção "#conversao"
    Então devem estar visíveis os botões diretos de ação:
      | Ação                    | Destino / Comportamento   | Seletor                     |
      | Abrir o Leitor          | Navegar para "/leitor"    | [data-cy="cta-open-reader"]  |
      | Biblioteca Local        | Navegar para "/leituras"  | [data-cy="cta-open-library"] |
      | Contato & Feedback      | Abrir diálogo de contato  | [data-cy="cta-contact-dev"]  |

  @seo @performance @lighthouse
  Cenário: Conformidade com SEO Técnico e Metadados Schema.org JSON-LD
    Quando os crawlers de busca (Googlebot, Bingbot) solicitam o cabeçalho e HTML da página "/"
    Então o status de resposta deve ser 200 com cabeçalhos de cache otimizados
    E a tag "<title>" e a meta tag "description" devem estar presentes e descritivas
    E as meta tags OpenGraph e Twitter Cards devem estar configuradas apontando para "https://vivavoz.com"
    E o script "application/ld+json" deve conter os esquemas estruturados SoftwareApplication, Organization e WebPage

  @agentic @llms @webmcp
  Cenário: Descoberta e consumo por Agentes de IA via llms.txt e ferramentas WebMCP
    Quando um agente autônomo de IA requisita "/llms.txt"
    Então o endpoint deve responder com status 200 e Content-Type "text/markdown; charset=utf-8"
    E o corpo da resposta deve conter o cabeçalho H1 com o nome do projeto
    E deve listar todas as rotas e capacidades documentadas no padrão de links Markdown

  @mobile @responsividade
  Cenário: Responsividade mobile a partir de 370px de largura de tela
    Dado que o viewport está configurado para uma largura de 370px (Mobile Compacto)
    Quando a landing page é renderizada
    Então nenhum elemento deve ultrapassar a largura do viewport gerando scroll horizontal
    E o menu de navegação deve recolher para o formato drawer/sheet acessível
    E os botões de ação e cards do Bento Grid devem se reorganizar confortavelmente
