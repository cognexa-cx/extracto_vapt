import { test, expect } from "@playwright/test";
import { collectPageErrors } from "./helpers";

// NOTE: this route has no live entry point in the current UI — the only
// button that used to link here (MasterDataFilters.tsx) isn't imported by
// MasterData.tsx anymore. Testing it directly by URL since the route
// itself is still registered in App.tsx and still works.
test.describe("Blocked Vendors page (direct URL — not currently linked from the UI)", () => {
  test("loads with no console errors and shows the stats card", async ({ page }) => {
    const pageErrors = await collectPageErrors(page);
    await page.goto("/blocked-vendors");
    await expect(page.getByRole("heading", { name: "Blacklist Vendor" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Total Blocked Vendors")).toBeVisible();

    await page.waitForLoadState("networkidle");
    expect(pageErrors, `Uncaught page errors: ${pageErrors.join(", ")}`).toEqual([]);
  });

  test("resolves out of loading to either a table or the empty state", async ({ page }) => {
    await page.goto("/blocked-vendors");
    await expect(page.locator(".animate-spin.text-teal-600").first()).toBeHidden({ timeout: 15000 });
    await expect(page.getByText(/System Error|failed/i)).toHaveCount(0);
  });
});
