import { test, expect } from "@playwright/test";


// Waits for a row with real cell content, not just "tbody tr" visibility —
// that selector also matches the table's own loading-skeleton rows (blank
// pulsing placeholders), and checking "no .animate-pulse present" is prone
// to a false pass in the narrow window right after navigation, before the
// fetch's setLoading(true) has even fired yet (initial loading state is
// false). Asserting on non-empty cell text has no such ambiguous window —
// it can only pass once a genuine record has rendered.
async function firstRealRow(page) {
  const row = page.locator(".data-status-section table tbody tr").first();
  // td(0) is the row-selection checkbox cell added for bulk export —
  // td(1) (SR#) is the first real data cell.
  await expect(row.locator("td").nth(1)).not.toBeEmpty({ timeout: 15000 });
  return row;
}

test.describe("Dashboard page", () => {
  test("loads successfully at the correct URL", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.waitForLoadState("networkidle");
    expect(pageErrors, `Uncaught page errors: ${pageErrors.join(", ")}`).toEqual([]);
  });

  test("shows key dashboard sections and stat cards", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // The page-local "Dashboard" header/title was removed — the app now has
    // only one real page, so its search box lives in the Navbar instead (see
    // Navbar.jsx / AppContext's globalSearch). Confirm that's where it is.
    await expect(page.getByPlaceholder(/search site, vehicle, doc no/i)).toBeVisible();

    // Stat cards grid should render at least one card (not the skeleton state forever)
    const statsGrid = page.locator(".grid.grid-cols-2.md\\:grid-cols-3.lg\\:grid-cols-6");
    await expect(statsGrid).toBeVisible({ timeout: 15000 });
    await expect(statsGrid.locator("> *").first()).toBeVisible();

    // Data table container
    await expect(page.locator(".data-status-section")).toBeVisible({ timeout: 15000 });
  });

  test("dashboard content actually renders (not stuck loading / not empty)", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // The full-page loading spinner (shown while `loading` is true) must go away.
    const fullPageLoader = page.locator(".h-\\[60vh\\]");
    await expect(fullPageLoader).toBeHidden({ timeout: 15000 });

    // Skeleton stat cards (animate-pulse placeholders) must be replaced by real cards.
    // Scoped to the stats grid — the "Live Sync" status dot also uses animate-pulse
    // permanently and isn't a loading indicator.
    const statsGridForSkeleton = page.locator(".grid.grid-cols-2.md\\:grid-cols-3.lg\\:grid-cols-6");
    const skeletonCards = statsGridForSkeleton.locator(".animate-pulse");
    await expect(skeletonCards).toHaveCount(0, { timeout: 15000 });

    // System error panel must not be shown.
    await expect(page.getByText("System Error")).toHaveCount(0);

    // At least one real stat card with a numeric value should be visible, and stay visible
    // (auto-retrying assertion — catches the case where loading flips back to true after
    // content already rendered, e.g. from a second/duplicate fetch racing the first).
    const statsGrid = page.locator(".grid.grid-cols-2.md\\:grid-cols-3.lg\\:grid-cols-6");
    await expect(statsGrid.locator("> *").first()).toBeVisible({ timeout: 15000 });
    // Confirm it's still visible half a second later — not a one-frame flash before reverting to loading.
    await page.waitForTimeout(500);
    await expect(statsGrid.locator("> *").first()).toBeVisible();
    await expect(page.locator(".h-\\[60vh\\]")).toBeHidden();
  });

  test("switching Automatic/Manual tab after a stat-card filter shows records, not empty", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await expect(page.locator(".h-\\[60vh\\]")).toBeHidden({ timeout: 15000 });

    // Click the MANUAL stat card to filter the table down to manual entries.
    const manualCard = page
      .locator('div[title="Click to filter table"]')
      .filter({ hasText: "MANUAL" });
    await manualCard.click();
    await expect(page.getByText("Filter: Manual")).toBeVisible();

    // Now switch the table's own toggle to Automatic.
    await page
      .locator(".flex.items-center.gap-1.p-1.bg-white.border.border-slate-300.rounded-lg")
      .getByRole("button", { name: "Automatic" })
      .click();

    // Previously this showed "No records found" because the stat-card filter (manual-only)
    // and the tab (automatic-only) intersected to zero. The stat-card filter should now
    // be cleared automatically, and automatic records should be visible.
    await expect(page.getByText("No records found")).toHaveCount(0);
    await expect(page.getByText("Filter: Manual")).toHaveCount(0);
    const tableRows = page.locator(".data-status-section table tbody tr");
    await expect(tableRows.first()).toBeVisible({ timeout: 10000 });
  });

  test("clicking a row opens the view modal with record details", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await expect(page.locator(".h-\\[60vh\\]")).toBeHidden({ timeout: 15000 });

    const firstRow = await firstRealRow(page);
    // Click the SR# cell specifically (td(1) — td(0) is the row-selection
    // checkbox, which stops propagation) — the row's own onClick opens the
    // view modal, but a naive click on the <tr> lands wherever its center
    // happens to be, which can hit the STATUS pill or Action cell (both
    // also stop propagation to handle their own click instead).
    await firstRow.locator("td").nth(1).click();

    await expect(page.getByText("Record Details")).toBeVisible();
    // Modal fetches the single record by id — must resolve out of its own
    // loading state (this is the endpoint that still SAS-signs image URLs,
    // unlike the list view which now skips that).
    await expect(page.getByText("Loading...")).toBeHidden({ timeout: 10000 });

    // Close it back out.
    await page.locator('button:has(svg.lucide-x)').first().click();
    await expect(page.getByText("Record Details")).toBeHidden();
  });

  test("edit modal opens from the view modal and shows editable fields", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await expect(page.locator(".h-\\[60vh\\]")).toBeHidden({ timeout: 15000 });

    const firstRow = await firstRealRow(page);
    // Click the SR# cell specifically (td(1) — td(0) is the row-selection
    // checkbox, which stops propagation) — the row's own onClick opens the
    // view modal, but a naive click on the <tr> lands wherever its center
    // happens to be, which can hit the STATUS pill or Action cell (both
    // also stop propagation to handle their own click instead).
    await firstRow.locator("td").nth(1).click();
    await expect(page.getByText("Record Details")).toBeVisible();
    await expect(page.getByText("Loading...")).toBeHidden({ timeout: 10000 });

    await page.getByTitle("Edit record").click();
    // Edit modal replaces the view modal — its own heading/save affordance should appear.
    await expect(page.getByRole("button", { name: /save/i })).toBeVisible({ timeout: 10000 });
  });
});
