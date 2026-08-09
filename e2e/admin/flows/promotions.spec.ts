/**
 * Admin E2E — Promotions flow (tasks 2.8–2.9, design D7/D8).
 *
 * Serial per file (shared seeded D1); storageState from auth.setup (single
 * login, credentials never re-submitted). `reseedE2E()` in beforeAll re-runs
 * the deterministic Back seed so every run starts from identical rows.
 *
 * Coverage (spec "Admin Flows E2E" #6): promotion sections list, seeded
 * promo-e2e-1 verification in the hero section, create (image upload +
 * valid relative link — the form blocks saves without an imageUrl and the
 * backend rejects non-http(s)/non-relative link schemes), edit the title,
 * and delete (🗑️ + native confirm — promotions hard-delete). "Toggle status"
 * is N/A for this UI: the promotions manager exposes no status control, so
 * the delete surface the spec requires is the 🗑️ action (same "borrar si
 * aplica" convention as P7 categories). All mutations run against a
 * promotion created by the flow; the seeded promo-e2e-1 is only asserted.
 */
import { test, expect, type Page } from "@playwright/test";
import { ADMIN_URLS, reseedE2E } from "../helpers";

test.describe.configure({ mode: "serial" });

/** Seeded promotion (Back scripts/seed-e2e.ts, fixed id promo-e2e-1). */
const SEEDED_PROMO_TITLE = "E2E Promo Test";
const SEEDED_PROMO_SUBTITLE = "Promoción fija para los flujos e2e del panel admin";
/** Valid relative link (backend rule: "/" prefix or http(s) only). */
const VALID_PROMO_LINK = "/products/remera-sublime-basica-algodon";

/** 1×1 PNG — the promo image pipeline resizes ≤1000px and re-encodes to WebP. */
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

/** The create/edit/delete flow only ever touches its own promotion. */
function uniquePromoTitle(): string {
  return `E2E P8 Promo ${Date.now()}`;
}

test.beforeAll(() => {
  reseedE2E();
});

/** Opens /admin/promotions and selects the seeded hero section. */
async function selectHeroSection(page: Page): Promise<void> {
  await page.goto(ADMIN_URLS.promotions);
  await page.locator('.section-card[data-id="promo-hero"]').click();
  await expect(page.locator("#promo-manager")).toBeVisible();
  await expect(page.locator("#section-name")).toHaveText("Hero Home");
}

test("lists promotion sections and shows the seeded promo", async ({ page }) => {
  await selectHeroSection(page);

  // Seeded fixed-ID promo in the hero section (title + subtitle).
  const card = page.locator(".promo-card", { hasText: SEEDED_PROMO_TITLE });
  await expect(card).toBeVisible();
  await expect(card).toContainText(SEEDED_PROMO_SUBTITLE);
});

test("switches display type in the live preview and restores the original", async ({ page }) => {
  await selectHeroSection(page);

  const displaySelect = page.locator("#display-type-select");
  await expect(displaySelect).toBeVisible();
  await expect(displaySelect.locator("option")).toHaveCount(6);

  const originalType = await displaySelect.inputValue();
  expect(originalType).not.toBe("");

  // Switch to carousel → the preview renders a .carousel-promo (PUT persists).
  await displaySelect.selectOption("carousel");
  await expect(page.locator("#live-preview-container .carousel-promo")).toBeVisible();

  // Restore the original type so later serial tests are unaffected.
  await displaySelect.selectOption(originalType);
  await expect(page.locator(`#live-preview-container .${originalType}-promo`)).toBeVisible();
});

/** Selects the hero section and creates a promotion via the modal. */
async function createPromo(page: Page, title: string, description: string): Promise<void> {
  await selectHeroSection(page);
  await page.locator("#add-promo-btn").click();
  const modal = page.locator("#modal-overlay");
  await expect(modal).toBeVisible();

  // Image upload is required: the form refuses to save without an imageUrl.
  await modal.locator("#promo-input").setInputFiles({
    name: "promo.png",
    mimeType: "image/png",
    buffer: PNG_1X1,
  });
  await expect(modal.locator("#promo-image")).toBeVisible();

  await modal.locator('#promo-form input[name="title"]').fill(title);
  await modal.locator('#promo-form input[name="link"]').fill(VALID_PROMO_LINK);
  await modal.locator('#promo-form input[name="description"]').fill(description);
  await modal.locator('#promo-form button[type="submit"]').click();
  await expect(modal).toBeHidden();
}

test("creates a promotion with an image and valid link", async ({ page }) => {
  const title = uniquePromoTitle();
  const description = "Promo creada por el flujo e2e";
  await createPromo(page, title, description);

  // POST /api/promotions → the reloaded list shows the new card.
  const card = page.locator(".promo-card", { hasText: title });
  await expect(card).toBeVisible();
  await expect(card).toContainText(description);
  await expect(card).toContainText(VALID_PROMO_LINK);
});

test("edits the promotion title", async ({ page }) => {
  const title = uniquePromoTitle();
  await createPromo(page, title, "Promo editada");
  let card = page.locator(".promo-card", { hasText: title });
  await expect(card).toBeVisible();

  await card.getByTitle("Editar").click();
  const modal = page.locator("#modal-overlay");
  await expect(modal).toBeVisible();
  await modal.locator('#promo-form input[name="title"]').fill(`${title} Editada`);
  await modal.locator('#promo-form button[type="submit"]').click();
  await expect(modal).toBeHidden();

  // PUT /api/promotions/:id → the reloaded list shows the new title.
  card = page.locator(".promo-card", { hasText: `${title} Editada` });
  await expect(card).toBeVisible();
});

test("deletes the promotion", async ({ page }) => {
  const title = uniquePromoTitle();
  await createPromo(page, title, "Promo a eliminar");
  const card = page.locator(".promo-card", { hasText: title });
  await expect(card).toBeVisible();

  // Hard delete (DELETE /api/promotions/:id), native confirm dialog.
  page.once("dialog", (dialog) => void dialog.accept());
  await card.getByTitle("Eliminar").click();
  await expect(page.locator(".promo-card", { hasText: title })).toHaveCount(0);
});
