/**
 * Admin E2E — SPA revisit wiring (ClientRouter regression).
 *
 * `<ClientRouter />` executes each bundled component `<script>` at most once
 * per document session (Astro dedupes by script `src`), while sidebar
 * navigation between admin routes is a client-side swap. Module-scope DOM
 * wiring is therefore dead on the second client-side visit of an admin
 * route: the attribute-manager trigger silently does nothing, the
 * section→category cascade never loads, and the upload area never fires.
 *
 * The spec drives the real user flow — full load → open → close →
 * SPA away → SPA back → open again — and proves the wiring is live after
 * the revisit. Every navigation after the initial load must be client-side;
 * `__spaTag` is asserted after each step because a full document load would
 * re-evaluate the module scripts and make the regression invisible (a
 * vacuous pass). The `spaGo` helper is copied from
 * `e2e/spa-wiring-revisit.spec.ts`: a one-shot `astro:page-load` listener
 * registered BEFORE the click, awaited after `waitForURL` — clicking
 * mid-transition gets dropped and surfaces only as a timeout.
 *
 * App-side race note (out of scope, not worked around in components): the
 * row trigger shows the overlay synchronously AND queues an async
 * `loadModules().then(openModal)` re-show via the `open-attributes` event
 * (see `openAttributeManager` in `src/pages/admin/products.astro`), so a
 * close landing between the two re-opens the modal. The open/close helpers
 * therefore settle on the modules response the chain awaits, never on a
 * fixed delay.
 */

import { test, expect, type Page } from "@playwright/test";
import { ADMIN_URLS } from "../helpers";

test.describe.configure({ mode: "serial" });

// Failure converter only, not the settle mechanism: if the router never
// settles, fail loudly here instead of burning the whole test budget.
const SETTLE_CAP_MS = 20_000;

/**
 * Click something and require the resulting navigation to be client-side
 * AND fully settled before returning. See e2e/spa-wiring-revisit.spec.ts
 * for the mechanism rationale.
 */
async function spaGo(page: Page, click: () => Promise<void>, path: string, spaTag: string) {
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
    await page.evaluate(() => (window as { __spaTag?: string }).__spaTag),
    `navigation to ${path} must be client-side, not a full document load`
  ).toBe(spaTag);
  expect(
    sawPageLoad,
    `navigation to ${path} never settled (no astro:page-load after the swap)`
  ).toBe(true);
}

test.describe("SPA revisit — admin wiring re-arms after navigation", () => {
  test("attribute manager re-opens after an SPA away-and-back", async ({ page }) => {
    // Multi-leg SPA flow against on-demand dev compiles.
    test.slow();

    // Full load = fresh Astro document session; tag it to prove the rest
    // of the flow stays client-side.
    await page.goto(ADMIN_URLS.products);
    // Wait for a DATA row, not just any <tr>: the table renders its
    // "No hay productos" empty-state row immediately, so a bare
    // `tbody tr` wait passes vacuously before the list fetch resolves.
    // A row carrying the Atributos action proves loadProducts() landed
    // (the seeded catalog is never empty). Poll-based, resolves in ~1s
    // when healthy — the 20s cap only rides through a slow dev compile.
    await expect(
      page.locator("tbody tr", { has: page.getByTitle("Atributos") }).first(),
      "product list must load a data row"
    ).toBeVisible({ timeout: 20_000 });
    const spaTag = `spa-${Date.now()}`;
    await page.evaluate((tag) => {
      (window as { __spaTag?: string }).__spaTag = tag;
    }, spaTag);

    // Open the attribute manager through the real row trigger (the 🏷️
    // "Atributos" button), not window.openAttributeManager.
    //
    // No timing assumptions: the trigger shows the overlay synchronously
    // but the re-show (`openModal`) only runs after GET
    // /api/admin/attributes/modules resolves, so closing before that
    // response lands is defeated by the re-show. The waitForResponse below
    // is pre-registered BEFORE the click (it must belong to this open's
    // loadModules() chain) and is the deterministic settle signal — once it
    // lands, openModal has run and the modal state is final. Bounded so a
    // stalled backend fails fast with a clear message instead of burning
    // the whole test budget (a lost request yields no response at all).
    const MODULES_SETTLE_MS = 20_000;
    const openAttributesViaRow = async () => {
      const trigger = page.locator("tbody tr").first().getByTitle("Atributos");
      await expect(trigger, "product row must expose the Atributos trigger").toBeVisible();
      const modulesSettled = page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/admin/attributes/modules") &&
          resp.request().method() === "GET",
        { timeout: MODULES_SETTLE_MS }
      );
      await trigger.click();
      // Sync half of the trigger chain (products.astro shows the overlay
      // directly): immediate, needs no backend — if THIS fails the click
      // wiring itself is broken. Kept separate from the settle below so a
      // backend stall can never masquerade as a wiring failure.
      const overlay = page.locator("#attr-overlay");
      await expect(overlay, "attribute manager must open").toBeVisible();
      await modulesSettled;
      // Async half (loadModules().then(openModal) re-show) has now run, so
      // the modal state is final and the close below cannot race it.
      await expect(overlay, "attribute manager must be stable after its module load").toBeVisible();
    };
    const closeAttributes = async () => {
      const overlay = page.locator("#attr-overlay");
      await page.locator("#attr-modal-cancel").click();
      await expect(overlay, "attribute manager must close").toBeHidden();
      // The close must stick: a single toBeHidden() can pass in the gap
      // before an async re-show, so guard across a bounded window and fail
      // if the overlay ever comes back. Fallback guard only — the response
      // settle in openAttributesViaRow is what removes the race.
      const guardUntil = Date.now() + 2_000;
      while (Date.now() < guardUntil) {
        expect(
          await overlay.isVisible(),
          "attribute manager must stay closed (async re-show defeated the close)"
        ).toBe(false);
        await page.waitForTimeout(100);
      }
    };

    await openAttributesViaRow();
    await closeAttributes();

    // SPA away through a sidebar link, then SPA back to /admin/products.
    await spaGo(
      page,
      () => page.click('.sidebar-link[data-section="dashboard"]'),
      "/dashboard",
      spaTag
    );
    await spaGo(
      page,
      () => page.click('.sidebar-link[data-section="products"]'),
      ADMIN_URLS.products,
      spaTag
    );
    // Same data-row gate: require a row with actions, never the
    // empty-state row, before driving the post-revisit open.
    await expect(
      page.locator("tbody tr", { has: page.getByTitle("Atributos") }).first(),
      "product list must reload a data row after the SPA revisit"
    ).toBeVisible({ timeout: 20_000 });

    // The exact contract: after an SPA revisit the same trigger must open
    // the modal again (pre-fix this second open silently does nothing).
    await openAttributesViaRow();
    await closeAttributes();
  });

  test("product form cascade and uploader stay live after an SPA revisit of /admin/new", async ({
    page,
  }) => {
    // Multi-leg SPA flow against on-demand dev compiles.
    test.slow();

    // Full load on /admin/products = fresh Astro document session. There is
    // no in-app link from /admin/products to /admin/new, so the route goes
    // through the sidebar first (dashboard) and then the dashboard
    // "+ Nuevo Producto" card — every leg a client-side swap, never a goto.
    await page.goto(ADMIN_URLS.products);
    // Same data-row gate as the attribute test: the bare `tbody tr`
    // matches the empty-state row, so require a row with actions.
    await expect(
      page.locator("tbody tr", { has: page.getByTitle("Atributos") }).first(),
      "product list must load a data row"
    ).toBeVisible({ timeout: 20_000 });
    const spaTag = `spa-${Date.now()}`;
    await page.evaluate((tag) => {
      (window as { __spaTag?: string }).__spaTag = tag;
    }, spaTag);

    const goToNewViaDashboard = async () => {
      await spaGo(
        page,
        () => page.click('.sidebar-link[data-section="dashboard"]'),
        "/dashboard",
        spaTag
      );
      await expect(page.locator("#dashboard-content")).toBeVisible();
      await spaGo(
        page,
        () => page.click('.action-card[href="/admin/new"]'),
        ADMIN_URLS.productCreate,
        spaTag
      );
    };

    // First SPA arrival arms the bundles; leave and come back so the
    // arrival under test is the SECOND client-side visit.
    await goToNewViaDashboard();
    await expect(page.locator("#section-select")).toBeVisible();
    await goToNewViaDashboard();

    // AdminProductForm: the section→category cascade must still be wired.
    // loadDependencies populates #section-select from /api/sections; picking
    // a section must replace the "Seleccionar sección primero" placeholder
    // in #category-select (pre-fix both selects keep their SSR placeholders
    // because the wiring points at the first visit's detached nodes).
    const section = page.locator("#section-select");
    await expect(section).toBeVisible();
    await expect
      .poll(async () => section.locator("option").count(), {
        message: "sections must load into #section-select after the SPA revisit",
        timeout: 15_000,
      })
      .toBeGreaterThan(1);
    await section.selectOption({ index: 1 });
    await expect(page.locator("#category-select")).not.toContainText(
      "Seleccionar sección primero"
    );

    // ImageUploader: a programmatic click on #upload-area must trigger the
    // file input (pre-fix the click handler is bound to the first visit's
    // detached area, so no file chooser ever opens). The click goes through
    // evaluate so it lands on the area itself rather than the covering
    // input — a native input click would open the chooser with or without
    // the wiring and prove nothing.
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.evaluate(() => document.getElementById("upload-area")!.click()),
    ]);
    expect(chooser, "clicking #upload-area must trigger the file input").toBeTruthy();
  });
});
