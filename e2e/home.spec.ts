import { test, expect } from "@playwright/test";

/**
 * Home featured grid guard (odd/tasks/product-detail-spa-revisit.md)
 *
 * /home renders its featured products as `<product-card product="…">`, and the
 * Web Component reads that attribute in connectedCallback. This spec exists
 * because the page used to carry a dead `is:inline` helper that assigned
 * `el.product` — the same "inline script owns per-page data" shape that the
 * ClientRouter dedupe broke on the product detail page. The card contract is
 * the attribute, so it must keep working without any page-level script.
 */

test.describe("Home featured products", () => {
  test("featured cards render from their attribute and open the variant modal", async ({
    page,
  }) => {
    await page.goto("/home");

    const cards = page.locator("product-card");
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(0);

    // Rendered from the `product` attribute (not from a page-init script)
    await expect(cards.first().locator(".product-name")).toHaveText(/\S/);
    await expect(cards.first().locator(".product-price")).toHaveText(/Gs\./);

    await cards.first().locator(".product-add-btn").click();
    await expect(page.locator("variant-modal .overlay")).toBeVisible();
  });
});
