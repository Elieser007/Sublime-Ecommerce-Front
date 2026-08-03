/**
 * Admin E2E — Uploads flow (tasks 2.10, design D7/D8).
 *
 * Serial per file (shared seeded D1); storageState from auth.setup (single
 * login, credentials never re-submitted). `reseedE2E()` in beforeAll re-runs
 * the deterministic Back seed so every run starts from identical rows.
 *
 * Coverage (spec "Admin Flows E2E" #2/#9): the real image pipeline through
 * the products page — primary image upload + associate on create
 * (POST /api/upload + POST /api/products/:id/images), gallery batch upload
 * on edit, and removal of both (DELETE /api/products/:id/images/:imageId +
 * DELETE /api/upload/:filename). All mutations run against products created
 * by the flow itself; the local wrangler dev R2 backend makes the upload
 * endpoints real (same path P8's avatar flow proved).
 */
import { test, expect, type Page } from "@playwright/test";
import { ADMIN_URLS, reseedE2E } from "../helpers";

test.describe.configure({ mode: "serial" });

test.setTimeout(60_000);

/** 1×1 PNG — the canvas pipeline resizes ≤1000px and re-encodes to WebP. */
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

/** The upload/remove flow only ever touches its own product. */
function uniqueProductName(): string {
  return `E2E P9 Prod ${Date.now()}`;
}

test.beforeAll(() => {
  reseedE2E();
});

/** Opens /admin/products and creates a product via the modal. */
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

/** Reopens the edit modal for `name` after searching the products list. */
async function openEditModal(page: Page, name: string) {
  await page.locator("#search").fill(name);
  const row = page.locator("tbody tr", { hasText: name });
  await expect(row).toBeVisible();
  await row.getByTitle("Editar").click();
  const modal = page.locator("#modal-overlay");
  await expect(modal).toBeVisible();
  return modal;
}

test("uploads a primary image with a product and removes it", async ({ page }) => {
  const name = uniqueProductName();
  await page.goto(ADMIN_URLS.products);
  await page.locator("#add-product").click();
  let modal = page.locator("#modal-overlay");
  await expect(modal).toBeVisible();

  // Primary upload → client-side canvas processing → preview before save.
  await modal.locator("#primary-input").setInputFiles({
    name: "primary.png",
    mimeType: "image/png",
    buffer: PNG_1X1,
  });
  await expect(modal.locator("#primary-image")).toBeVisible();

  await modal.locator("#modal-name").fill(name);
  await modal.locator('input[name="basePrice"]').fill("88000");
  await modal.locator("#section-select").selectOption({ label: "Indumentaria" });
  await modal.locator("#category-select").selectOption({ label: "Remeras" });
  await modal.locator("#subcategory-select").selectOption({ label: "Algodón Pima" });
  await modal.locator("#modal-submit").click();
  await expect(modal).toBeHidden();

  // POST /api/upload + POST /api/products/:id/images → persisted on reopen.
  modal = await openEditModal(page, name);
  await expect(modal.locator("#primary-image")).toHaveAttribute("src", /\/api\/upload\//);

  // Remove: DELETE images + DELETE /api/upload/:filename via the confirm modal.
  await modal.locator("#primary-remove").click();
  const deleteModal = page.locator("#delete-overlay");
  await expect(deleteModal).toBeVisible();
  await deleteModal.locator("#delete-confirm").click();
  await expect(modal.locator("#primary-image")).toBeHidden();
  await expect(modal.locator("#primary-remove")).toBeHidden();
});

test("uploads gallery images and removes them", async ({ page }) => {
  const name = uniqueProductName();
  await createProduct(page, name);

  // Edit modal → gallery batch upload (processed client-side, uploaded on save).
  let modal = await openEditModal(page, name);
  await modal.locator("#gallery-input").setInputFiles([
    { name: "gallery-1.png", mimeType: "image/png", buffer: PNG_1X1 },
    { name: "gallery-2.png", mimeType: "image/png", buffer: PNG_1X1 },
  ]);
  await expect(modal.locator("#gallery-strip .gallery-thumb")).toHaveCount(2);
  await modal.locator("#modal-submit").click();
  await expect(modal).toBeHidden();

  // POST /api/upload ×2 + POST /api/products/:id/images ×2 → persisted.
  modal = await openEditModal(page, name);
  const thumbs = modal.locator("#gallery-strip .gallery-thumb");
  await expect(thumbs).toHaveCount(2);
  await expect(modal.locator("#gallery-count")).toHaveText("2 imágenes");
  await expect(thumbs.first().locator("img")).toHaveAttribute("src", /\/api\/upload\//);

  // Remove the first image (confirm modal → DELETE image + R2 object).
  await thumbs.first().locator(".gallery-remove-btn").click();
  let deleteModal = page.locator("#delete-overlay");
  await expect(deleteModal).toBeVisible();
  await deleteModal.locator("#delete-confirm").click();
  await expect(modal.locator("#gallery-strip .gallery-thumb")).toHaveCount(1);
  await expect(modal.locator("#gallery-count")).toHaveText("1 imagen");

  // Remove the last one → empty gallery state.
  await modal.locator("#gallery-strip .gallery-thumb .gallery-remove-btn").click();
  deleteModal = page.locator("#delete-overlay");
  await expect(deleteModal).toBeVisible();
  await deleteModal.locator("#delete-confirm").click();
  await expect(modal.locator("#gallery-strip .gallery-thumb")).toHaveCount(0);
  await expect(modal.locator("#gallery-count")).toHaveText("0 imágenes");
});
