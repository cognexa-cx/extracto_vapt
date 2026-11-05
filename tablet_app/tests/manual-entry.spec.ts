import { test, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_IMAGE = path.join(__dirname, "..", "src", "assets", "hero.png");

const CLOUD_API_URL = "http://localhost:8001";
const DEVICE_API_KEY = "<REDACTED_DEVICE_KEY>";

async function goToManual(page) {
  await page.goto("/");
  await page.getByRole("banner").getByRole("button", { name: "Manual" }).click();
  await expect(page.getByRole("heading", { name: "Manual Entry" })).toBeVisible();
}

test.describe("Manual entry page", () => {
  test("loads with no console errors and shows the empty form + no-images state", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await goToManual(page);
    await expect(page.getByPlaceholder("Key 1")).toBeVisible();
    await expect(page.getByText("No images added yet.")).toBeVisible();

    await page.waitForLoadState("networkidle");
    expect(pageErrors, `Uncaught page errors: ${pageErrors.join(", ")}`).toEqual([]);
  });

  test("adding and removing key/value fields works, with a confirm step for removal", async ({ page }) => {
    await goToManual(page);

    // Form starts with 5 blank rows (EMPTY_FIELDS in VehicleUploadPage.tsx)
    // -- placeholders are "Key N" by array index, not by a stable field id,
    // so removing a middle row re-labels every row after it. A unique typed
    // value (rather than the placeholder text) is what actually identifies
    // "the row this test removed" after that reflow.
    const rowsBefore = await page.locator('button[aria-label="Remove field"]').count();
    expect(rowsBefore).toBe(5);

    await page.getByLabel("Add key value field").click();
    await expect(page.locator('button[aria-label="Remove field"]')).toHaveCount(6);

    // Target the 2nd row's remove button by position -- its own placeholder
    // text isn't a stable identifier for it (removing any row before it
    // re-labels every subsequent "Key N"/"Value N" by array index), but
    // "the remove button at this position" and "the total row count" are.
    const removeButton = page.locator('button[aria-label="Remove field"]').nth(1);

    // Removing asks for confirmation first -- clicking X alone must not
    // remove the row immediately.
    await removeButton.click();
    await expect(page.getByText("Remove this field?")).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.locator('button[aria-label="Remove field"]')).toHaveCount(6); // still there

    await removeButton.click();
    await page.getByRole("button", { name: "Remove", exact: true }).click();
    await expect(page.locator('button[aria-label="Remove field"]')).toHaveCount(5);
  });

  test("adding an image shows it in the thumbnail grid and opens the preview modal", async ({ page }) => {
    await goToManual(page);

    const fileInput = page.locator('input[type="file"]:not([capture])');
    await fileInput.setInputFiles(TEST_IMAGE);
    await expect(page.getByText("No images added yet.")).toHaveCount(0);

    const thumbnail = page.locator('button:has(img[alt="hero.png"])').first();
    await expect(thumbnail).toBeVisible();
    await thumbnail.click();
    // PreviewModal opens on top of the thumbnail grid.
    await expect(page.locator(".fixed.inset-0").last()).toBeVisible();
  });

  test("reject discards the entry and resets the form", async ({ page }) => {
    await goToManual(page);
    await page.getByPlaceholder("Key 1").fill("Test Key");
    await page.getByPlaceholder("Value 1").fill("Test Value");

    await page.getByRole("button", { name: "Reject" }).click();
    const confirmModal = page.locator(".fixed.inset-0.z-50");
    await expect(confirmModal.getByText("Reject and discard this entry?")).toBeVisible();
    await confirmModal.getByRole("button", { name: "Reject", exact: true }).click();

    await expect(page.getByText("Rejected successfully!")).toBeVisible({ timeout: 10000 });
    // Form resets back to a single empty field.
    await expect(page.getByPlaceholder("Key 1")).toHaveValue("");
  });

  test("approve saves a real record via the live API, then cleans it up", async ({ page, request }) => {
    await goToManual(page);
    await page.getByPlaceholder("Key 1").fill("Playwright Test Field");
    await page.getByPlaceholder("Value 1").fill("Playwright Test Value");

    const responsePromise = page.waitForResponse(
      (res) => res.url().includes("/manual/approve") && res.request().method() === "POST",
    );

    await page.getByRole("button", { name: "Approve" }).click();
    const confirmModal = page.locator(".fixed.inset-0.z-50");
    await expect(confirmModal.getByText("Approve and save this entry?")).toBeVisible();
    await confirmModal.getByRole("button", { name: "Approve", exact: true }).click();

    const response = await responsePromise;
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.extraction_id).toBeTruthy();

    await expect(page.getByText("Approved & saved successfully!")).toBeVisible({ timeout: 10000 });

    // Clean up the real record this test just created -- same pattern as
    // every other suite in this project: verify against the live API, then
    // remove what the test itself added, never leave test data behind.
    const del = await request.delete(`${CLOUD_API_URL}/manual/history/${body.extraction_id}`, {
      headers: { "X-Device-Key": DEVICE_API_KEY },
    });
    expect(del.ok()).toBe(true);
  });
});
