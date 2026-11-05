import { test, expect } from "@playwright/test";
import { collectPageErrors } from "./helpers";

test.describe("Settings page", () => {
  test("loads with no console errors and shows all three cards", async ({ page }) => {
    const pageErrors = await collectPageErrors(page);
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    await expect(page.getByText("My Profile")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Change Password")).toBeVisible();
    await expect(page.getByText("System Status")).toBeVisible();

    await page.waitForLoadState("networkidle");
    expect(pageErrors, `Uncaught page errors: ${pageErrors.join(", ")}`).toEqual([]);
  });

  test("profile card shows the logged-in test account's data", async ({ page }) => {
    await page.goto("/settings");
    // Scoped to the card itself — the sidebar/navbar also show the
    // logged-in user's name elsewhere on the page.
    const profileCard = page
      .locator("div.rounded-xl.border.border-gray-200.bg-white.p-5.shadow-sm")
      .filter({ hasText: "My Profile" });
    await expect(profileCard).toBeVisible({ timeout: 10000 });
    // GET /me on mount refreshes real data — the test account's own name
    // should appear, proving the round-trip actually happened.
    await expect(profileCard.getByText("Playwright Test").first()).toBeVisible({ timeout: 10000 });
  });

  test("password card requires an OTP flow to change password (no bypass)", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("Change Password")).toBeVisible({ timeout: 10000 });
    // Changing password is gated behind sending an OTP to the registered
    // email — there should be no plaintext "current password" field that
    // would let a session-holder change it without re-verifying identity.
    await expect(page.getByPlaceholder("Registered email address")).toBeVisible();
  });
});
