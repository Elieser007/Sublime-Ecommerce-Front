/**
 * Admin E2E — Categories flow (tasks 2.6–2.7, design D7/D8).
 *
 * Serial per file (shared seeded D1); storageState from auth.setup (single
 * login). `reseedE2E()` in beforeAll re-runs the deterministic Back seed so
 * every run starts from identical rows.
 *
 * Coverage (spec "Admin Flows E2E" #3): sections/categories/subcategories
 * list, create a category under a seeded section, edit its name, and the
 * status toggle — the DELETE action soft-deletes (deactivate) and the 🔄
 * button reactivates ("borrar si aplica": soft delete is the delete surface
 * this UI exposes). All mutations run against a category created by the
 * flow, so the seeded catalog tree is never modified.
 */
import { test, expect, type Page } from "@playwright/test";
import { ADMIN_URLS, reseedE2E } from "../helpers";

test.describe.configure({ mode: "serial" });

/** Seeded catalog fixtures (Back scripts/seed-catalog.ts, fixed IDs). */
const SEEDED_SECTION_NAME = "Indumentaria";
const SEEDED_CATEGORY_NAME = "Remeras";
const SEEDED_SUBCATEGORY_NAME = "Algodón Pima";

/** The create/edit/toggle flow only ever touches its own category. */
function uniqueCategoryName(): string {
  return `E2E P7 Category ${Date.now()}`;
}

test.beforeAll(() => {
  reseedE2E();
});

test("lists seeded sections, categories and subcategories", async ({ page }) => {
  await page.goto(ADMIN_URLS.categories);

  // Sections tab (default): seeded section with active badge.
  let row = page.locator("#tab-sections tbody tr", { hasText: SEEDED_SECTION_NAME });
  await expect(row).toBeVisible();
  await expect(row).toContainText("Activo");

  // Categories tab: seeded category with its parent section badge.
  await page.locator('.tab[data-tab="categories"]').click();
  row = page.locator("#tab-categories tbody tr", { hasText: SEEDED_CATEGORY_NAME });
  await expect(row).toBeVisible();
  await expect(row).toContainText(SEEDED_SECTION_NAME);
  await expect(row).toContainText("Activo");

  // Subcategories tab: seeded subcategory under its parent category.
  await page.locator('.tab[data-tab="subcategories"]').click();
  row = page.locator("#tab-subcategories tbody tr", { hasText: SEEDED_SUBCATEGORY_NAME });
  await expect(row).toBeVisible();
  await expect(row).toContainText(SEEDED_CATEGORY_NAME);
});

/** Opens /admin/categories, creates a category under Indumentaria. */
async function createCategory(page: Page, name: string): Promise<void> {
  await page.goto(ADMIN_URLS.categories);
  await page.locator('.tab[data-tab="categories"]').click();
  await page.locator("#add-category").click();
  const modal = page.locator("#modal-overlay");
  await expect(modal).toBeVisible();
  await modal.locator("#modal-name").fill(name);
  await modal.locator("#parent-select").selectOption({ label: SEEDED_SECTION_NAME });
  await modal.locator("#modal-form button[type='submit']").click();
  await expect(modal).toBeHidden();
}

test("creates a category under a seeded section", async ({ page }) => {
  const name = uniqueCategoryName();
  await createCategory(page, name);

  // POST /api/categories → row appears with parent badge and active state.
  const row = page.locator("#tab-categories tbody tr", { hasText: name });
  await expect(row).toBeVisible();
  await expect(row).toContainText(SEEDED_SECTION_NAME);
  await expect(row).toContainText("Activo");
});

test("edits the category name and the list reflects it", async ({ page }) => {
  const name = uniqueCategoryName();
  const renamed = `${name} Editada`;
  await createCategory(page, name);
  let row = page.locator("#tab-categories tbody tr", { hasText: name });
  await expect(row).toBeVisible();

  await row.getByTitle("Editar").click();
  const modal = page.locator("#modal-overlay");
  await expect(modal).toBeVisible();
  await modal.locator("#modal-name").fill(renamed);
  await modal.locator("#modal-form button[type='submit']").click();
  await expect(modal).toBeHidden();

  // PUT /api/categories/:id → the reloaded list shows the new name.
  row = page.locator("#tab-categories tbody tr", { hasText: renamed });
  await expect(row).toBeVisible();
});

test("soft-deletes (deactivates) and reactivates the category", async ({ page }) => {
  const name = uniqueCategoryName();
  await createCategory(page, name);
  let row = page.locator("#tab-categories tbody tr", { hasText: name });
  await expect(row).toBeVisible();

  // DELETE = soft delete (is_active = 0), native confirm dialog.
  page.once("dialog", (dialog) => void dialog.accept());
  await row.getByTitle("Desactivar").click();
  row = page.locator("#tab-categories tbody tr", { hasText: name });
  await expect(row).toContainText("Inactivo");
  await expect(row.getByTitle("Reactivar")).toBeVisible();

  // Reactivate: PATCH status { isActive: true } → badge flips back.
  page.once("dialog", (dialog) => void dialog.accept());
  await row.getByTitle("Reactivar").click();
  row = page.locator("#tab-categories tbody tr", { hasText: name });
  await expect(row).toContainText("Activo");
  await expect(row.getByTitle("Desactivar")).toBeVisible();
});
