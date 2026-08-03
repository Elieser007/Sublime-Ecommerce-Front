/**
 * Admin E2E — Deploy flow (tasks 2.10, design D9).
 *
 * EXACTLY ONE deploy case in the whole admin suite: the sidebar deploy
 * button is clicked once and the `POST /api/deploy` request is intercepted
 * with a Playwright `route` → fulfilled 200, so no real deployment is ever
 * triggered and the 3/min deploy rate limit is never touched. Asserts that
 * the request was actually sent (method + URL) and that the UI shows the
 * success feedback from the intercepted response.
 *
 * Serial + reseed: this file mutates no DB state (deploy is an external
 * action), so no reseedE2E() here — the shared state is read-only.
 */
import { test, expect } from "@playwright/test";
import { ADMIN_URLS } from "../helpers";

test.describe.configure({ mode: "serial" });

/** Intercepted success payload — never reaches Cloudflare. */
const FAKE_DEPLOY_URL = "https://deploy.e2e.invalid/run-123";

test("deploys via the sidebar button with the request intercepted", async ({ page }) => {
  // Intercept BEFORE any interaction so the confirm click can never leak a
  // real deploy request (design D9).
  let seen: { method: string; url: string } | null = null;
  await page.route("**/api/deploy", async (route) => {
    seen = { method: route.request().method(), url: route.request().url() };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ url: FAKE_DEPLOY_URL, status: "deploying" }),
    });
  });

  await page.goto(ADMIN_URLS.products);

  // Admin-only deploy group: shown after /api/deploy/config answers 200.
  const deployBtn = page.locator("#deploy-btn");
  await expect(deployBtn).toBeVisible();
  await deployBtn.click();

  const dialog = page.locator("#deploy-modal");
  await expect(dialog).toBeVisible();
  await page.locator("#deploy-confirm").click();

  // UI feedback from the intercepted 200 (D9: deploy status feedback).
  await expect(page.locator("#deploy-status")).toContainText("✅ Deploy iniciado");
  await expect(page.locator("#deploy-status")).toContainText(FAKE_DEPLOY_URL);

  // The request was really sent by the UI: POST to /api/deploy.
  expect(seen).not.toBeNull();
  expect(seen!.method).toBe("POST");
  expect(seen!.url).toContain("/api/deploy");
});
