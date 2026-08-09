import { expect, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getApiUrl } from "../../src/lib/api-url";

export const BACKEND_URL = getApiUrl();

const BACK_REPO_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../Sublime-Ecommerce-Back"
);

export const ADMIN_CREDENTIALS = {
  email: "admin@sublime.com",
  password: "admin123",
} as const;

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
export const SEEDED_ADMIN_USER_ID = "user-admin-e2e";
export const SEEDED_BRANCH_IDS = ["branch-principal", "branch-centro"] as const;
export const SEEDED_ATTRIBUTE_MODULE_IDS = ["mod-color", "mod-size", "mod-material"] as const;
export const SEEDED_ORDER_PRODUCT_SLUGS = [
  "prod-remera-sublime-basica-algodon",
  "prod-taza-magica-negro",
  "prod-gorra-visera-plana-classic",
  "prod-cuaderno-a5-punto",
  "prod-sticker-pack-holografico",
] as const;

export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto("/login");
  await page.locator('#login-form input[name="email"]').fill(ADMIN_CREDENTIALS.email);
  await page.locator('#login-form input[name="password"]').fill(ADMIN_CREDENTIALS.password);
  await page.getByRole("button", { name: "Iniciar Sesión" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

export function reseedE2E(): void {
  execSync("pnpm run seed:e2e", { cwd: BACK_REPO_DIR, stdio: "inherit" });
}

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

export const TOUCH_CONTEXT = {
  viewport: { width: 375, height: 667 },
  hasTouch: true,
  isMobile: true,
} as const;

export async function tileCell(
  page: Page,
  tileId: string
): Promise<{ x: number; y: number; w: number; h: number }> {
  const cols = parseInt(await page.locator("#grid-cols-select").inputValue(), 10) || 8;
  const rows = parseInt(await page.locator("#grid-rows-select").inputValue(), 10) || 2;
  return page.evaluate(({ tileId, cols, rows }) => {
    const el = document.querySelector(`.canvas-tile[data-id="${tileId}"]`);
    if (!el) throw new Error(`tile ${tileId} not found`);
    const style = (el as HTMLElement).style;
    const toCell = (pct: string, total: number) => Math.round((parseFloat(pct) / 100) * total);
    return {
      x: toCell(style.left, cols),
      y: toCell(style.top, rows),
      w: toCell(style.width, cols),
      h: toCell(style.height, rows),
    };
  }, { tileId, cols, rows });
}
