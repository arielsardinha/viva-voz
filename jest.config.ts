import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./",
});

// Add any custom config to be passed to Jest
const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  testTimeout: 10000,
  forceExit: true,
  // Add more setup options before each test is run
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  // `.claude/worktrees/` guarda worktrees git de outras sessões (cópias do repo):
  // sem isso o Jest roda os testes delas junto com os deste checkout.
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/cypress/",
    "<rootDir>/.claude/",
  ],
  modulePathIgnorePatterns: ["<rootDir>/.claude/"],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config);
