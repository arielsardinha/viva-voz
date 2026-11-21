#!/usr/bin/env node
/**
 * Roteador do `npm test`.
 *
 * Por quê: o gate do `agf done` roda `npm test -- <testFiles da task>`. Uma task
 * só de E2E declara specs `cypress/e2e/*.cy.ts`, que o Jest ignora
 * (testPathIgnorePatterns), o que dava "No tests found" e travava o gate.
 *
 * Invariantes:
 * - Sem argumentos o comportamento é idêntico ao script anterior:
 *   `jest --forceExit --testTimeout=10000`.
 * - Flags e arquivos que não são `.cy.ts` vão para o Jest sem alteração.
 * - Arquivos `.cy.ts` vão para `cypress run --spec`. Se não houver servidor em
 *   http://localhost:3000 (baseUrl do cypress.config.ts), sobe `next start`
 *   (exige `npm run build` antes) e o encerra no final.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const JEST_BASE_ARGS = ["--forceExit", "--testTimeout=10000"];
const BASE_URL = "http://localhost:3000";
const SERVER_READY_TIMEOUT_MS = 60_000;

const isCypressSpec = (arg) => /\.cy\.[cm]?[jt]sx?$/.test(arg);

// Binários chamados direto pelo node (sem shell): os argumentos não passam por
// concatenação de shell (DEP0190) e o PID do filho é o próprio servidor.
const bin = (...segments) => path.join(process.cwd(), "node_modules", ...segments);
const JEST_BIN = bin("jest", "bin", "jest.js");
const CYPRESS_BIN = bin("cypress", "bin", "cypress");
const NEXT_BIN = bin("next", "dist", "bin", "next");

function run(cmd, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: "inherit", ...options });
    child.on("exit", (code) => resolve(code ?? 1));
    child.on("error", () => resolve(1));
  });
}

async function isServerUp() {
  try {
    const res = await fetch(BASE_URL, { method: "HEAD" });
    return res.status < 500;
  } catch {
    return false;
  }
}

async function waitForServer(deadline) {
  while (Date.now() < deadline) {
    if (await isServerUp()) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

/** Encerra a árvore do `next start`; aguarda para não sair antes do kill (process.exit). */
async function stopServer(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === "win32") {
    // /T encerra também os workers que o `next start` venha a criar.
    await run("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }
  child.kill("SIGTERM");
}

async function runCypress(specs) {
  let server = null;
  if (!(await isServerUp())) {
    if (!existsSync(path.join(process.cwd(), ".next", "BUILD_ID"))) {
      console.error(
        "[run-tests] Specs Cypress exigem o app em " +
          BASE_URL +
          ". Rode `npm run build` (ou suba `npm run dev`) e tente de novo.",
      );
      return 1;
    }
    server = spawn(process.execPath, [NEXT_BIN, "start", "-p", "3000"], {
      stdio: "ignore",
    });
    const ready = await waitForServer(Date.now() + SERVER_READY_TIMEOUT_MS);
    if (!ready) {
      await stopServer(server);
      console.error("[run-tests] `next start` não respondeu em 60s.");
      return 1;
    }
  }
  try {
    return await run(process.execPath, [CYPRESS_BIN, "run", "--spec", specs.join(",")]);
  } finally {
    await stopServer(server);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const cypressSpecs = args.filter(isCypressSpec);
  const jestArgs = args.filter((a) => !isCypressSpec(a));
  const jestFiles = jestArgs.filter((a) => !a.startsWith("-"));

  let exitCode = 0;
  // Sem specs Cypress, ou com arquivos Jest explícitos, o Jest roda como antes.
  if (cypressSpecs.length === 0 || jestFiles.length > 0) {
    exitCode = await run(process.execPath, [JEST_BIN, ...JEST_BASE_ARGS, ...jestArgs]);
  }
  if (cypressSpecs.length > 0) {
    const cyCode = await runCypress(cypressSpecs);
    exitCode = exitCode || cyCode;
  }
  process.exit(exitCode);
}

main();
