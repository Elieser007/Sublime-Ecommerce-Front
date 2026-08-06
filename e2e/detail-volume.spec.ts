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

    // 10 units qualifies the 10+ tier
    await expect(page.locator("#detail-price")).toContainText("117.000");
  });
});
