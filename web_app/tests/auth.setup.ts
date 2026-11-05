import { test as setup, expect } from "@playwright/test";
import { TEST_EMAIL, TEST_PASSWORD } from "./helpers";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const AUTH_FILE = path.join(__dirname, ".auth", "test-account.json");

// Logs in exactly once (regardless of worker count) and saves the resulting
// localStorage session to disk. Every other spec reuses this via
// playwright.config.ts's storageState instead of hitting POST /login itself
// -- login is rate-limited to 5/minute per IP (routes/usermanagement.py),
// and every spec logging in independently under parallel workers blew past
// that immediately, landing every test back on /login.
setup("authenticate", async ({ page }) => {
  await page.goto("/login");
  // Login renders both the desktop (lg+) and stacked-mobile layouts in the
  // DOM at once, one hidden via a CSS breakpoint class -- so every field
  // and the Proceed button each have two real matches here regardless of
  // viewport. .first() picks whichever is actually visible at this
  // viewport width without needing to know which breakpoint is active.
  await page.getByPlaceholder("name@company.com").first().fill(TEST_EMAIL);
  await page.getByPlaceholder("XXX XXX").first().fill(TEST_PASSWORD);
  await page.getByRole("button", { name: /proceed/i }).first().click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  await page.context().storageState({ path: AUTH_FILE });
});
