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
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getApiUrl } from "../../src/lib/api-url";

export const BACKEND_URL = getApiUrl();

/**
 * Back repo root — sibling of this Front repo (e2e/admin → up 3 levels = the
 * monorepo container). Used by reseedE2E(). Front is ESM, so derive the dir
 * from import.meta.url instead of __dirname.
 */
const BACK_REPO_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../Sublime-Ecommerce-Back"
);

export const ADMIN_CREDENTIALS = {
  email: "admin@sublime.com",
  password: "admin123",
} as const;

/** Admin panel routes (AdminSidebar links). */
export const ADMIN_URLS = {
  dashboard: "/dashboard",
  index: "/admin",
  products: "/admin/products",
  productCreate: "/admin/new",
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

/**
 * Reseed the deterministic e2e state (design D8) — runs the Back repo's
 * `pnpm run seed:e2e` against the local D1 sqlite file. Idempotent (fixed
 * IDs; e2e entities DELETE-then-INSERT, catalog INSERT OR IGNORE), so
 * calling it from every flow spec's beforeAll is safe and keeps every run
 * byte-identical. The Back webServer (playwright.config.ts) must already be
 * up so `.wrangler/state` exists — Playwright boots it before any test.
 */
export function reseedE2E(): void {
  execSync("pnpm run seed:e2e", { cwd: BACK_REPO_DIR, stdio: "inherit" });
}

/**
 * Dispatch a pointer drag on the promo canvas (mouse or touch) via
 * page.evaluate. Real PointerEvents are dispatched with pointerType
 * 'mouse' (default) or 'touch', so the editor's pointer session runs
 * identically for both input types (E2E-1 scenario 3, AR-2).
 *
 * `from`/`to` are canvas-relative pixel coordinates. The editor's
 * setPointerCapture is best-effort for synthetic events, so the session
 * still tracks via the document-level move/up listeners the page installs.
 */
export async function dispatchPointerDrag(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  pointerType: "mouse" | "touch" = "mouse"
): Promise<void> {
  await page.evaluate(
    ({ from, to, pointerType }) => {
      const canvas = document.getElementById("promo-canvas");
      if (!canvas) throw new Error("#promo-canvas not found");
      const rect = canvas.getBoundingClientRect();

      const fire = (type: string, x: number, y: number) => {
        canvas.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            pointerId: 1,
            pointerType,
            isPrimary: true,
            clientX: rect.left + x,
            clientY: rect.top + y,
          })
        );
      };

      fire("pointerdown", from.x, from.y);
      // A few intermediate moves so the session snaps through cells.
      const steps = 4;
      for (let i = 1; i <= steps; i++) {
        fire(
          "pointermove",
          from.x + ((to.x - from.x) * i) / steps,
          from.y + ((to.y - from.y) * i) / steps
        );
      }
      fire("pointerup", to.x, to.y);
    },
    { from, to, pointerType }
  );
}

/**
 * Touch-first context for the promo editor (AR-2): 375×667 viewport,
 * hasTouch + isMobile so the editor's mobile branch (fixed 80px cells,
 * horizontal scroll) is exercised exactly like a real device.
 */
export const TOUCH_CONTEXT = {
  viewport: { width: 375, height: 667 },
  hasTouch: true,
  isMobile: true,
} as const;

/** Read a tile's snapped cell from its rendered percent style. */
export async function tileCell(
  page: Page,
  tileId: string
): Promise<{ x: number; y: number; w: number; h: number }> {
  return page.evaluate((tileId) => {
    const el = document.querySelector(`.canvas-tile[data-id="${tileId}"]`);
    if (!el) throw new Error(`tile ${tileId} not found`);
    const style = (el as HTMLElement).style;
    const grid = document.getElementById("promo-canvas");
    const g = grid?.getBoundingClientRect();
    const toCell = (pct: string, total: number) =>
      Math.round((parseFloat(pct) / 100) * (g ? total : 1));
    return {
      x: toCell(style.left, 8),
      y: toCell(style.top, 4),
      w: toCell(style.width, 8),
      h: toCell(style.height, 4),
    };
  }, tileId);
}
