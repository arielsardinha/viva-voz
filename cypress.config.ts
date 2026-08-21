import { defineConfig } from "cypress";
import { lighthouse, prepareAudit } from "@cypress-audit/lighthouse";

export default defineConfig({
  allowCypressEnv: false,

  e2e: {
    baseUrl: "http://localhost:3000",
    viewportWidth: 1280,
    viewportHeight: 800,
    video: false,
    setupNodeEvents(on, config) {
      on("before:browser:launch", (_browser, launchOptions) => {
        prepareAudit(launchOptions);
      });

      on("task", {
        lighthouse: lighthouse(),
      });
    },
  },
});

