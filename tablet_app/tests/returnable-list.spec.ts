import { test, expect } from "@playwright/test";

async function goToReturnable(page) {
  await page.goto("/");
  // Scoped to the header — the upload page's own direction selector
  // (inward/outward/returnable) has a same-named button too.
  await page.getByRole("banner").getByRole("button", { name: "Returnable" }).click();
}

test.describe("Returnable Items list", () => {
  test("loads and replaces the loading skeleton with real content", async ({ page }) => {
    await goToReturnable(page);

    await expect(page.getByRole("heading", { name: "Returnable Items" })).toBeVisible();

    // The skeleton uses animate-pulse placeholder rows — they must be gone
    // once loading finishes, whether the result is a populated list or the
    // empty state (both are legitimate end states; only "stuck loading" is not).
    const skeletonRows = page.locator(".divide-y.divide-slate-100 .animate-pulse");
    await expect(skeletonRows).toHaveCount(0, { timeout: 15000 });

    const emptyState = page.getByText("No returnable items found");
    const firstRow = page.locator(".divide-y.divide-slate-100 > div").first();
    await expect(emptyState.or(firstRow)).toBeVisible();
  });

  test("search box filters the list without erroring", async ({ page }) => {
    await goToReturnable(page);
    await expect(page.locator(".animate-pulse")).toHaveCount(0, { timeout: 15000 });

    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.getByPlaceholder(/search vehicle, vendor, site/i).fill("zzznonexistentzzz");
    await expect(page.getByText("No returnable items found")).toBeVisible();

    await page.getByPlaceholder(/search vehicle, vendor, site/i).fill("");
    expect(pageErrors).toEqual([]);
  });

  test("status filter tabs (all/active/returned) switch without erroring", async ({ page }) => {
    await goToReturnable(page);
    await expect(page.locator(".animate-pulse")).toHaveCount(0, { timeout: 15000 });

    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    // The button text is lowercase in the DOM ("active"/"returned"/"all") —
    // the visual capitalization comes from a CSS `capitalize` class, which
    // doesn't change the accessible name Playwright matches against.
    for (const label of ["active", "returned", "all"]) {
      await page.getByRole("button", { name: label, exact: true }).click();
    }
    expect(pageErrors).toEqual([]);
  });

  test("clicking a row opens the detail modal", async ({ page }) => {
    await goToReturnable(page);
    await expect(page.locator(".animate-pulse")).toHaveCount(0, { timeout: 15000 });

    const firstRow = page.locator(".divide-y.divide-slate-100 > div").first();
    if (!(await firstRow.isVisible().catch(() => false))) {
      test.skip(true, "No returnable records available to open");
    }

    await firstRow.click();
    await expect(page.locator(".fixed.inset-0.z-\\[9998\\]")).toBeVisible();
  });
});
