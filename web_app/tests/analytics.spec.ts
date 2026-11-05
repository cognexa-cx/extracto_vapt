import { test, expect } from "@playwright/test";
import { collectPageErrors } from "./helpers";

test.describe("Analytics page", () => {
  test("loads with no console errors and renders KPI cards", async ({ page }) => {
    const pageErrors = await collectPageErrors(page);
    await page.goto("/reports-analysis/analytics");
    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();

    // KPI grid: 6 StatCards (Total Records, Approval Rate, Today's Records,
    // Master Data Records, Active Users, Audit Events).
    const kpiGrid = page.locator(".grid.grid-cols-2.gap-3.sm\\:grid-cols-3.lg\\:grid-cols-6");
    await expect(kpiGrid).toBeVisible({ timeout: 15000 });
    await expect(kpiGrid.locator("> *")).toHaveCount(6);

    await page.waitForLoadState("networkidle");
    expect(pageErrors, `Uncaught page errors: ${pageErrors.join(", ")}`).toEqual([]);
  });

  test("does not get stuck loading and shows no System Error", async ({ page }) => {
    await page.goto("/reports-analysis/analytics");
    await expect(page.locator(".animate-spin.text-teal-600")).toBeHidden({ timeout: 15000 });
    await expect(page.getByText(/failed to load analytics/i)).toHaveCount(0);
  });

  test("date preset filter reloads without erroring", async ({ page }) => {
    await page.goto("/reports-analysis/analytics");
    await expect(page.locator(".animate-spin.text-teal-600")).toBeHidden({ timeout: 15000 });

    const presetSelect = page.locator("select").first();
    const optionCount = await presetSelect.locator("option").count();
    expect(optionCount).toBeGreaterThan(1);

    // Pick the second option (first non-"All Time" preset) and confirm the
    // page re-renders cleanly rather than erroring out.
    const secondValue = await presetSelect.locator("option").nth(1).getAttribute("value");
    await presetSelect.selectOption(secondValue);
    await expect(page.locator(".animate-spin.text-teal-600")).toBeHidden({ timeout: 15000 });
    await expect(page.getByText(/failed to load analytics/i)).toHaveCount(0);
  });
});
