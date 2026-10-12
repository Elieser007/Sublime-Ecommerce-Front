import { test, expect, type Page } from "@playwright/test";

/**
 * Product detail — SPA revisit regression (odd/tasks/product-detail-spa-revisit.md)
 *
 * `<ClientRouter />` runs each inline script once per document session (Astro
 * dedupes by `textContent`), so a build-time payload injected with `is:inline`
 * is never re-applied when the same route is revisited through client-side
 * navigation. The failure is silent: the new product's DOM binds the previous
 * product's data (wrong price, wrong variant graph, wrong item added to the
 * cart) and only a hard reload resets the dedupe set.
 *
 * The spec drives the real user flow — catalog → product A → catalog → product
 * B → catalog → product A — and compares the revisited page against the
 * baseline captured on A's first visit. Every navigation after the initial
 * load must be client-side; `__spaTag` is asserted after each step because a
 * full document load would reset Astro's dedupe set and make the regression
 * invisible (a vacuous pass).
 */

const CATALOG = "/";
const HEADER_CATALOG_LINK = "header a.logo";
const PRICE = "#detail-price";
const NAME = "#detail-name";

interface Card {
  href: string;
  price: string;
}

async function readCatalogCards(page: Page): Promise<Card[]> {
  await page.goto(CATALOG);
  const cards = page.locator("product-card");
  const total = Math.min(await cards.count(), 12);
  const out: Card[] = [];

  for (let i = 0; i < total; i++) {
    const href = await cards.nth(i).locator("a.product-link").getAttribute("href");
    const price = await cards.nth(i).locator(".product-price").textContent();
    if (href && price?.trim()) out.push({ href, price: price.trim() });
  }

  return out;
}

test.describe("Product detail — SPA revisit", () => {
  test("revisited product renders its own price and name", async ({ page }) => {
    const cards = await readCatalogCards(page);
    const first = cards[0];
    const other = cards.find((c) => c.href !== first.href && c.price !== first.price);

    expect(first, "catalog must expose at least one product card").toBeTruthy();
    expect(
      other,
      "catalog must expose two products with different prices for this regression to be meaningful"
    ).toBeTruthy();

    // Baseline: first visit to the product (full load = fresh Astro session).
    await page.goto(first.href);
    await expect(page.locator(PRICE)).toBeVisible();

    const spaTag = `spa-${Date.now()}`;
    await page.evaluate((tag) => {
      (window as { __spaTag?: string }).__spaTag = tag;
    }, spaTag);

    const baseline = {
      name: (await page.locator(NAME).textContent())!.trim(),
      price: (await page.locator(PRICE).textContent())!.trim(),
    };

    /** Click something and require the resulting navigation to be client-side. */
    const spaIsh = async (click: () => Promise<void>, path: string) => {
      await click();
      await page.waitForURL((url) => url.pathname === path);
      expect(
        await page.evaluate(() => (window as { __spaTag?: string }).__spaTag),
        `navigation to ${path} must be client-side, not a full document load`
      ).toBe(spaTag);
    };

    // SPA: A → catalog → B. B's own page proves the pair really differs.
    await spaIsh(() => page.click(HEADER_CATALOG_LINK), "/");
    await spaIsh(
      () => page.click(`product-card a.product-link[href="${other.href}"]`),
      other.href
    );
    await expect(page.locator(PRICE)).not.toHaveText(baseline.price);

    // SPA: B → catalog → A. A's payload was already executed once in this
    // session, so this is the navigation that used to bind B's data.
    await spaIsh(() => page.click(HEADER_CATALOG_LINK), "/");
    await spaIsh(
      () => page.click(`product-card a.product-link[href="${first.href}"]`),
      first.href
    );

    await expect(page.locator(NAME)).toHaveText(baseline.name);
    await expect(page.locator(PRICE)).toHaveText(baseline.price);

    // The stale payload reached the cart too: the revisited page used to add
    // the PREVIOUS product (that is the user-visible damage). Products with
    // options need a selection first, so the cart assertion is scoped to the
    // option-free case.
    const optionFree = (await page.locator("#variant-section variant-selector").count()) === 0;
    if (optionFree) {
      await page.click("#detail-add-cart");
      await expect(page.locator("#detail-add-cart")).toHaveText(/Agregado/i);

      const cart = await page.evaluate<Array<{ name: string }>>(() =>
        JSON.parse(localStorage.getItem("cart") || "[]")
      );
      expect(cart.at(-1)?.name, "the revisited product must be the one added").toBe(baseline.name);
    }
  });
});
