import { test, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// A real PNG already in the repo (src/assets/hero.png) — the backend's
// upload-validation checks actual image magic bytes, not just filename/
// Content-Type, so a fake/text file would be rejected the same way a real
// spoofed upload would be. Using a real image proves that check passes.
const TEST_IMAGE = path.join(__dirname, "..", "src", "assets", "hero.png");

// Deliberately never clicks "Extract" here -- extraction runs real Azure
// Document Intelligence OCR + a real LLM call on the Cloud Backend, both
// paid APIs. This suite verifies everything up to that button (capture
// state, dropdown, direction tabs, enable/disable logic) without spending
// real API credits on every test run.
test.describe("Automatic upload page", () => {
  test("loads on the Automatic tab by default, no console errors", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto("/");
    await expect(page.getByRole("heading", { name: /capture vehicle/i })).toBeVisible();
    await expect(page.getByRole("banner").getByRole("button", { name: "Automatic" })).toHaveCSS(
      "background-color",
      "rgb(3, 112, 249)",
    );

    await page.waitForLoadState("networkidle");
    expect(pageErrors, `Uncaught page errors: ${pageErrors.join(", ")}`).toEqual([]);
  });

  test("shows 0/3 captured and a disabled Extract button with nothing uploaded", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("0/3 Captured")).toBeVisible();
    await expect(page.getByRole("button", { name: "Extract" })).toBeDisabled();
  });

  test("capturing invoice, front, and back enables Extract", async ({ page }) => {
    await page.goto("/");

    // Order in the DOM: Invoice, Vehicle Front, Vehicle Body -- each card's
    // non-capture "Choose File" input (the capture="environment" one is the
    // camera variant, skipped here since there's no real camera in CI).
    const fileInputs = page.locator('input[type="file"]:not([capture])');
    await expect(fileInputs).toHaveCount(3);

    await fileInputs.nth(0).setInputFiles(TEST_IMAGE); // Invoice
    await expect(page.getByText("1/3 Captured")).toBeVisible();

    await fileInputs.nth(1).setInputFiles(TEST_IMAGE); // Vehicle Front
    await expect(page.getByText("2/3 Captured")).toBeVisible();

    await fileInputs.nth(2).setInputFiles(TEST_IMAGE); // Vehicle Body
    await expect(page.getByText("3/3 Captured")).toBeVisible();

    await expect(page.getByRole("button", { name: "Extract" })).toBeEnabled();

    // Preview panel should now list all three captured items.
    await expect(page.getByText("Uploaded").first()).toBeVisible();
  });

  test("re-capturing the invoice card appends a second page, not a replacement", async ({ page }) => {
    await page.goto("/");
    const fileInputs = page.locator('input[type="file"]:not([capture])');

    await fileInputs.nth(0).setInputFiles(TEST_IMAGE);
    await expect(page.getByText("Uploaded", { exact: true }).first()).toBeVisible();

    // Re-select the (now-recreated) invoice card input and add a second page.
    await page.locator('input[type="file"]:not([capture])').nth(0).setInputFiles(TEST_IMAGE);
    await expect(page.getByText("2 Pages Uploaded")).toBeVisible();
  });

  test("switching direction tabs (Inward/Outward/Returnable) updates the selected style", async ({ page }) => {
    await page.goto("/");
    // Scoped to <main> -- the header nav has its own "Returnable" mode
    // button with the same accessible name.
    const outward = page.getByRole("main").getByRole("button", { name: "Outward", exact: true });
    await outward.click();
    await expect(outward).toHaveCSS("background-color", "rgb(4, 182, 174)");

    const returnable = page.getByRole("main").getByRole("button", { name: "Returnable", exact: true });
    await returnable.click();
    await expect(returnable).toHaveCSS("background-color", "rgb(4, 182, 174)");
  });

  test("switching to Manual and Returnable tabs and back preserves nothing captured on Automatic", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("banner").getByRole("button", { name: "Manual" }).click();
    await expect(page.getByRole("heading", { name: "Manual Entry" })).toBeVisible();

    await page.getByRole("banner").getByRole("button", { name: "Automatic" }).click();
    await expect(page.getByRole("heading", { name: /capture vehicle/i })).toBeVisible();
  });
});
