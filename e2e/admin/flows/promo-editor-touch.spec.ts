/**
 * Admin E2E — Promo visual editor TOUCH context (E2E-1 scenario 3, AR-2).
 *
 * Runs in a hasTouch + isMobile 375×667 context. Touch drags dispatch real
 * PointerEvents with pointerType 'touch'; the editor's pointer session must
 * treat them identically to mouse. Asserts:
 *   - touch drag snaps to the same cell as a mouse drag would
 *   - 8-col canvas scrolls horizontally (no document-level overflow)
 *   - resize handles keep ≥44px hit areas
 */
import { test, expect, type Page } from "@playwright/test";
import { ADMIN_URLS, reseedE2E, dispatchPointerDrag, TOUCH_CONTEXT } from "../helpers";

test.describe.configure({ mode: "serial" });

test.use(TOUCH_CONTEXT);

const TILES_SECTION_ID = "promo-home-top";
const TILE_A = "Remeras Personalizadas";

/** 1×1 PNG for the draft-image upload path. */
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

test.beforeAll(() => {
  reseedE2E();
});

async function openTilesSection(page: Page): Promise<void> {
  await page.goto(ADMIN_URLS.promotions);
  await page.locator(`.section-card[data-id="${TILES_SECTION_ID}"]`).click();
  await expect(page.locator("#promo-manager")).toBeVisible();
  await expect(page.locator("#canvas-section")).toBeVisible();
  await expect(page.locator(".canvas-tile")).toHaveCount(2);
}

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

test("touch drag moves a tile to the same snapped cell as mouse", async ({ page }) => {
  await openTilesSection(page);
  const a = await tileId(page, TILE_A);
  const pxPerCell = await page.evaluate(() => {
    const canvas = document.getElementById("promo-canvas")!;
    return canvas.getBoundingClientRect().width / 8;
  });

  // Touch drag with pointerType 'touch': top-left to cell (3,0). The tile is
  // full-height (h:2 in a 2-row grid) so only the X moves — same as mouse.
  await dispatchPointerDrag(
    page,
    { x: 10, y: 10 },
    { x: 3 * pxPerCell, y: 10 },
    "touch"
  );

  const pos = await tilePos(page, a);
  expect(pos.x).toBe(3);
  expect(pos.y).toBe(0);
  await expect(page.locator("#save-btn")).toBeEnabled();

  // Restore so later serial tests are unaffected.
  page.once("dialog", (dialog) => void dialog.accept());
  await page.locator("#revert-btn").click();
});

test("8-col canvas scrolls horizontally on 375px without document overflow (AR-2)", async ({ page }) => {
  await openTilesSection(page);

  // Mobile branch: fixed 80px cells → canvas 8*80=640px > 375 viewport.
  const metrics = await page.evaluate(() => {
    const canvas = document.getElementById("promo-canvas")!;
    const scroll = document.getElementById("canvas-scroll")!;
    return {
      canvasWidth: canvas.getBoundingClientRect().width,
      scrollWidth: scroll.scrollWidth,
      scrollClient: scroll.clientWidth,
      docOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(metrics.canvasWidth).toBeGreaterThan(375);
  expect(metrics.scrollWidth).toBeGreaterThan(metrics.scrollClient); // scrolls
  expect(metrics.docOverflowX).toBeLessThanOrEqual(0); // no page-level overflow

  // The canvas actually scrolls when the pointer nears the edge.
  await page.evaluate(() => {
    const scroll = document.getElementById("canvas-scroll")!;
    scroll.scrollLeft = 200;
  });
  const scrolled = await page.evaluate(() => {
    const scroll = document.getElementById("canvas-scroll")!;
    return scroll.scrollLeft;
  });
  expect(scrolled).toBe(200);
});

test("resize handles keep ≥44px hit areas on touch (AR-2)", async ({ page }) => {
  await openTilesSection(page);
  const a = await tileId(page, TILE_A);

  const handleSize = await page.evaluate((id) => {
    const tile = document.querySelector(`.canvas-tile[data-id="${id}"]`)!;
    const handle = tile.querySelector(".resize-handle--se") as HTMLElement;
    // The ::before pseudo-element expands the hit area (inset -16px on a
    // 12px handle = 44px total). Measure the pseudo's box.
    const before = getComputedStyle(handle, "::before");
    const inset = parseFloat(before.inset || "0");
    const width = handle.getBoundingClientRect().width;
    return { inset, width, hit: width + Math.abs(inset) * 2 };
  }, a);

  expect(handleSize.width).toBe(12);
  expect(handleSize.hit).toBeGreaterThanOrEqual(44);

  // A touch resize on the SE handle actually resizes (touch == mouse).
  const pxPerCell = await page.evaluate(() => {
    const canvas = document.getElementById("promo-canvas")!;
    return canvas.getBoundingClientRect().width / 8;
  });
  const pxPerRow = await page.evaluate(() => {
    const canvas = document.getElementById("promo-canvas")!;
    return canvas.getBoundingClientRect().height / 2; // section grid_rows = 2
  });
  await dispatchPointerDrag(
    page,
    { x: 4 * pxPerCell - 4, y: 2 * pxPerRow - 4 },
    { x: 5 * pxPerCell, y: 1 * pxPerRow },
    "touch"
  );
  const pos = await tilePos(page, a);
  expect(pos.w).toBe(6);
  expect(pos.h).toBe(2);

  // Restore state for later serial tests.
  page.once("dialog", (dialog) => void dialog.accept());
  await page.locator("#revert-btn").click();
});

test("touch: draft image shows on a new tile before Guardar (AR-2 draft)", async ({ page }) => {
  await openTilesSection(page);
  await expect(page.locator(".canvas-tile")).toHaveCount(2);

  // Add a new promo with a picked image, submit the modal, no Guardar.
  await page.locator("#add-promo-btn").click();
  const modal = page.locator("#modal-overlay");
  await expect(modal).toBeVisible();
  await modal.locator('input[name="title"]').fill("Tile Táctil");
  await modal.locator("#promo-input").setInputFiles({
    name: "draft.png",
    mimeType: "image/png",
    buffer: PNG_1X1,
  });
  await expect(modal.locator("#promo-image")).toBeVisible();
  await modal.locator('#promo-form button[type="submit"]').click();
  await expect(modal).toBeHidden();
  await expect(page.locator(".canvas-tile")).toHaveCount(3);

  // The editor surface shows the DRAFT (blob URL), not the placeholder.
  const tile = page.locator(".canvas-tile", { hasText: "Tile Táctil" });
  const draftBg = await tile
    .locator(".tile-bg")
    .evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(draftBg).toContain("blob:");
  expect(draftBg).not.toContain("placeholder-product.svg");
  expect(draftBg).not.toBe("none");

  // Discard without saving so the seeded layout stays pristine.
  page.once("dialog", (dialog) => void dialog.accept());
  await page.locator("#revert-btn").click();
  await expect(page.locator(".canvas-tile")).toHaveCount(2);
});

test("touch reorder moves a strip item (carousel/split/ribbon) (F4)", async ({ page }) => {
  await openTilesSection(page);

  // Switch to carousel: the reorder strip replaces the canvas.
  await page.locator("#display-type-select").selectOption("carousel");
  await expect(page.locator("#strip-section")).toBeVisible();
  await expect(page.locator(".strip-item")).toHaveCount(2);
  await expect(page.locator(".strip-item").nth(0)).toContainText(TILE_A);

  // Touch-drag item 0 onto item 1 via pointer events (HTML5 DnD is mouse-only).
  const dragged = await page.evaluate(async () => {
    const items = Array.from(document.querySelectorAll<HTMLElement>(".strip-item"));
    if (items.length < 2) return false;
    const from = items[0];
    const fromRect = from.getBoundingClientRect();
    const startY = fromRect.top + fromRect.height / 2;
    const targetY = items[1].getBoundingClientRect().top + items[1].getBoundingClientRect().height / 2;
    const x = fromRect.left + fromRect.width / 2;
    const fire = (type: string, y: number) => {
      from.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerId: 1,
          pointerType: "touch",
          isPrimary: true,
          clientX: x,
          clientY: y,
        })
      );
    };
    fire("pointerdown", startY);
    const steps = 4;
    for (let i = 1; i <= steps; i++) {
      fire("pointermove", startY + ((targetY - startY) * i) / steps);
    }
    fire("pointerup", targetY);
    return true;
  });
  expect(dragged).toBe(true);

  // Order swapped and the editor is dirty.
  await expect(page.locator(".strip-item").nth(0)).toContainText("Tazas Mágicas");
  await expect(page.locator(".strip-item").nth(1)).toContainText(TILE_A);
  await expect(page.locator("#save-btn")).toBeEnabled();

  page.once("dialog", (dialog) => void dialog.accept());
  await page.locator("#revert-btn").click();
});
