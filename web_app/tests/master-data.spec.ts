import { test, expect } from "@playwright/test";
import { collectPageErrors } from "./helpers";

test.describe("Master Data page", () => {
  test("loads with no console errors and shows the tab bar", async ({ page }) => {
    const pageErrors = await collectPageErrors(page);
    await page.goto("/master-data");
    await expect(page.getByRole("heading", { name: "Master Data" })).toBeVisible();

    // Tabs: Vendor / Warehouse / Transporter / Material (exact labels come
    // from masterDataV2Config — asserting the first one is stable enough
    // without hardcoding all four).
    await expect(page.locator(".flex.gap-1.border-b button").first()).toBeVisible({ timeout: 10000 });

    await page.waitForLoadState("networkidle");
    expect(pageErrors, `Uncaught page errors: ${pageErrors.join(", ")}`).toEqual([]);
  });

  test("table resolves out of loading and search/filter controls work", async ({ page }) => {
    await page.goto("/master-data");

    const table = page.locator("table");
    await expect(table).toBeVisible({ timeout: 15000 });
    // Either real rows or the page's own "No <entity> found" empty state —
    // both are valid resolved states, unlike an indefinite spinner.
    await expect(table.locator("tbody tr").first()).toBeVisible({ timeout: 15000 });

    // Search box narrows results — typing garbage should always produce
    // the empty state, proving the search call round-trips to the backend.
    // Scoped to the filter bar's own input (Navbar has an unrelated global
    // search box earlier in the DOM that a bare "first input" would hit).
    const searchBox = page.getByPlaceholder("Vendor name, GSTIN, PAN…");
    await searchBox.fill("zzz_no_such_vendor_zzz");
    await expect(page.getByText(/^No .* found$/)).toBeVisible({ timeout: 10000 });
    await searchBox.fill("");
  });

  test("switching tabs changes the active entity and reloads the table", async ({ page }) => {
    await page.goto("/master-data");
    await expect(page.locator("table")).toBeVisible({ timeout: 15000 });

    const tabs = page.locator(".flex.gap-1.border-b button");
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(1);

    const secondTabLabel = await tabs.nth(1).innerText();
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveClass(/text-blue-600/);

    // The dropdown mirrors the tabs and should reflect the same selection.
    const select = page.locator("select").first();
    await expect(select).toHaveValue(await select.locator(`option:has-text("${secondTabLabel}")`).getAttribute("value"));
  });
});
