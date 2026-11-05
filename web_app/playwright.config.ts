import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Loads .env (VITE_* vars are ignored here, but PLAYWRIGHT_TEST_EMAIL /
// PLAYWRIGHT_TEST_PASSWORD used by tests/*.spec.ts come from this file).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.join(__dirname, ".env"));

const AUTH_FILE = path.join(__dirname, "tests", ".auth", "test-account.json");

export default defineConfig({
  testDir: "./tests",
  // Every spec hits the same real Cloud Backend / DB (no mocks, no test
  // isolation between workers) -- running several pages in parallel caused
  // real races (one test's Refresh spinner catching another's loading
  // state, one test's filter interfering with another reading the same
  // table). One worker trades speed for every run being deterministic.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: AUTH_FILE },
      dependencies: ["setup"],
    },
  ],
});
