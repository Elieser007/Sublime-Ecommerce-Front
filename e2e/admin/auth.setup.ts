/**
 * Admin E2E auth setup — logs in ONCE with the seeded admin credentials and
 * persists the session to storageState for every admin flow (design D7).
 *
 * Runbook (documented in playwright.config.ts):
 * 1. Back repo: `npm run seed:e2e` (deterministic fixed-ID seed, task 2.2).
 * 2. Playwright starts the backend itself via the webServer entry with
 *    `--var RATE_LIMIT_DISABLED:true --var ENVIRONMENT:test` (rate-limit
 *    bypass, P4) and `reuseExistingServer: false`, so a manually running
 *    backend on :8787 must be stopped first.
 * 3. This setup runs once per suite; every admin flow project depends on it
 *    and reuses `e2e/admin/.auth/admin.json` — credentials are never
 *    re-submitted (spec: Single login via storageState).
 */
import { test as setup, expect } from "@playwright/test";
import { ADMIN_CREDENTIALS, BACKEND_URL, loginAsAdmin } from "./helpers";

export const ADMIN_STORAGE_STATE = "e2e/admin/.auth/admin.json";

setup("admin login persists storageState", async ({ page }) => {
  await loginAsAdmin(page);

  // Prove the persisted session works against the real backend: /api/me must
  // resolve the admin role — a redirect or a client role means the seed or
  // the credentials are wrong and every admin flow would fail later.
  const me = await page.request.get(`${BACKEND_URL}/api/me`);
  expect(me.status()).toBe(200);
  const body = (await me.json()) as { user?: { role?: string } };
  expect(body.user?.role).toBe("admin");

  await page.context().storageState({ path: ADMIN_STORAGE_STATE });
});
