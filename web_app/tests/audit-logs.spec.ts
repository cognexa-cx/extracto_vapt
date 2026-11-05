import { test, expect } from "@playwright/test";
import { collectPageErrors } from "./helpers";

test.describe("Audit Logs page", () => {
  test("loads with no console errors and shows the table", async ({ page }) => {
    const pageErrors = await collectPageErrors(page);
    await page.goto("/reports-analysis/audit-logs");
    await expect(page.getByRole("heading", { name: "Audit Logs" })).toBeVisible();
    await expect(page.locator("table")).toBeVisible({ timeout: 15000 });

    await page.waitForLoadState("networkidle");
    expect(pageErrors, `Uncaught page errors: ${pageErrors.join(", ")}`).toEqual([]);
  });

  test("has at least one real log row (this suite's own login just created one)", async ({ page }) => {
    await page.goto("/reports-analysis/audit-logs");
    const firstRow = page.locator("table tbody tr").first();
    // td(0) is the row-selection checkbox cell added for bulk export —
    // td(1) (Timestamp) is the first real data cell.
    await expect(firstRow.locator("td").nth(1)).not.toBeEmpty({ timeout: 15000 });
  });

  test("search narrows results to the empty state for a nonsense query", async ({ page }) => {
    await page.goto("/reports-analysis/audit-logs");
    await expect(page.locator("table")).toBeVisible({ timeout: 15000 });

    await page.getByPlaceholder(/search description/i).fill("zzz_no_such_entry_zzz");
    await expect(page.getByText("No audit log entries found")).toBeVisible({ timeout: 10000 });
  });

  test("clicking a row's view icon opens the audit log detail modal", async ({ page }) => {
    await page.goto("/reports-analysis/audit-logs");
    const firstRow = page.locator("table tbody tr").first();
    // td(0) is the row-selection checkbox cell added for bulk export —
    // td(1) (Timestamp) is the first real data cell.
    await expect(firstRow.locator("td").nth(1)).not.toBeEmpty({ timeout: 15000 });

    await firstRow.getByTitle("View Detail").click();
    await expect(page.locator('button:has(svg.lucide-x)').first()).toBeVisible({ timeout: 10000 });
  });
});
