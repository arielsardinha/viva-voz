describe("Google Drive Backup & Sincronização em Nuvem", () => {
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
    cy.contains("Pasta Oculta e Isolada").should("be.visible");
  });

  it("deve exibir status conectado e permitir realizar backup com feedback", () => {
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

    // Recarrega para capturar o mock de status conectado
    cy.reload();
    cy.get('header[data-hydrated="true"]').should("exist");

    cy.get('[data-cy="google-drive-sync-btn"]').should("be.visible").click();
    cy.get('[data-webmcp-tool="googleDriveSync"]').should("be.visible");

    cy.contains("Conectado").should("be.visible");
    cy.contains("usuario.leitor@gmail.com").should("be.visible");

    // Clica no botão de Fazer Backup
    cy.contains("button", "Fazer Backup").should("be.visible").click();
    cy.wait("@postBackup");

    // Notificação de sucesso deve surgir
    cy.contains("Backup no Google Drive concluído com sucesso!").should("be.visible");
  });

  it("deve ser responsivo em tela compacta de 370px de largura sem overflow", () => {
    cy.viewport(370, 700);

    cy.intercept("GET", "/api/auth/google/status", {
      statusCode: 200,
      body: { isConnected: false },
    });

    cy.get('[data-cy="google-drive-sync-btn"]').should("be.visible").click();
    cy.get('[data-webmcp-tool="googleDriveSync"]').should("be.visible");
    cy.contains("Conectar com Google").should("be.visible");

    // Garante que o modal caiba na viewport
    cy.get('[data-webmcp-tool="googleDriveSync"]').then(($modal) => {
      expect($modal.width()).to.be.lte(370);
    });
  });
});
