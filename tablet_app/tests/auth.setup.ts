import { test as setup, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const AUTH_FILE = path.join(__dirname, ".auth", "test-account.json");

// Same pattern as Extracto-Web's auth.setup.ts: log in exactly once
// (regardless of worker count) and save the resulting localStorage session
// to disk, reused by every other spec via playwright.config.ts's
// storageState. Login is rate-limited (5/minute on the backend), and every
// spec logging in independently under parallel workers would blow past
// that immediately -- Tab specs run with multiple workers (see
// playwright.config.ts), so this matters here just as much as on Web.
setup("authenticate", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("name@company.com").fill("test-user@example.com");
  await page.getByPlaceholder("XXX XXX").fill("<REDACTED_TEST_PASSWORD>");
  await page.getByRole("button", { name: "Proceed" }).click();
  await expect(page.getByText("Capture Vehicle")).toBeVisible({ timeout: 10000 });
  await page.context().storageState({ path: AUTH_FILE });
});
