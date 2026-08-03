/**
 * Admin E2E helpers — shared login + seeded-state expectations (design D7/D8).
 *
 * Fixed IDs below come from Back `scripts/seed-e2e.ts` (task 2.2). Flows in
 * e2e/admin/flows/*.spec.ts (P7–P9) assert against these; the deterministic
 * seed keeps them stable across runs.
 *
 * Runbook (one-time setup, Back repo):
 *   1. pnpm install                     (packageManager pnpm@11)
 *   2. pnpm run db:migrate              (apply migrations to local D1)
 *   3. pnpm run seed:e2e                (deterministic fixed-ID seed)
 * Then run the Front suite: the backend webServer in playwright.config.ts
 * boots `wrangler dev` with RATE_LIMIT_DISABLED=true + ENVIRONMENT=test.
 * IMPORTANT: stop any manually running backend on :8787 first — the admin
 * webServer uses reuseExistingServer:false on purpose (a plain backend has
 * the rate limits ON and would break the suite).
 */
import { expect, type Page } from "@playwright/test";
import { getApiUrl } from "../../src/lib/api-url";

export const BACKEND_URL = getApiUrl();

export const ADMIN_CREDENTIALS = {
  email: "admin@sublime.com",
  password: "admin123",
} as const;

/** Admin panel routes (AdminSidebar links). */
export const ADMIN_URLS = {
  dashboard: "/dashboard",
  index: "/admin",
  products: "/admin/products",
  productCreate: "/admin/nuevo",
  categories: "/admin/categories",
  users: "/admin/users",
  orders: "/admin/orders",
  promotions: "/admin/promotions",
  branches: "/admin/branches",
  attributes: "/admin/attribute-modules",
} as const;

export const SEEDED_ORDER_IDS = ["ord-e2e-1", "ord-e2e-2", "ord-e2e-3"] as const;
export const SEEDED_CLIENT_USER_ID = "user-client-e2e";
export const SEEDED_PROMO_ID = "promo-e2e-1";
/**
 * Insert-if-missing: on a dev DB already seeded with seed-admin (same email
 * admin@sublime.com), user-admin-e2e is NOT created — flows must not assert
 * this user id; the seed guarantees the *email* and admin role instead.
 */
export const SEEDED_ADMIN_USER_ID = "user-admin-e2e";
export const SEEDED_BRANCH_IDS = ["branch-principal", "branch-centro"] as const;
export const SEEDED_ATTRIBUTE_MODULE_IDS = ["mod-color", "mod-size", "mod-material"] as const;
/** Catalog products referenced by the e2e order items (fixed slugs). */
export const SEEDED_ORDER_PRODUCT_SLUGS = [
  "prod-remera-sublime-basica-algodon",
  "prod-taza-magica-negro",
  "prod-gorra-visera-plana-classic",
  "prod-cuaderno-a5-punto",
  "prod-sticker-pack-holografico",
] as const;

/**
 * Alternative login — the storageState path (auth.setup.ts) is the default;
 * use this only when a spec needs a fresh session (logout / 401 flows).
 * Proves the full UI path: fill the real form, submit, wait for the
 * /dashboard redirect (a failed login stays on /login and fails fast).
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto("/login");
  await page.locator('#login-form input[name="email"]').fill(ADMIN_CREDENTIALS.email);
  await page.locator('#login-form input[name="password"]').fill(ADMIN_CREDENTIALS.password);
  await page.getByRole("button", { name: "Iniciar Sesión" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}
