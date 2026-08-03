/**
 * Admin E2E — Products flow (tasks 2.6–2.7, design D7/D8).
 *
 * Serial per file (shared seeded D1); storageState from auth.setup (single
 * login, credentials never re-submitted). `reseedE2E()` in beforeAll re-runs
 * the deterministic Back seed so every run starts from identical rows.
 *
 * Coverage (spec "Admin Flows E2E" #1): list against the seeded catalog,
 * create via the products modal, edit the name, add+delete a volume price
 * tier via the pricing modal, and the active/inactive status toggle. All
 * mutations run against a product created by the flow itself, so the shared
 * seeded catalog is never modified.
 */
import { test, expect, type Page } from "@playwright/test";
import { ADMIN_URLS, reseedE2E } from "../helpers";

test.describe.configure({ mode: "serial" });

/** Seeded catalog fixtures (Back scripts/seed-catalog.ts, fixed IDs). */
const SEEDED_PRODUCT_NAME = "Remera Sublime Básica Algodón";
const SEEDED_PRODUCT_SLUG = "prod-remera-sublime-basica-algodon";

/** The create/edit/pricing/status flow only ever touches its own product. */
function uniqueProductName(): string {
  return `E2E P7 Product ${Date.now()}`;
}

test.beforeAll(() => {
  reseedE2E();
});

test("lists seeded catalog products", async ({ page }) => {
  await page.goto(ADMIN_URLS.products);

  // Search matches name or slug (300ms debounce; expect auto-waits).
  await page.locator("#search").fill(SEEDED_PRODUCT_NAME);
  const row = page.locator("tbody tr", { hasText: SEEDED_PRODUCT_NAME });
  await expect(row).toBeVisible();
  await expect(row.locator(".slug-display")).toHaveText(SEEDED_PRODUCT_SLUG);
  await expect(row).toContainText("Indumentaria");
  await expect(row).toContainText("Activo");
});

/** Opens /admin/products, fills the create modal and saves. */
async function createProduct(page: Page, name: string): Promise<void> {
  await page.goto(ADMIN_URLS.products);
  await page.locator("#add-product").click();
  const modal = page.locator("#modal-overlay");
  await expect(modal).toBeVisible();
  await modal.locator("#modal-name").fill(name);
  await modal.locator('input[name="basePrice"]').fill("88000");
  await modal.locator("#section-select").selectOption({ label: "Indumentaria" });
  await modal.locator("#category-select").selectOption({ label: "Remeras" });
  await modal.locator("#subcategory-select").selectOption({ label: "Algodón Pima" });
  await modal.locator("#modal-submit").click();
  await expect(modal).toBeHidden();
}

test("creates a product via the modal and it appears in the list", async ({ page }) => {
  const name = uniqueProductName();
  await createProduct(page, name);

  // Persisted against the real backend: POST /api/products → list re-query.
  await page.locator("#search").fill(name);
  const row = page.locator("tbody tr", { hasText: name });
  await expect(row).toBeVisible();
  await expect(row.locator(".slug-display")).toHaveText(/^e2e-p7-product-\d+$/);
  await expect(row).toContainText("Activo");
});

test("edits the product name and the list reflects it", async ({ page }) => {
  const name = uniqueProductName();
  const renamed = `${name} Editado`;
  await createProduct(page, name);
  await page.locator("#search").fill(name);
  let row = page.locator("tbody tr", { hasText: name });
  await expect(row).toBeVisible();

  await row.getByTitle("Editar").click();
  const modal = page.locator("#modal-overlay");
  await expect(modal).toBeVisible();
  await modal.locator("#modal-name").fill(renamed);
  await modal.locator("#modal-submit").click();
  await expect(modal).toBeHidden();

  // PUT /api/products/:id → the list re-queries; retarget the search term.
  await page.locator("#search").fill(renamed);
  row = page.locator("tbody tr", { hasText: renamed });
  await expect(row).toBeVisible();
  await expect(row).toContainText("Activo");
});

test("adds and deletes a volume price tier in the pricing modal", async ({ page }) => {
  const name = uniqueProductName();
  await createProduct(page, name);
  await page.locator("#search").fill(name);
  const row = page.locator("tbody tr", { hasText: name });
  await expect(row).toBeVisible();

  await row.getByTitle("Precios").click();
  const modal = page.locator("#price-overlay");
  await expect(modal).toBeVisible();
  // Fresh product → empty tier state is the real API state, not a stub.
  await expect(modal.locator("#prices-tbody")).toContainText("Sin precios configurados");

  // POST /api/products/:id/prices → row appears with es-PY formatting.
  await modal.locator("#price-min-qty").fill("10");
  await modal.locator("#price-value").fill("88000");
  await modal.locator("#add-price-btn").click();
  const tierRow = modal.locator("#prices-tbody tr", { hasText: "10+ unds" });
  await expect(tierRow).toContainText("₲ 88.000");

  // DELETE the tier (native confirm) → empty state returns.
  page.once("dialog", (dialog) => void dialog.accept());
  await tierRow.getByTitle("Eliminar").click();
  await expect(modal.locator("#prices-tbody")).toContainText("Sin precios configurados");

  await modal.locator("#price-modal-close").click();
  await expect(modal).toBeHidden();
});

test("toggles product status active and back via the confirmation modal", async ({ page }) => {
  const name = uniqueProductName();
  await createProduct(page, name);
  await page.locator("#search").fill(name);
  let row = page.locator("tbody tr", { hasText: name });
  await expect(row).toBeVisible();

  // Deactivate: PATCH /api/products/:id/status { isActive: false }.
  await row.getByTitle("Desactivar").click();
  const statusModal = page.locator("#status-overlay");
  await expect(statusModal).toBeVisible();
  await statusModal.locator("#status-confirm-deactivate").click();
  await expect(statusModal).toBeHidden();
  row = page.locator("tbody tr", { hasText: name });
  await expect(row).toContainText("Inactivo");
  await expect(row.getByTitle("Reactivar")).toBeVisible();

  // Reactivate: PATCH { isActive: true } → badge flips back.
  await row.getByTitle("Reactivar").click();
  await expect(statusModal).toBeVisible();
  await statusModal.locator("#status-confirm-activate").click();
  await expect(statusModal).toBeHidden();
  row = page.locator("tbody tr", { hasText: name });
  await expect(row).toContainText("Activo");
  await expect(row.getByTitle("Desactivar")).toBeVisible();
});
