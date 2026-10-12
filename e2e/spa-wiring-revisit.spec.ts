import { test, expect, type Page } from "@playwright/test";

/**
 * SPA wiring revisit — gallery re-arm regression
 *
 * `<ClientRouter />` executes each bundled component script at most once per
 * document session (Astro dedupes by script `src`), so `ProductGallery.astro`'s
 * module-scope DOM wiring runs on the first product page of the session and
 * never again: catalog → product A → back → product B leaves product B's
 * gallery dead. The fix registers the wiring through `astro:page-load`, which
 * fires after the DOM swap on every navigation (and on the initial load).
 *
 * The spec drives the real user flow — catalog → gallery product A → catalog
 * → DIFFERENT multi-image product B — and proves the gallery is live on B
 * (thumbnail switch + counter + lightbox). Product A only has to render
 * `[data-gallery]`: its visit is what puts the gallery bundle in Astro's
 * session dedupe set (one stable bundle URL serves every product page), so a
 * single-image gallery suffices to arm the bug; only B carries the strict
 * multi-image preconditions. Every navigation after the initial load must be
 * client-side; `__spaTag` is asserted after each step because a full document
 * load would re-evaluate the module scripts and make the regression invisible
 * (a vacuous pass).
 *
 * Cost honesty: the scan legitimately navigates several routes against the
 * on-demand dev server (observed ~43s isolated), so the test is marked
 * `test.slow()` (90s budget) instead of leaving it hostage to the 30s
 * default. Assertions are not weakened to buy time.
 */

const CATALOG = "/";
const HEADER_LOGO_LINK = "header a.logo";
const GALLERY = "[data-gallery]";
const THUMB = "[data-gallery] [data-thumb-id]";
const MAIN_IMAGE = "[data-main-image]";
const COUNTER = "[data-counter]";
const FULLSCREEN_BTN = '[data-action="fullscreen"]';
const LIGHTBOX = "[data-lightbox]";
const LIGHTBOX_CLOSE = '[data-action="lightbox-close"]';
// Failure converter only, not the settle mechanism: if the router never
// settles, fail loudly here instead of burning the whole test budget.
const SETTLE_CAP_MS = 20_000;

async function readCatalogHrefs(page: Page): Promise<string[]> {
  await page.goto(CATALOG);
  const links = page.locator('product-card a.product-link[href^="/products/"]');
  const total = await links.count();
  const out: string[] = [];
  for (let i = 0; i < total; i++) {
    const href = await links.nth(i).getAttribute("href");
    if (href && !out.includes(href)) out.push(href);
  }
  return out;
}

test.describe("SPA wiring revisit — gallery re-arms after navigation", () => {
  test("second multi-image product keeps a live gallery after SPA revisits", async ({
    page,
  }) => {
    // Scanning test: several SPA round-trips against on-demand dev compiles.
    test.slow();

    const hrefs = await readCatalogHrefs(page);
    expect(hrefs.length, "catalog must expose at least one product card").toBeGreaterThan(0);

    // Full load = fresh Astro document session; tag it to prove the rest
    // of the flow stays client-side.
    await page.goto(CATALOG);
    const spaTag = `spa-${Date.now()}`;
    await page.evaluate((tag) => {
      (window as { __spaTag?: string }).__spaTag = tag;
    }, spaTag);
    const spaTagOf = () => page.evaluate(() => (window as { __spaTag?: string }).__spaTag);

    /**
     * Click something and require the resulting navigation to be client-side
     * AND fully settled before returning.
     *
     * Idle mechanism: a one-shot `astro:page-load` listener registered on the
     * persistent document BEFORE the click, awaited after `waitForURL`.
     * `router.js` runs `runScripts()` then `onPageLoad()` in
     * `updateCallbackDone.finally`, so that event fires only once the swap,
     * the component scripts, and the per-load handlers all completed — the
     * router is idle for our purposes. Waiting on the URL alone is not
     * enough: the previous arrival's transition (dev on-demand compile) may
     * still be in flight, and clicking mid-transition is dropped, surfacing
     * only as a `waitForURL` timeout. The `data-astro-transition` root
     * attribute was rejected as the signal instead: it is cleared on
     * `viewTransition.finished`, whose ordering against `updateCallbackDone`
     * differs between the native and fallback transition paths.
     */
    const spaGo = async (click: () => Promise<void>, path: string) => {
      const settled = page.evaluate(
        () =>
          new Promise<boolean>((resolve) => {
            document.addEventListener("astro:page-load", () => resolve(true), { once: true });
          })
      );
      await click();
      await page.waitForURL((url) => url.pathname === path);
      // A full document load destroys the evaluate context instead of
      // resolving: the SPA assertion below then fails with the client-side
      // message, never a vacuous pass.
      const sawPageLoad = await Promise.race([
        settled.catch(() => false),
        page.waitForTimeout(SETTLE_CAP_MS).then(() => false),
      ]);
      expect(
        await spaTagOf(),
        `navigation to ${path} must be client-side, not a full document load`
      ).toBe(spaTag);
      expect(
        sawPageLoad,
        `navigation to ${path} never settled (no astro:page-load after the swap)`
      ).toBe(true);
    };
    const spaToProduct = (href: string) =>
      spaGo(() => page.click(`product-card a.product-link[href="${href}"]`), href);
    const spaToCatalog = () => spaGo(() => page.click(HEADER_LOGO_LINK), "/");

    const thumbCountOnPage = () => page.locator(THUMB).count();

    // Product A: first catalog product rendering [data-gallery]. No thumbnail
    // strip required — this visit only has to load the gallery bundle into
    // the session dedupe set.
    let firstHref: string | null = null;
    let firstMainSrc: string | null = null;
    for (const href of hrefs) {
      await spaToProduct(href);
      // Every product page renders #detail-name; imageless products render
      // a plain <img> instead of the gallery and arm nothing.
      await expect(page.locator("#detail-name")).toBeVisible();
      if ((await page.locator(GALLERY).count()) === 0) {
        await spaToCatalog();
        continue;
      }
      await expect(page.locator(MAIN_IMAGE)).toBeVisible();
      firstHref = href;
      firstMainSrc = await page.locator(MAIN_IMAGE).getAttribute("src");
      break;
    }
    expect(
      firstHref,
      "catalog must expose a product rendering [data-gallery] for this regression to be meaningful"
    ).toBeTruthy();

    // SPA back to the catalog, then to a DIFFERENT multi-image product whose
    // main image differs from the first product's.
    await spaToCatalog();

    let secondHref: string | null = null;
    for (const href of hrefs) {
      if (href === firstHref) continue;
      await spaToProduct(href);
      await expect(page.locator("#detail-name")).toBeVisible();
      if ((await thumbCountOnPage()) <= 1) {
        await spaToCatalog();
        continue;
      }
      const mainSrc = await page.locator(MAIN_IMAGE).getAttribute("src");
      if (mainSrc === firstMainSrc) {
        await spaToCatalog();
        continue;
      }
      secondHref = href;
      break;
    }
    expect(
      secondHref,
      "catalog must expose a second multi-image product with a different main image for this regression to be meaningful"
    ).toBeTruthy();
    expect(await spaTagOf(), "final product page must still be the SPA session").toBe(spaTag);

    // The exact contract: after an SPA revisit the gallery wiring is re-armed.
    const main = page.locator(MAIN_IMAGE);
    const mainBefore = await main.getAttribute("src");
    const counterBefore = await page.locator(COUNTER).textContent();
    const liveThumb = page.locator(`${THUMB}:not(.gallery-thumb--active)`).first();
    await expect(liveThumb, "second product must expose a non-active thumbnail").toBeVisible();
    const targetSrc = await liveThumb.locator("img").getAttribute("src");
    expect(targetSrc, "thumbnails must carry an image src").toBeTruthy();

    await liveThumb.click();
    await expect(main, "clicking a thumbnail must swap the main image").toHaveAttribute(
      "src",
      targetSrc!
    );
    expect(await main.getAttribute("src"), "main image src must change").not.toBe(mainBefore);
    await expect(
      page.locator(COUNTER),
      "thumbnail switch must update the counter"
    ).not.toHaveText(counterBefore ?? "");

    await page.locator(FULLSCREEN_BTN).click();
    await expect(page.locator(LIGHTBOX), "lightbox must open").toBeVisible();
    await page.locator(LIGHTBOX_CLOSE).click();
    await expect(page.locator(LIGHTBOX), "lightbox must close").toBeHidden();

    expect(await page.locator(GALLERY).count(), "gallery must still be present").toBeGreaterThan(0);
  });
});
