// Dedicated Playwright test account (USR-003), created via the real
// /register API — not a real employee's login. Credentials come from .env
// (PLAYWRIGHT_TEST_EMAIL / PLAYWRIGHT_TEST_PASSWORD), never hardcoded here.
// Used only by auth.setup.ts, which logs in once and saves the session for
// every other spec to reuse via playwright.config.ts's storageState — see
// that file for why (POST /login is rate-limited to 5/minute per IP).
export const TEST_EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;
export const TEST_PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD;
if (!TEST_EMAIL || !TEST_PASSWORD) {
  throw new Error(
    "PLAYWRIGHT_TEST_EMAIL / PLAYWRIGHT_TEST_PASSWORD must be set in .env to run this suite.",
  );
}

export async function collectPageErrors(page) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}
