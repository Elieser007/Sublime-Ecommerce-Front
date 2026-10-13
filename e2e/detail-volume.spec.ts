import { test, expect } from "@playwright/test";

// camiseta-gimnasio is a seeded product with volume tiers (1 / 10 / 50 units).
test.describe("Detail Volume UI (D2/D3)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/products/camiseta-gimnasio");
  });

  test("tier list table renders with rows", async ({ page }) => {
    const table = page.locator(".tier-table");
    await expect(table).toBeVisible();
    expect(await table.locator("tbody tr").count()).toBeGreaterThanOrEqual(3);

    // Regression: no inert unregistered custom element tags
    await expect(page.locator("volume-price-selector")).toHaveCount(0);
    await expect(page.locator("price-tier-list")).toHaveCount(0);
  });

  test("quantity stepper is visible and qty change updates price", async ({ page }) => {
    await expect(page.locator("#quantity-stepper-section")).toBeVisible();

    // Page script attaches its listeners on astro:page-load (proves the wa.me link is set)
    await expect(page.locator("#detail-whatsapp")).toHaveAttribute("href", /wa\.me\//);

    const numInput = page.locator("#quantity-stepper-section number-input");
    await expect(numInput).toBeAttached();

    await numInput.evaluate((el) => {
      el.dispatchEvent(
        new CustomEvent("number-input:change", {
          detail: { value: 10 },
          bubbles: true,
        })
      );
    });

    // 10 units qualifies the 10+ tier. The expectation is read from the
    // server-rendered tier table on this same page — SSG HTML baked from the
    // payload at build time — while #detail-price is rewritten at runtime by
    // the page script's number-input:change listener through the
    // astro:page-load wiring (getTierForQuantity tier math). The two values
    // come from different code paths, so this is a cross-path consistency
    // check, not a self-comparison: dead wiring leaves the qty-1 price in
    // place, broken tier math disagrees with the table, and a missing 10+
    // row fails loudly below instead of skipping. No API fetch: the table
    // is static HTML, so this stays runnable against the built artifact
    // with the backend stopped.
    const tier10PriceCell = page.locator('tr[data-tier-row][data-min-qty="10"] .tier-col-price');
    await expect(tier10PriceCell, "the SSG tier table must contain a 10+ row").toHaveCount(1);
    const digitsOnly = (s: string | null) => (s ?? "").replace(/[^0-9]/g, "");
    const expectedTier10 = digitsOnly(await tier10PriceCell.textContent());
    expect(expectedTier10, "the 10+ tier cell must carry a numeric price").toMatch(/^[0-9]+$/);
    console.log(`TIER10 expected digits=${expectedTier10}`);

    const shownPrice = digitsOnly(await page.locator("#detail-price").textContent());
    expect(
      shownPrice,
      `qty 10 must show the SSG 10+ tier price (table=${expectedTier10}, shown=${shownPrice})`
    ).toBe(expectedTier10);
  });
});
