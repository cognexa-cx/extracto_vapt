import { test, expect } from "@playwright/test";
import { collectPageErrors } from "./helpers";

test.describe("Reports page", () => {
  test("loads with no console errors and shows tabs + table", async ({ page }) => {
    const pageErrors = await collectPageErrors(page);
    await page.goto("/reports");
    await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
    await expect(page.locator("table")).toBeVisible({ timeout: 15000 });

    await page.waitForLoadState("networkidle");
    expect(pageErrors, `Uncaught page errors: ${pageErrors.join(", ")}`).toEqual([]);
  });

  test("switching Inward/Outward/Returnable/Manual tabs reloads the table", async ({ page }) => {
    await page.goto("/reports");
    await expect(page.locator("table")).toBeVisible({ timeout: 15000 });

    const tabs = page.locator(".flex.gap-1.border-b button");
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(1);

    for (let i = 0; i < tabCount; i++) {
      await tabs.nth(i).click();
      await expect(tabs.nth(i)).toHaveClass(/text-blue-600/);
      // Table settles to either real rows or the tab's own empty state —
      // never stuck on the loading spinner.
      await expect(page.locator(".animate-spin.text-teal-600")).toBeHidden({ timeout: 10000 });
    }
  });

  test("status filter (Approved/Rejected) narrows the table without erroring", async ({ page }) => {
    await page.goto("/reports");
    await expect(page.locator("table")).toBeVisible({ timeout: 15000 });

    const statusSelect = page.locator("select").nth(1); // [0]=tab dropdown, [1]=status
    await statusSelect.selectOption("Approve");
    await expect(page.locator(".animate-spin.text-teal-600")).toBeHidden({ timeout: 10000 });
    await expect(page.getByText("System Error")).toHaveCount(0);
  });

  test("clicking a row's view icon opens the report detail modal", async ({ page }) => {
    await page.goto("/reports");
    await expect(page.locator("table")).toBeVisible({ timeout: 15000 });

    const firstRow = page.locator("table tbody tr").first();
    // td(0) is the row-selection checkbox cell added for bulk export.
    await expect(firstRow.locator("td").nth(1)).not.toBeEmpty({ timeout: 15000 });

    await firstRow.getByTitle("View").click();
    // ReportDetailModal renders on top — its close affordance proves it opened.
    await expect(page.locator('button:has(svg.lucide-x)').first()).toBeVisible({ timeout: 10000 });
  });
});
