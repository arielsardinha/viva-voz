describe("Agent Accessibility & WebMCP Audits", () => {
  describe("1. Auditoria de llms.txt & llms-full.txt", () => {
    it("deve validar a integridade, cabeçalhos e formato markdown do /llms.txt", () => {
      cy.request("/llms.txt").then((response) => {
        expect(response.status).to.eq(200);
        expect(response.headers["content-type"]).to.satisfy((ct: string) =>
          ct.includes("text/plain") || ct.includes("text/markdown")
        );

        // Deve iniciar obrigatoriamente com cabeçalho H1 Markdown
        expect(response.body).to.match(/^#\s+[A-Za-z0-9]/m);

        // Deve conter blockquote descritivo
        expect(response.body).to.match(/^>\s+[A-Za-z0-9]/m);

        // Deve mapear as rotas principais em links Markdown
        expect(response.body).to.include("- [Leitor de Documentos](/)");
        expect(response.body).to.include("- [Biblioteca de Leituras](/leituras)");

        // Deve listar os endpoints e ferramentas WebMCP
        expect(response.body).to.include("/api/tts");
        expect(response.body).to.include("/api/ask");
        expect(response.body).to.include("uploadPdf");
        expect(response.body).to.include("configureGeminiApiKey");
        expect(response.body).to.include("ttsPlaybackControl");
        expect(response.body).to.include("askDocumentAI");
        expect(response.body).to.include("searchLibrary");
      });
    });

    it("deve validar a integridade da especificação completa em /llms-full.txt", () => {
      cy.request("/llms-full.txt").then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.match(/^#\s+[A-Za-z0-9]/m);
        expect(response.body).to.include("Esquemas das Ferramentas WebMCP");
        expect(response.body).to.include("uploadPdf");
        expect(response.body).to.include("configureGeminiApiKey");
      });
    });
  });

  describe("2. Auditoria Semântica e Landmarks da Accessibility Tree", () => {
    it("deve possuir landmarks semânticos válidos no Leitor Principal (/)", () => {
      cy.visit("/", {
        onBeforeLoad(win) {
          win.localStorage.setItem(
            "vivavoz-reader-settings",
            JSON.stringify({
              template: "modern",
              theme: "light",
              font: "inter",
              fontSize: 16,
              lineHeight: 1.8,
              hasCompletedOnboarding: true,
            })
          );
        },
      });
      cy.get('header[data-hydrated="true"]').should("exist");

      // Header com role banner
      cy.get("header[role='banner']").should("exist").and("be.visible");

      // Navegação com rótulo acessível
      cy.get("nav[aria-label='Navegação principal']").should("exist");
      cy.get("nav[aria-label='Navegação principal'] a[aria-current='page']").should(
        "contain.text",
        "Leitor"
      );

      // Elemento landmark principal <main>
      cy.get("main").should("exist").and("be.visible");

      // Todos os botões na página inicial devem possuir acessibilidade (texto ou aria-label)
      cy.get("button").each(($btn) => {
        const hasText = $btn.text().trim().length > 0;
        const hasAriaLabel = Boolean($btn.attr("aria-label")?.trim());
        const hasTitle = Boolean($btn.attr("title")?.trim());
        expect(hasText || hasAriaLabel || hasTitle).to.be.true;
      });
    });

    it("deve possuir landmarks semânticos válidos na Biblioteca (/leituras)", () => {
      cy.visit("/leituras", {
        onBeforeLoad(win) {
          win.localStorage.setItem(
            "vivavoz-reader-settings",
            JSON.stringify({
              template: "modern",
              theme: "light",
              font: "inter",
              fontSize: 16,
              lineHeight: 1.8,
              hasCompletedOnboarding: true,
            })
          );
        },
      });
      cy.get('header[data-hydrated="true"]').should("exist");

      cy.get("header[role='banner']").should("exist");
      cy.get("nav[aria-label='Navegação principal'] a[aria-current='page']").should(
        "contain.text",
        "Biblioteca"
      );
      cy.get("main").should("exist");
      cy.get("form[role='search']").should("exist");
    });
  });

  describe("3. Auditoria de Anotações WebMCP em Formulários e Ações Críticas", () => {
    beforeEach(() => {
      cy.visit("/", {
        onBeforeLoad(win) {
          win.localStorage.setItem(
            "vivavoz-reader-settings",
            JSON.stringify({
              template: "modern",
              theme: "light",
              font: "inter",
              fontSize: 16,
              lineHeight: 1.8,
              hasCompletedOnboarding: true,
            })
          );
        },
      });
      cy.get('header[data-hydrated="true"]').should("exist");
    });

    it("deve mapear a ferramenta de upload de PDF com atributos WebMCP (uploadDocument)", () => {
      cy.get("[data-webmcp-tool='uploadDocument']")
        .should("exist")
        .and("have.attr", "data-webmcp-action", "extract-sentences")
        .and("have.attr", "data-webmcp-schema", "multipart/form-data");

      cy.get("#pdf-upload-input")
        .should("exist")
        .and("have.attr", "type", "file")
        .and("have.attr", "name", "pdfFile")
        .and("have.attr", "aria-label");
    });

    it("deve conter ferramenta WebMCP para contribuição voluntária (supportProject)", () => {
      cy.get('[data-cy="support-project-btn"]').first().click();
      cy.get("[data-webmcp-tool='supportProject']")
        .should("exist")
        .within(() => {
          cy.get('input[aria-label="Chave Pix Aleatória"]').should(
            "have.value",
            "d1b12e3a-a8db-4164-a580-91b6a172e77a"
          );
        });
      cy.contains("Voltar ao início").click();
    });

    it("deve conter formulário WebMCP acessível para configuração da chave Gemini (configureGeminiApiKey)", () => {
      // Abre o diálogo da chave Gemini através do menu de opções
      cy.get("[data-cy='theme-dropdown-trigger']").first().click();
      cy.get("[data-cy='gemini-key-trigger']").should("be.visible").click();

      cy.get("form[data-webmcp-tool='configureGeminiApiKey']")
        .should("exist")
        .and("have.attr", "data-webmcp-action", "saveApiKey")
        .within(() => {
          cy.get("input#gemini-key-input")
            .should("exist")
            .and("have.attr", "name", "geminiApiKey")
            .and("have.attr", "type", "password")
            .and("have.attr", "aria-label");

          cy.get("button[type='submit']")
            .should("exist")
            .and("contain.text", "Salvar chave");
        });
    });

    it("deve conter ferramenta WebMCP para pesquisa na biblioteca (searchLibrary)", () => {
      cy.visit("/leituras", {
        onBeforeLoad(win) {
          win.localStorage.setItem(
            "vivavoz-reader-settings",
            JSON.stringify({
              template: "modern",
              theme: "light",
              font: "inter",
              fontSize: 16,
              lineHeight: 1.8,
              hasCompletedOnboarding: true,
            })
          );
        },
      });
      cy.get('header[data-hydrated="true"]').should("exist");

      cy.get("form[data-webmcp-tool='searchLibrary']")
        .should("exist")
        .and("have.attr", "data-webmcp-action", "filterReadings")
        .within(() => {
          cy.get("input#library-search-input")
            .should("exist")
            .and("have.attr", "name", "searchQuery")
            .and("have.attr", "aria-label");
        });
    });

    it("deve conter ferramenta WebMCP para configuração de preferências e tutorial (configureReaderPreferences)", () => {
      cy.get("[data-cy='theme-dropdown-trigger']").first().should("be.visible").click();
      cy.get("[data-cy='reopen-tutorial-item']").should("be.visible").click();

      cy.get("[data-webmcp-tool='configureReaderPreferences']")
        .should("exist")
        .and("have.attr", "data-webmcp-action", "saveSettings");
    });
  });
});

