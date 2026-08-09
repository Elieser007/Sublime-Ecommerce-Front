/**
 * Admin E2E — Promo visual editor (mouse) (E2E-1 scenarios 1,2,4,5,6, design
 * Testing Strategy).
 *
 * Local-save model: edits are local-only; Guardar fires ONE batch PUT; the
 * reload proves persistence (posX/posY, spans, order). Covers:
 *   - drag → Guardar → reload → posX/posY persisted
 *   - resize → Guardar → reload → width/height spans persisted
 *   - carousel reorder → Guardar → reload → order persisted
 *   - Cancelar (revert) restores the snapshot
 *   - beforeunload dialog when dirty
 *   - R2 proof: old upload URL 404s after replace
 *
 * Serial per file (shared seeded D1); storageState from auth.setup.
 */
import { test, expect, type Page } from "@playwright/test";
import { ADMIN_URLS, reseedE2E, dispatchPointerDrag } from "../helpers";

test.describe.configure({ mode: "serial" });

/** Seeded catalog tiles section: 2 promos at (0,0,4,2) and (4,0,4,2). */
const TILES_SECTION_ID = "promo-home-top";
const TILE_A = "Remeras Personalizadas";
const TILE_B = "Tazas Mágicas";

/** 1×1 PNG for the image-replace R2 proof. */
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

test.beforeAll(() => {
  reseedE2E();
});

/** Opens /admin/promotions and selects the seeded tiles section. */
async function openTilesSection(page: Page): Promise<void> {
  await page.goto(ADMIN_URLS.promotions);
  await page.locator(`.section-card[data-id="${TILES_SECTION_ID}"]`).click();
  await expect(page.locator("#promo-manager")).toBeVisible();
  await expect(page.locator("#canvas-section")).toBeVisible();
  await expect(page.locator(".canvas-tile")).toHaveCount(2);
}

/** Tile data-id is the server promo id — resolve it from the canvas. */
async function tileId(page: Page, title: string): Promise<string> {
  const id = await page
    .locator(`.canvas-tile`, { hasText: title })
    .getAttribute("data-id");
  expect(id).toBeTruthy();
  return id!;
}

/** Current section grid dims (the canvas mirrors local state selects). */
async function gridDims(page: Page): Promise<{ cols: number; rows: number }> {
  const cols = parseInt(await page.locator("#grid-cols-select").inputValue(), 10) || 8;
  const rows = parseInt(await page.locator("#grid-rows-select").inputValue(), 10) || 2;
  return { cols, rows };
}

/** Tile position on the canvas (percent → cell, using the REAL grid dims). */
async function tilePos(
  page: Page,
  tileId: string
): Promise<{ x: number; y: number; w: number; h: number }> {
  const { cols, rows } = await gridDims(page);
  return page.evaluate(({ id, cols, rows }) => {
    const el = document.querySelector(`.canvas-tile[data-id="${id}"]`) as HTMLElement;
    const pct = (v: string) => parseFloat(v);
    return {
      x: Math.round((pct(el.style.left) / 100) * cols),
      y: Math.round((pct(el.style.top) / 100) * rows),
      w: Math.round((pct(el.style.width) / 100) * cols),
      h: Math.round((pct(el.style.height) / 100) * rows),
    };
  }, { id: tileId, cols, rows });
}

test("shows the seeded tiles section on the canvas", async ({ page }) => {
  await openTilesSection(page);
  const a = await tileId(page, TILE_A);
  const pos = await tilePos(page, a);
  expect(pos).toEqual({ x: 0, y: 0, w: 4, h: 2 });
});

test("mouse drag snaps posX/posY and persists after Guardar + reload (E2E-1 #1)", async ({ page }) => {
  await openTilesSection(page);
  const a = await tileId(page, TILE_A);
  const { cols, rows } = await gridDims(page);

  // Tile A is 4×2 at (0,0) in an 8×2 grid → full height; it can only move
  // horizontally (clampTile pins posY to 0 for h:2 tiles in 2 rows).
  const before = await tilePos(page, a);
  const pxPerCell = await page.evaluate(() => {
    const canvas = document.getElementById("promo-canvas")!;
    return canvas.getBoundingClientRect().width / 8;
  });

  // Drag the tile so its top-left lands on cell (2,0): target pixel = cell*px.
  await dispatchPointerDrag(
    page,
    { x: 10, y: 10 },
    { x: 2 * pxPerCell, y: 10 }
  );

  const moved = await tilePos(page, a);
  expect(moved.x).toBe(2);
  expect(moved.y).toBe(0);
  expect(cols).toBe(8);
  expect(rows).toBe(2);
  await expect(page.locator("#save-btn")).toBeEnabled();

  // Guardar → one batch PUT → reload → persisted.
  await page.locator("#save-btn").click();
  await expect(page.locator("#editor-status")).toHaveText("Sin cambios");

  await page.reload();
  await page.locator(`.section-card[data-id="${TILES_SECTION_ID}"]`).click();
  await expect(page.locator("#canvas-section")).toBeVisible();
  const after = await tilePos(page, await tileId(page, TILE_A));
  expect(after.x).toBe(2);
  expect(after.y).toBe(0);
  expect(before.w).toBe(after.w); // spans unchanged by drag
  expect(before.h).toBe(after.h);

  // Restore the tile to (0,0) and re-save so later serial tests (and any
  // re-run) see the pristine seeded layout — same pattern as the carousel test.
  // Grab a point inside the tile's body (1.5 cells from its left edge, below
  // the north-handle strip) so the grab neither hits a 44px handle nor the
  // neighbor tile's edge handle.
  const restoreFrom = await page.evaluate((id) => {
    const canvas = document.getElementById("promo-canvas")!;
    const tile = document.querySelector(`.canvas-tile[data-id="${id}"]`) as HTMLElement;
    const cr = canvas.getBoundingClientRect();
    const tr = tile.getBoundingClientRect();
    const pxPerCell = cr.width / 8;
    return { x: tr.left - cr.left + pxPerCell * 1.5, y: 30 };
  }, a);
  await dispatchPointerDrag(page, restoreFrom, { x: 10, y: 10 });
  await page.locator("#save-btn").click();
  await expect(page.locator("#editor-status")).toHaveText("Sin cambios");
});

test("mouse resize drags a corner handle and persists spans after reload (E2E-1 #2)", async ({ page }) => {
  await openTilesSection(page);
  const a = await tileId(page, TILE_A);
  const pxPerCell = await page.evaluate(() => {
    const canvas = document.getElementById("promo-canvas")!;
    return canvas.getBoundingClientRect().width / 8;
  });
  const pxPerRow = await page.evaluate(() => {
    const canvas = document.getElementById("promo-canvas")!;
    return canvas.getBoundingClientRect().height / 2; // section grid_rows = 2
  });

  // A is 4×2 at (0,0): grab its SE handle (bottom-right of the tile) and pull
  // to cell (5,1) → spans cells 0..5 → width 6, height clamped to 2 (full
  // grid height; inclusive-cell math: width = cell.x - posX + 1).
  await dispatchPointerDrag(
    page,
    { x: 4 * pxPerCell - 4, y: 2 * pxPerRow - 4 },
    { x: 5 * pxPerCell, y: 1 * pxPerRow }
  );

  const resized = await tilePos(page, a);
  expect(resized.w).toBe(6);
  expect(resized.h).toBe(2);

  await page.locator("#save-btn").click();
  await expect(page.locator("#editor-status")).toHaveText("Sin cambios");

  await page.reload();
  await page.locator(`.section-card[data-id="${TILES_SECTION_ID}"]`).click();
  await expect(page.locator("#canvas-section")).toBeVisible();
  const after = await tilePos(page, await tileId(page, TILE_A));
  expect(after.w).toBe(6);
  expect(after.h).toBe(2);

  // Restore spans to the seeded 4×2 via the edit modal, then save, so later
  // serial tests (and any re-run) see the pristine layout.
  await page.locator(`.canvas-tile[data-id="${a}"]`).click();
  const modal = page.locator("#modal-overlay");
  await expect(modal).toBeVisible();
  await modal.locator('select[name="width"]').selectOption("4");
  await modal.locator('select[name="height"]').selectOption("2");
  await modal.locator('#promo-form button[type="submit"]').click();
  await expect(modal).toBeHidden();
  await page.locator("#save-btn").click();
  await expect(page.locator("#editor-status")).toHaveText("Sin cambios");
});

test("carousel reorder persists order after Guardar + reload (E2E-1 #4)", async ({ page }) => {
  await openTilesSection(page);
  const a = await tileId(page, TILE_A);
  const b = await tileId(page, TILE_B);

  // Switch the section to carousel (local edit on the working copy).
  await page.locator("#display-type-select").selectOption("carousel");
  await expect(page.locator("#strip-section")).toBeVisible();
  await expect(page.locator(".strip-item")).toHaveCount(2);

  // Drag strip item B (index 1) to the front (index 0) via HTML5 drag.
  const stripB = page.locator(".strip-item", { hasText: TILE_B });
  const stripA = page.locator(".strip-item", { hasText: TILE_A });
  await stripB.dragTo(stripA);
  // Order in the working copy: B first.
  await expect(page.locator(".strip-item").first()).toContainText(TILE_B);

  await page.locator("#save-btn").click();
  await expect(page.locator("#editor-status")).toHaveText("Sin cambios");

  await page.reload();
  await page.locator(`.section-card[data-id="${TILES_SECTION_ID}"]`).click();
  await expect(page.locator("#strip-section")).toBeVisible();
  await expect(page.locator(".strip-item").first()).toContainText(TILE_B);
  // Restore order + display type + grid positions so later serial tests (and
  // any re-run) see the pristine seeded layout.
  await page.locator(".strip-item", { hasText: TILE_A }).dragTo(page.locator(".strip-item", { hasText: TILE_B }));
  await expect(page.locator(".strip-item").first()).toContainText(TILE_A);
  await page.locator("#display-type-select").selectOption("tiles");
  await expect(page.locator("#canvas-section")).toBeVisible();
  // renumberOrder set posX = array index (B at 1); drag B back to its seeded
  // cell (4,0) so the tiles grid is pristine again.
  const bCenter = await page.evaluate((id) => {
    const canvas = document.getElementById("promo-canvas")!;
    const tile = document.querySelector(`.canvas-tile[data-id="${id}"]`) as HTMLElement;
    const cr = canvas.getBoundingClientRect();
    const tr = tile.getBoundingClientRect();
    return { x: tr.left - cr.left + tr.width / 2, y: tr.height / 2 };
  }, b);
  const pxPerCell = await page.evaluate(() => {
    return document.getElementById("promo-canvas")!.getBoundingClientRect().width / 8;
  });
  await dispatchPointerDrag(page, bCenter, { x: 6 * pxPerCell, y: bCenter.y });
  const bPos = await tilePos(page, b);
  expect(bPos.x).toBe(4);
  expect(bPos.y).toBe(0);
  await page.locator("#save-btn").click();
  await expect(page.locator("#editor-status")).toHaveText("Sin cambios");
});

test("Cancelar (revert) restores the snapshot and clears dirty (E2E-1 #5)", async ({ page }) => {
  await openTilesSection(page);
  const a = await tileId(page, TILE_A);
  const pxPerCell = await page.evaluate(() => {
    const canvas = document.getElementById("promo-canvas")!;
    return canvas.getBoundingClientRect().width / 8;
  });

  await dispatchPointerDrag(page, { x: 10, y: 10 }, { x: 3 * pxPerCell, y: 10 });
  const moved = await tilePos(page, a);
  // Tile A is 4 wide in an 8-col grid → posX is clamped to [0, cols-w] = [0, 4].
  expect(moved.x).toBe(3);
  await expect(page.locator("#save-btn")).toBeEnabled();

  page.once("dialog", (dialog) => void dialog.accept());
  await page.locator("#revert-btn").click();

  await expect(page.locator("#save-btn")).toBeDisabled();
  const reverted = await tilePos(page, a);
  expect(reverted.x).toBe(0);
  expect(reverted.y).toBe(0);
});

test("beforeunload warns when leaving a dirty editor (E2E-1 #5)", async ({ page }) => {
  await openTilesSection(page);
  const a = await tileId(page, TILE_A);
  const pxPerCell = await page.evaluate(() => {
    const canvas = document.getElementById("promo-canvas")!;
    return canvas.getBoundingClientRect().width / 8;
  });

  await dispatchPointerDrag(page, { x: 10, y: 10 }, { x: 3 * pxPerCell, y: 10 });
  await expect(page.locator("#save-btn")).toBeEnabled();

  const dialogPromise = page.waitForEvent("dialog");
  // The beforeunload dialog BLOCKS the navigation, so the evaluate only
  // resolves after the dialog is dismissed — don't await it here.
  const navPromise = page.evaluate(() => {
    window.location.href = "/admin";
  }).catch(() => {});
  const dialog = await dialogPromise;
  expect(dialog.type()).toBe("beforeunload");
  await dialog.dismiss();
  await navPromise.catch(() => {});
});

test("replacing an image deletes the old R2 object (E2E-1 #6)", async ({ page }) => {
  await openTilesSection(page);
  const a = await tileId(page, TILE_A);

  // Upload a first image for tile A (promo is 'text' seeded, no image).
  await page.locator(`.canvas-tile[data-id="${a}"]`).click();
  const modal = page.locator("#modal-overlay");
  await expect(modal).toBeVisible();
  await modal.locator("#promo-input").setInputFiles({
    name: "first.png",
    mimeType: "image/png",
    buffer: PNG_1X1,
  });
  await expect(modal.locator("#promo-image")).toBeVisible();
  await modal.locator('#promo-form button[type="submit"]').click();
  await expect(modal).toBeHidden();

  // Uploads fire at Guardar time — capture the URL from the POST response.
  const uploadPromise = page.waitForResponse(
    (res) => res.url().includes("/api/upload") && res.request().method() === "POST"
  );
  await page.locator("#save-btn").click();
  await expect(page.locator("#editor-status")).toHaveText("Sin cambios");
  const uploadResponse = await uploadPromise;
  const uploadBody = (await uploadResponse.json()) as { url?: string };
  expect(uploadBody.url).toBeTruthy();
  const oldUrl = uploadBody.url!;
  const oldFilename = oldUrl.split("/").pop()!;
  const oldUpload = await page.request.get(`http://localhost:8787/api/upload/${oldFilename}`);
  expect(oldUpload.status()).toBe(200);

  // Replace the image with a second upload → old R2 object must be deleted.
  await page.locator(`.canvas-tile[data-id="${a}"]`).click();
  await expect(modal).toBeVisible();
  await modal.locator("#promo-input").setInputFiles({
    name: "second.png",
    mimeType: "image/png",
    buffer: PNG_1X1,
  });
  await expect(modal.locator("#promo-image")).toBeVisible();
  await modal.locator('#promo-form button[type="submit"]').click();
  await expect(modal).toBeHidden();

  await page.locator("#save-btn").click();
  await expect(page.locator("#editor-status")).toHaveText("Sin cambios");

  // Old URL now 404s (R2 object deleted via deleteUploadedFile).
  const oldAfter = await page.request.get(`http://localhost:8787/api/upload/${oldFilename}`);
  expect(oldAfter.status()).toBe(404);
});
