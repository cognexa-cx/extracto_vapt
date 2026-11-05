import { test, expect } from "@playwright/test";
import { collectPageErrors } from "./helpers";

test.describe("RBAC Master page", () => {
  test("loads with no console errors and shows role tabs + matrix", async ({ page }) => {
    const pageErrors = await collectPageErrors(page);
    await page.goto("/user-management/rbac-master");
    await expect(page.getByRole("heading", { name: "RBAC Master" })).toBeVisible();

    const roleTabs = page.locator(".flex.items-center.gap-2.mb-4.flex-wrap button");
    await expect(roleTabs.first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("table")).toBeVisible();

    await page.waitForLoadState("networkidle");
    expect(pageErrors, `Uncaught page errors: ${pageErrors.join(", ")}`).toEqual([]);
  });

  test("Admin role's checkboxes are disabled (cannot self-lock-out the Admin role)", async ({ page }) => {
    await page.goto("/user-management/rbac-master");
    await expect(page.locator("table")).toBeVisible({ timeout: 10000 });

    const adminTab = page.getByRole("button", { name: "Admin", exact: true });
    await adminTab.click();
    const firstCheckbox = page.locator('input[type="checkbox"]').first();
    await expect(firstCheckbox).toBeDisabled();
    // No Save/Discard bar for the Admin role.
    await expect(page.getByRole("button", { name: "Save" })).toHaveCount(0);
  });

  test("toggling a non-Admin role's permission enables Save, and Discard reverts it", async ({ page }) => {
    await page.goto("/user-management/rbac-master");
    await expect(page.locator("table")).toBeVisible({ timeout: 10000 });

    const roleTabs = page.locator(".flex.items-center.gap-2.mb-4.flex-wrap button");
    const tabCount = await roleTabs.count();
    // Find a non-Admin role tab (Admin is always present and always first
    // per auth/rbac.py's ROLES list, but don't assume position).
    let nonAdminTab = null;
    for (let i = 0; i < tabCount; i++) {
      const label = await roleTabs.nth(i).innerText();
      if (label !== "Admin") {
        nonAdminTab = roleTabs.nth(i);
        break;
      }
    }
    test.skip(!nonAdminTab, "Only the Admin role exists — nothing to toggle");
    await nonAdminTab.click();

    const saveButton = page.getByRole("button", { name: "Save" });
    const discardButton = page.getByRole("button", { name: "Discard" });
    await expect(saveButton).toBeDisabled();

    const firstCheckbox = page.locator('input[type="checkbox"]').first();
    await firstCheckbox.click();
    await expect(saveButton).toBeEnabled();

    await discardButton.click();
    await expect(saveButton).toBeDisabled();
  });
});
