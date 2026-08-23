describe("Google Drive Backup & Sincronização em Nuvem", () => {
  beforeEach(() => {
    cy.visit("/leitor", {
      onBeforeLoad(win) {
        win.sessionStorage.clear();
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

  it("deve exibir o botão de sincronização no cabeçalho e abrir o modal de backup", () => {
    cy.intercept("GET", "/api/auth/google/status", {
      statusCode: 200,
      body: {
        isConnected: false,
      },
    }).as("getAuthStatusDisconnected");

    cy.get('[data-cy="google-drive-sync-btn"]').should("be.visible").click();

    // Modal deve abrir com título e anotação WebMCP
    cy.get('[data-webmcp-tool="googleDriveSync"]').should("be.visible");
    cy.contains("Backup no Google Drive").should("be.visible");
    cy.contains("Conectar com Google").should("be.visible");
    cy.contains("Vantagens do Backup no Google Drive").should("be.visible");
    cy.contains("Armazenamento Ilimitado em Nuvem:").should("be.visible");
    cy.contains("Pasta Oculta & 100% Segura:").should("be.visible");
  });

  it("não deve exibir o botão na tela de leitura quando conectado, mas deve exibir na Biblioteca e permitir backup", () => {
    cy.intercept("GET", "/api/auth/google/status", {
      statusCode: 200,
      body: {
        isConnected: true,
        email: "usuario.leitor@gmail.com",
        lastSyncTimestamp: 1700000000000,
      },
    }).as("getAuthStatusConnected");

    cy.intercept("POST", "/api/sync/backup", {
      statusCode: 200,
      body: {
        success: true,
        file: { id: "drive_file_123", name: "vivavoz_manifest.json" },
        timestamp: Date.now(),
      },
    }).as("postBackup");

    // Visita com a sessão do Google Drive conectada no sessionStorage
    cy.visit("/leitor", {
      onBeforeLoad(win) {
        win.sessionStorage.setItem(
          "vivavoz_gdrive_auth_status",
          JSON.stringify({
            isConnected: true,
            email: "usuario.leitor@gmail.com",
            lastSyncTimestamp: 1700000000000,
          })
        );
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


    // Na tela de leitura, com status conectado, o botão no cabeçalho NÃO deve existir
    cy.get('header [data-cy="google-drive-sync-btn"]').should("not.exist");

    // Navega até a Biblioteca
    cy.get('[data-cy="nav-link-library"]').click();
    cy.location("pathname").should("eq", "/leituras");

    // No cabeçalho da Biblioteca, com status conectado, o botão também NÃO deve existir (header consistente)
    cy.get('header [data-cy="google-drive-sync-btn"]').should("not.exist");

    // Na barra lateral da Biblioteca, o botão de sincronização está presente e acessível
    cy.get('aside [data-cy="google-drive-sync-btn"]').should("be.visible").click();
    cy.get('[data-webmcp-tool="googleDriveSync"]').should("be.visible");

    cy.contains("Conectado").should("be.visible");
    cy.contains("usuario.leitor@gmail.com").should("be.visible");

    // Clica no botão de Fazer Backup (Apenas Enviar)
    cy.get('[data-cy="backup-now-btn"]').should("be.visible").click();
    cy.wait("@postBackup");

    // Notificação ou status de sucesso deve surgir
    cy.contains(/concluído com sucesso/i).should("exist");
  });

  it("deve ser responsivo em tela compacta de 370px de largura sem overflow", () => {
    cy.viewport(370, 700);

    cy.intercept("GET", "/api/auth/google/status", {
      statusCode: 200,
      body: { isConnected: false },
    });

    cy.get('[data-cy="google-drive-sync-btn"]').first().should("be.visible").click();
    cy.get('[data-webmcp-tool="googleDriveSync"]').should("be.visible");
    cy.contains("Conectar com Google").should("be.visible");

    // Garante que o modal caiba na viewport
    cy.get('[data-webmcp-tool="googleDriveSync"]').then(($modal) => {
      expect($modal.width()).to.be.lte(370);
    });
  });

  it("deve renderizar o card de benefícios no modal de alerta de memória insuficiente", () => {
    cy.visit("/leitor", {
      onBeforeLoad(win) {
        win.sessionStorage.clear();
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
        if (win.navigator.storage) {
          cy.stub(win.navigator.storage, "estimate").resolves({
            quota: 10 * 1024 * 1024,
            usage: 9.99 * 1024 * 1024,
          });
        }
      },
    });
    cy.get('header[data-hydrated="true"]').should("exist");

    // Faz o upload de um arquivo de teste
    cy.get('input#pdf-upload-input').selectFile(
      {
        contents: Cypress.Buffer.from("Conteúdo para teste de leitura"),
        fileName: "artigo-teste.txt",
        mimeType: "text/plain",
      },
      { force: true }
    );

    // O modal de aviso de memória deve estar visível
    cy.get('[data-webmcp-tool="storageQuotaAlert"]').should("be.visible");
    cy.contains("Memória Interna Insuficiente").should("be.visible");
    cy.contains("Armazenamento Cheio").should("be.visible");
    cy.contains("Memória interna insuficiente no navegador").should("be.visible");
    cy.contains("Armazenamento Ilimitado em Nuvem:").should("be.visible");
    cy.get('[data-cy="connect-google-drive-quota-btn"]').should("be.visible");
  });
});
