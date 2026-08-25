describe("Landing Page Moderna, Otimização SEO 100/100 e Navegação Agêntica (BDD)", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  describe("@ui @visual @hero - Cenário: Renderização do Hero Section com diagrama de fluxo e CTA duplo", () => {
    it("deve carregar a landing page na rota '/' com elemento main e título H1 acolhedor", () => {
      cy.get("main#main-content").should("be.visible");
      cy.get("h1").should("be.visible").and("contain.text", "Ouça qualquer documento como se fosse um audiolivro");
    });

    it("deve exibir navegação limpa sem o link 'Início'", () => {
      cy.get("nav[aria-label='Navegação principal']").within(() => {
        cy.contains("Início").should("not.exist");
        cy.contains("Recursos").should("be.visible");
        cy.contains("Leitor").should("be.visible");
        cy.contains("Biblioteca").should("be.visible");
        cy.contains("Apoiar").should("be.visible");
      });
    });

    it("deve renderizar os dois botões de CTA acessíveis no Hero", () => {
      // CTA Primário
      cy.get('[data-cy="hero-cta-primary"]')
        .should("be.visible")
        .and("contain.text", "Começar a Ouvir Gratuitamente")
        .and("have.attr", "href", "/leitor");

      // CTA Secundário
      cy.get('[data-cy="hero-cta-secondary"]')
        .should("be.visible")
        .and("contain.text", "Ver Demonstração");

      // Clicar no CTA secundário deve abrir o player de demonstração
      cy.get('[data-cy="hero-cta-secondary"]').click();
      cy.get('[data-cy="interactive-demo-modal"]').should("be.visible");
      cy.contains("Demonstração Interativa VivaVoz").should("be.visible");
      cy.contains("Voz Neural VivaVoz HD").should("be.visible");
      cy.get('[data-cy="demo-play-btn"]').should("be.visible").click();
      cy.get('[data-cy="demo-sentence-1"]').should("be.visible").click();
      cy.contains("Sentença 2 de 4").should("be.visible");
      cy.get('[data-cy="demo-close-btn"]').click();
      cy.get('[data-cy="interactive-demo-modal"]').should("not.exist");
    });
  });

  describe("@bento @features @ux - Cenário: Interação e navegação no Bento Grid de funcionalidades", () => {
    it("deve navegar até #features e interagir com os cards com glassmorphism e aria-describedby", () => {
      cy.get("#features").scrollIntoView().should("be.visible");

      const features = [
        { id: "feature-tts", descId: "desc-feature-tts" },
        { id: "feature-ai", descId: "desc-feature-ai" },
        { id: "feature-sync", descId: "desc-feature-sync" },
      ];

      features.forEach((feature) => {
        cy.get(`[data-cy="bento-card-${feature.id}"]`)
          .should("exist")
          .and("have.class", "border-glow");

        cy.get(`#${feature.descId}`).should("exist");
      });
    });
  });

  describe("@fluxo @processamento - Cenário: Visualização do fluxo de processamento", () => {
    it("deve renderizar o fluxo de Como Funciona com 3 passos descritivos", () => {
      cy.get("#como-funciona").scrollIntoView().should("be.visible");
      cy.get('[data-cy="hero-graph-flow-container"]').should("be.visible");
      cy.get("svg").should("exist");

      cy.get('[data-cy="graph-node-step-1"]').should("be.visible");
      cy.get('[data-cy="graph-node-step-2"]').should("be.visible");
      cy.get('[data-cy="graph-node-step-3"]').should("be.visible");
    });
  });

  describe("@casos-de-uso - Cenário: Exibição de casos de uso e FAQ", () => {
    it("deve renderizar seções de Casos de Uso e FAQ", () => {
      cy.get("#casos-de-uso").scrollIntoView().should("be.visible");
      cy.contains("Estudantes & Concurseiros").should("be.visible");
      cy.contains("Pesquisadores & Profissionais").should("be.visible");
      cy.contains("Foco & Acessibilidade (TDAH e Dislexia)").should("be.visible");

      cy.get("#faq").scrollIntoView().should("be.visible");
      cy.contains("Perguntas Frequentes (FAQ)").should("be.visible");
      cy.get('[data-cy="faq-item-faq-mobile"]').should("be.visible");
      cy.get('[data-cy="faq-item-faq-security"]').should("be.visible");
      cy.get('[data-cy="faq-item-faq-gemini"]').should("be.visible");
      cy.get('[data-cy="faq-item-faq-pricing"]').should("be.visible");
    });
  });

  describe("@cta @conversao - Cenário: Chamada para ação direta e honesta do produto", () => {
    it("deve exibir links de ação rápida para Leitor, Biblioteca e Contato", () => {
      cy.get("#conversao").scrollIntoView().should("be.visible");
      cy.get('[data-cy="cta-open-reader"]')
        .should("be.visible")
        .and("have.attr", "href", "/leitor")
        .and("contain.text", "Começar a Usar o Viva-Voz Agora");

      cy.get('[data-cy="cta-open-library"]')
        .should("be.visible")
        .and("have.attr", "href", "/leituras");

      cy.get('[data-cy="cta-contact-dev"]').should("be.visible");
    });
  });

  describe("@navigation @apoiar - Cenário: Botão voltar na tela /apoiar", () => {
    it("deve navegar para /apoiar e conter botão 'Voltar' apontando para '/'", () => {
      cy.visit("/apoiar");
      cy.contains("a", "Voltar")
        .should("be.visible")
        .and("have.attr", "href", "/");
    });
  });

  describe("@seo @performance @lighthouse - Cenário: Conformidade com SEO Técnico e Metadados Schema.org JSON-LD", () => {
    it("deve validar a presença de title, meta description, OpenGraph e Twitter Cards", () => {
      cy.title().should("include", "VivaVoz");
      cy.get('meta[name="description"]')
        .should("have.attr", "content")
        .and("include", "Transforme PDFs");

      cy.get('meta[property="og:title"]').should("exist");
      cy.get('meta[property="og:description"]').should("exist");
      cy.get('meta[name="twitter:card"]').should("have.attr", "content", "summary_large_image");
    });

    it("deve validar o script application/ld+json com os esquemas SoftwareApplication, Organization e WebPage", () => {
      cy.get('script[type="application/ld+json"]').then(($script) => {
        const json = JSON.parse($script.text());
        expect(json["@context"]).to.eq("https://schema.org");

        const types = json["@graph"].map((item: any) => item["@type"]);
        expect(types).to.include("SoftwareApplication");
        expect(types).to.include("Organization");
        expect(types).to.include("WebPage");

        const software = json["@graph"].find((i: any) => i["@type"] === "SoftwareApplication");
        expect(software.name).to.eq("VivaVoz");
        expect(software.applicationCategory).to.eq("MultimediaApplication");
        expect(software.operatingSystem).to.eq("Any / Web PWA");

        const org = json["@graph"].find((i: any) => i["@type"] === "Organization");
        expect(org.name).to.eq("VivaVoz Open Source");
        expect(org.url).to.eq("https://www.viva-voz.com");

        const webpage = json["@graph"].find((i: any) => i["@type"] === "WebPage");
        expect(webpage.inLanguage).to.eq("pt-BR");
      });
    });

    it("deve possuir integridade semântica da árvore de acessibilidade com landmarks e botões rotulados", () => {
      cy.get("header[role='banner']").should("exist").and("be.visible");
      cy.get("main#main-content").should("exist").and("be.visible");
      cy.get("footer[role='contentinfo']").should("exist").and("be.visible");

      cy.get("button").each(($btn) => {
        const hasText = $btn.text().trim().length > 0;
        const hasAriaLabel = Boolean($btn.attr("aria-label")?.trim());
        const hasTitle = Boolean($btn.attr("title")?.trim());
        expect(hasText || hasAriaLabel || hasTitle).to.be.true;
      });
    });
  });

  describe("@agentic @llms @webmcp - Cenário: Descoberta e consumo por Agentes de IA via llms.txt e atributos WebMCP", () => {
    it("deve responder /llms.txt com status 200, markdown e cabeçalho H1", () => {
      cy.request("/llms.txt").then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.match(/^#\s+[A-Za-z0-9]/m);
        expect(response.body).to.include("/leitor");
        expect(response.body).to.include("/leituras");
        expect(response.body).to.include("contactDeveloper");
      });
    });
  });

  describe("@mobile @responsividade - Cenário: Responsividade mobile a partir de 370px de largura de tela", () => {
    it("deve renderizar perfeitamente no viewport de 370px sem scroll horizontal e abrir menu mobile", () => {
      cy.viewport(370, 750);
      cy.visit("/");
      cy.get('header[data-hydrated="true"]').should("exist");

      // Verifica que não há overflow horizontal
      cy.window().then((win) => {
        const scrollWidth = win.document.documentElement.scrollWidth;
        const clientWidth = win.document.documentElement.clientWidth;
        expect(scrollWidth).to.be.at.most(clientWidth + 2); // tolerância sub-pixel
      });

      // Valida menu drawer mobile acessível
      cy.get('[data-cy="mobile-drawer-trigger"]').should("be.visible").click({ force: true });
      cy.get('[data-cy="mobile-drawer-content"]').should("be.visible").and("contain.text", "VivaVoz Menu");
      cy.get('[data-cy="mobile-drawer-content"]').should("contain.text", "Leitor de Documentos");
    });
  });
});
