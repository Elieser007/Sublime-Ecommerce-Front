import { test, expect, type Page } from "@playwright/test";

/**
 * Carousel promo revisit — SPA wiring + timer-drain regression
 *
 * `CarouselPromo.astro` registers its wiring through `astro:page-load` (which
 * fires after the DOM swap on every navigation and on the initial load)
 * because `<ClientRouter />` executes each bundled component script at most
 * once per document session. Before the fix the carousel was dead wiring
 * after any client-side navigation back to `/`. The component also drains its
 * previous autoplay timers on every page-load, so no `setInterval` may
 * outlive its page.
 *
 * Autoplay start is idempotent: at most one autoplay interval may exist per
 * carousel in every path. `startAuto()` used to arm a new `setInterval`
 * unconditionally while `timer` tracked only the latest id, so a `mouseleave`
 * following a click (whose handler already restarted autoplay) orphaned the
 * previous loop: two loops ticked in parallel and neither `stopAuto` nor the
 * page-load drain could reach the orphan. The spec exercises that exact path
 * (hover in, click the arrow, hover out) and requires exactly one live
 * carousel-attributed interval.
 *
 * The spec drives the real user flow — catalog → product → catalog — and
 * proves the bottom-wall carousel is live on the revisit (arrow moves the
 * active slide) and that the live-timer ledger did not grow.
 *
 * Fixture: the catalog's bottom wall (`always-catalog-bottom` /
 * `promo-cat-bot`) renders `CarouselPromo` only when the section's
 * `display_type` is `'carousel'` with image promotions. The local database
 * seeds every section as `'tiles'`, so the deterministic fixture lives in
 * the Back repo (`scripts/seed-e2e.ts` carousel fixture: bottom wall set to
 * `'carousel'` plus two fixed-id slides next to the untouched `seed-0383`
 * ribbon = three slides). If that seed did not run, the precondition below
 * fails loudly — never `test.skip`, never a vacuous pass.
 *
 * Non-vacuity proof: flip NEUTER_DRAIN to true to make `clearInterval` a
 * no-op in the test process only (the production component is untouched).
 * The previous page's autoplay timer then survives the round trip and the
 * live-timer assertion fails. It must be false for the committed GREEN run.
 */

const NEUTER_DRAIN = false;

/** Autoplay delay armed by CarouselPromo's startAuto — the ledger's build-agnostic discriminator. */
const AUTOPLAY_MS = 5000;

const CATALOG = "/";
const HEADER_LOGO_LINK = "header a.logo";
const BOTTOM_WALL = '.promotion-wall[data-section="always-catalog-bottom"]';
const CAROUSEL = `${BOTTOM_WALL} .carousel-promo`;
const SLIDE = `${CAROUSEL} .carousel-slide`;
const ACTIVE_SLIDE = `${CAROUSEL} .carousel-slide.active`;
const NEXT_ARROW = `${CAROUSEL} .carousel-arrow--right`;
// Failure converter only, not the settle mechanism: if the router never
// settles, fail loudly here instead of burning the whole test budget.
const SETTLE_CAP_MS = 20_000;

const FIXTURE_MESSAGE =
  "carousel fixture missing: scripts/seed-e2e.ts in Sublime-Ecommerce-Back " +
  "must have run via `pnpm run seed:e2e` (promo-cat-bot must be 'carousel' " +
  "with three active promotions) — never skip, this fails loudly by design";

/**
 * Live-timer ledger: wraps setInterval/clearInterval before any page script
 * runs. Intervals are attributed by their delay — the carousel autoplay is
 * armed as setInterval(next, 5000) — never by bundle names or creation
 * stacks: production chunks are content-hashed (`_astro/…-<hash>.js`), so
 * any name-based discriminator goes blind in prod (and a stack-regex can
 * even match the ledger's own helper frame and overcount every page
 * interval). The delay is stable across builds because it is a runtime
 * argument, not a build artifact.
 *
 * Why this is safe: the carousel autoplay is the only setInterval in the
 * Front source, and nothing else on the catalog page arms a 5000ms loop
 * (the dev toolbar and the Vite client own unrelated intervals with
 * different delays). If a second 5000ms interval ever appeared, the ledger
 * would overcount and the exact-one assertions below would fail loudly —
 * fail-closed, never a vacuous pass.
 */
async function installTimerLedger(page: Page) {
  await page.addInitScript((opts: { neuter: boolean; autoplayMs: number }) => {
    const w = window as unknown as Record<string, unknown>;
    if (w.__carouselLedgerInstalled) return;
    w.__carouselLedgerInstalled = true;
    const liveCarousel = new Set<number>();
    w.__liveCarouselIntervals = liveCarousel;
    const origSet = window.setInterval.bind(window);
    const origClear = window.clearInterval.bind(window);
    window.setInterval = ((callback: TimerHandler, ms?: number) => {
      const id = origSet(callback, ms) as unknown as number;
      if (ms === opts.autoplayMs) liveCarousel.add(id);
      return id;
    }) as typeof setInterval;
    window.clearInterval = ((id?: number) => {
      // Mutation switch for the non-vacuity proof: when neutering, the
      // astro:page-load drain calls this no-op, so the previous page's
      // autoplay timer survives and the ledger grows.
      if (opts.neuter) return;
      liveCarousel.delete(id as number);
      origClear(id);
    }) as typeof clearInterval;
  }, { neuter: NEUTER_DRAIN, autoplayMs: AUTOPLAY_MS });
}

test.describe("Carousel promo revisit — SPA wiring and timer drain", () => {
  test("bottom-wall carousel stays live across an SPA round trip without leaking timers", async ({
    page,
  }) => {
    // Round-trip test against on-demand dev compiles.
    test.slow();

    await installTimerLedger(page);

    // Full load = fresh Astro document session; tag it to prove the rest
    // of the flow stays client-side.
    await page.goto(CATALOG);
    const spaTag = `spa-${Date.now()}`;
    await page.evaluate((tag) => {
      (window as { __spaTag?: string }).__spaTag = tag;
    }, spaTag);
    const spaTagOf = () => page.evaluate(() => (window as { __spaTag?: string }).__spaTag);
    const liveCarouselTimers = () =>
      page.evaluate(
        () => ((window as { __liveCarouselIntervals?: Set<number> }).__liveCarouselIntervals?.size ?? -1)
      );

    /**
     * Click something and require the resulting navigation to be client-side
     * AND fully settled before returning (same mechanism as
     * spa-wiring-revisit.spec.ts): a one-shot `astro:page-load` listener
     * registered on the persistent document BEFORE the click, awaited after
     * `waitForURL`.
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

    /**
     * DOM-level click on the next arrow (no pointer movement). The revisit
     * leg needs no hover coverage — the first visit already exercises the
     * mouseenter/mouseleave path — and moving the pointer after the last
     * click would add hover noise around the final ledger read. The wiring
     * under test is identical either way: with dead wiring no handler is
     * attached and the active slide never moves.
     */
    const clickNextArrow = () =>
      page.locator(NEXT_ARROW).evaluate((el) => (el as HTMLElement).click());

    // Fixture precondition, loud: the bottom wall must render the carousel
    // with its three slides (two fixed-id slides + untouched seed-0383).
    await expect(page.locator(CAROUSEL), FIXTURE_MESSAGE).toHaveCount(1);
    await expect(page.locator(SLIDE), FIXTURE_MESSAGE).toHaveCount(3);
    const initBefore = await page.locator(CAROUSEL).getAttribute("data-carousel-init");
    expect(initBefore, `${FIXTURE_MESSAGE} (data-carousel-init must be "true")`).toBe("true");

    // Live on the first visit: the next arrow moves the active slide.
    const activeIndex = () => page.locator(ACTIVE_SLIDE).getAttribute("data-index");
    const firstBefore = await activeIndex();
    expect(firstBefore, "carousel must render an active slide").not.toBeNull();
    // Within-page double-start regression: hover in (mouseenter), click the
    // arrow (its handler restarts autoplay), hover out (mouseleave runs
    // startAuto again). The three events are dispatched synthetically in one
    // evaluate: a real-pointer choreography (hover/click/mouse-move) proved
    // flaky here — scroll-induced enter/leave flapping around the CDP input
    // changes the handler sequence run to run — while the defect under test
    // is purely the startAuto/stopAuto logic, which the synthetic sequence
    // exercises exactly. Exactly one autoplay loop may be alive afterwards.
    await page.locator(CAROUSEL).evaluate((container) => {
      container.dispatchEvent(new Event("mouseenter"));
      (container.querySelector(".carousel-arrow--right") as HTMLElement).click();
      container.dispatchEvent(new Event("mouseleave"));
    });
    await expect
      .poll(activeIndex, "clicking the next arrow must move the active slide")
      .not.toBe(firstBefore);
    const liveBefore = await liveCarouselTimers();
    expect(
      liveBefore,
      `at most one autoplay interval may exist per carousel ` +
        `(hover in + arrow click + hover out must not orphan the previous loop)`
    ).toBe(1);

    // SPA round trip: catalog → product → catalog.
    const href = await page
      .locator('product-card a.product-link[href^="/products/"]')
      .first()
      .getAttribute("href");
    expect(href, "catalog must expose a product card for this regression to be meaningful").toBeTruthy();
    await spaGo(() => page.click(`product-card a.product-link[href="${href}"]`), href!);
    await expect(page.locator("#detail-name")).toBeVisible();
    expect(await spaTagOf(), "product page must still be the SPA session").toBe(spaTag);
    await spaGo(() => page.click(HEADER_LOGO_LINK), "/");

    // On the revisit the carousel is present, init-flagged exactly as
    // before, and the arrows move the active slide again (pre-fix this was
    // dead wiring).
    await expect(page.locator(CAROUSEL), "carousel must be present after the SPA round trip").toBeVisible();
    expect(
      await page.locator(CAROUSEL).getAttribute("data-carousel-init"),
      "data-carousel-init must be set exactly as before the round trip"
    ).toBe(initBefore);
    await expect(page.locator(SLIDE), "carousel must still hold its three slides").toHaveCount(3);
    expect(await spaTagOf(), "revisited catalog must still be the SPA session").toBe(spaTag);

    const revisitBefore = await activeIndex();
    await clickNextArrow();
    await expect
      .poll(
        activeIndex,
        "after the SPA round trip the carousel wiring must be live again (pre-fix this was dead)"
      )
      .not.toBe(revisitBefore);

    // No timer leak: the page-load drain must have stopped the previous
    // page's autoplay timers, and autoplay start is idempotent, so exactly
    // one carousel-attributed interval is alive after the revisit.
    // Deterministic: no fixed sleeps, only the settled SPA navigations above.
    const liveAfter = await liveCarouselTimers();
    expect(
      liveAfter,
      `SPA round trip must leave exactly one carousel autoplay timer ` +
        `(live carousel intervals before=${liveBefore} after=${liveAfter}; ` +
        `the astro:page-load drain must stop the previous page's timers and startAuto must not stack)`
    ).toBe(1);
  });
});
