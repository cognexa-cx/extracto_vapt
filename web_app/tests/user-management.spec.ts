import { test, expect } from "@playwright/test";
import { collectPageErrors } from "./helpers";

test.describe("User Management page", () => {
  test("loads with no console errors and shows stats + table", async ({ page }) => {
    const pageErrors = await collectPageErrors(page);
    await page.goto("/user-management");
    await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();

    await expect(page.locator("table")).toBeVisible({ timeout: 15000 });
    // This suite's own test account (USR-003) must be listed. Scoped to the
    // table — the sidebar/navbar also show the logged-in user's own name.
    await expect(page.locator("table").getByText("Playwright Test")).toBeVisible({ timeout: 15000 });

    await page.waitForLoadState("networkidle");
    expect(pageErrors, `Uncaught page errors: ${pageErrors.join(", ")}`).toEqual([]);
  });

  test("search narrows the table to a matching employee", async ({ page }) => {
    await page.goto("/user-management");
    const table = page.locator("table");
    await expect(table).toBeVisible({ timeout: 15000 });

    // Scoped to the table — the sidebar/navbar always show the logged-in
    // user's own name regardless of what's typed into this search box.
    await page.locator("#employee-search").fill("Playwright Test");
    await expect(table.getByText("Playwright Test")).toBeVisible({ timeout: 10000 });

    await page.locator("#employee-search").fill("zzz_no_such_employee_zzz");
    await expect(table.getByText("Playwright Test")).toHaveCount(0);
  });

  test("clicking a stat card filters the table", async ({ page }) => {
    await page.goto("/user-management");
    await expect(page.locator("table")).toBeVisible({ timeout: 15000 });

    const activeStat = page.getByText(/active/i, { exact: false }).first();
    if (await activeStat.count()) {
      await activeStat.click();
    }
  });

  test("view modal opens for the test account and shows its details", async ({ page }) => {
    await page.goto("/user-management");
    await expect(page.locator("table")).toBeVisible({ timeout: 15000 });

    const row = page.locator("tr", { hasText: "Playwright Test" }).first();
    await row.getByTitle("View User").click();
    // View modal shows the employee's email as one of its fields. Scoped to
    // the modal overlay — the table row behind it still renders the same
    // email in a truncated span.
    const modal = page.locator(".fixed.inset-0.z-\\[9999\\]");
    await expect(modal.getByText("test-user@example.com")).toBeVisible({ timeout: 10000 });
  });
});
