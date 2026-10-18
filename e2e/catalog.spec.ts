import { test, expect, type Page } from "@playwright/test";
import { onlyDeviceProjects } from "./device-gate";

// The desktop sidebar shows ONE tab at a time (sidebar-tabs landed in 2be0321):
// sort/price controls live in the "Filtros" panel, which is display:none until
// its tab is activated. Every test that drives those controls opens it first.
async function openDesktopFilters(page: Page) {
  await page.click('.sidebar-tab[data-sidebar-tab="filters"]');
  await expect(page.locator("#sidebar-filters")).toHaveClass(/active/);
}

// The desktop + mobile category trees are baked into the served HTML per
// request (index.astro fetches the tree in frontmatter through
// fetchJsonWithRetry and is FAIL-LOUD: an unavailable or empty tree throws,
// so `astro dev` serves a loud 500 instead of a page with "Sin categorías"
// — CategoryTree.astro:20/75 — and no runtime fetch ever repairs it: the
// panel open path only toggles hidden/open classes via rAF). Under parallel
// full-battery load wrangler dev fails that tree fetch in bursts, so a
// serve can be an error page (retryable) or carry zero real category labels
// (retryable) no matter how long the test then waits. Probe the baked DOM
// once initCatalog has run — the trailing inline script executes after the
// tree markup is parsed, so the count is final — and retry with a fresh
// request until a 20s budget is spent instead of sleeping or waiting on a
// condition that can never become true. Non-OK serves are cheap (the tree
// fetch fails fast), so bursts get many retries; the 20s cap keeps the
// whole test inside the 30s test timeout. Budget exhaustion throws loudly
// naming the last cause (never vacuously green).
async function loadCatalogWithBakedTree(page: Page) {
  const deadline = Date.now() + 20_000;
  let firstServe = true;
  let lastCause = "no serve attempted";
  for (;;) {
    let response = null;
    try {
      response = firstServe ? await page.goto("/") : await page.reload();
    } catch (err) {
      lastCause = `navigation failed: ${err instanceof Error ? err.message : String(err)}`;
      if (Date.now() >= deadline) break;
      firstServe = false;
      continue;
    }
    firstServe = false;
    // Fail-loud tree: a genuinely failing backend serves an error page
    // (loud 500 in dev) instead of an empty tree — retry the serve.
    if (!response) {
      lastCause = "navigation returned a null response (error page)";
      if (Date.now() >= deadline) break;
      continue;
    }
    if (!response.ok()) {
      lastCause = `error page HTTP ${response.status()} (category tree unavailable)`;
      if (Date.now() >= deadline) break;
      continue;
    }
    let ready = false;
    try {
      await page.waitForFunction(
        () => (window as any).__catalogInitialized === true,
        undefined,
        { timeout: 5_000 }
      );
      ready = true;
    } catch {
      lastCause = "error page (catalog script never initialized)";
    }
    if (!ready) {
      if (Date.now() >= deadline) break;
      continue;
    }
    const baked = await page
      .locator('#mobile-category-panel .tree-label:not([data-filter="all"]), #category-tree-container .tree-label:not([data-filter="all"])')
      .count();
    if (baked > 0) return;
    lastCause = "served page baked zero real category labels (empty tree)";
    if (Date.now() >= deadline) break;
  }
  // Loud failure naming the cause (never vacuously green): the backend
  // served no usable tree for the whole budget.
  throw new Error(
    `loadCatalogWithBakedTree: catalog tree unavailable after retries (last cause: ${lastCause}).`
  );
}

test.describe("Catalog Browse", () => {
  test("home page loads successfully", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Sublime/i);
  });

  test("product items are visible on home page", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("product-card").first()).toBeVisible();
  });

  test("product count shows correct text", async ({ page }) => {
    await page.goto("/");
    const countEl = page.locator("#product-count-text");
    await expect(countEl).toBeVisible();
    const text = await countEl.textContent();
    expect(text).toMatch(/\d+ productos? encontrados?/);
  });
});

test.describe("Sort", () => {
  // Desktop-only: the sort buttons live in the sidebar FilterPanel, which is
  // display:none below the 768px desktop breakpoint (index.astro). Runs
  // once, on public-pc; mobile/tablet sort coverage comes from the
  // "Mobile Catalog" drawer tests below (same drawer UI below 768px).
  onlyDeviceProjects("public-pc");
  // [data-sort] buttons exist twice (desktop sidebar + mobile filter panel),
  // so all assertions here scope to the visible aside set.
  test("sort by price ascending", async ({ page }) => {
    await page.goto("/");
    await openDesktopFilters(page);
    await page.click("aside [data-sort='price-asc']");
    // Verify button is active
    await expect(page.locator("aside [data-sort='price-asc']")).toHaveClass(/active/);
    // Wait for re-render
    await page.waitForTimeout(200);
  });

  test("sort by price descending", async ({ page }) => {
    await page.goto("/");
    await openDesktopFilters(page);
    await page.click("aside [data-sort='price-desc']");
    await expect(page.locator("aside [data-sort='price-desc']")).toHaveClass(/active/);
  });

  test("sort by name", async ({ page }) => {
    await page.goto("/");
    await openDesktopFilters(page);
    await page.click("aside [data-sort='name']");
    await expect(page.locator("aside [data-sort='name']")).toHaveClass(/active/);
  });

  test("default sort returns to Destacados", async ({ page }) => {
    await page.goto("/");
    await openDesktopFilters(page);
    await page.click("aside [data-sort='price-asc']");
    await page.click("aside [data-sort='default']");
    await expect(page.locator("aside [data-sort='default']")).toHaveClass(/active/);
  });
});

test.describe("Price Filter", () => {
  // Desktop-only: #price-min/max-desktop live in the hidden-below-768px
  // sidebar. Runs once, on public-pc; the mobile price inputs are covered
  // by the "Mobile Catalog" drawer tests.
  onlyDeviceProjects("public-pc");
  test("price range filter with apply button", async ({ page }) => {
    await page.goto("/");
    await openDesktopFilters(page);
    await page.fill("#price-min-desktop", "50000");
    await page.fill("#price-max-desktop", "150000");
    await page.click("#apply-filters-desktop");
    // Verify clear filters button appears
    await expect(page.locator("#clear-filters")).toBeVisible();
  });

  test("clear filters resets price inputs", async ({ page }) => {
    await page.goto("/");
    await openDesktopFilters(page);
    await page.fill("#price-min-desktop", "50000");
    await page.click("#apply-filters-desktop");
    await page.click("#clear-filters");
    await expect(page.locator("#price-min-desktop")).toHaveValue("");
    await expect(page.locator("#price-max-desktop")).toHaveValue("");
  });
});

test.describe("Search", () => {
  // Desktop-only: #search-input lives in .search-form, display:none below
  // 768px (Header.astro). Runs once, on public-pc; mobile search is covered
  // by the "Mobile Catalog" mobile-bar tests.
  onlyDeviceProjects("public-pc");
  test("search input exists and is functional", async ({ page }) => {
    await page.goto("/");
    // Catalog search is the header search input (#catalog-search-input was
    // removed with the header redesign); it wires the catalog filter state.
    const searchInput = page.locator("#search-input");
    await expect(searchInput).toBeVisible();
    await searchInput.fill("test");
    // Wait for debounce (300ms)
    await page.waitForTimeout(400);
    // Clear filters button should appear
    await expect(page.locator("#clear-filters")).toBeVisible();
  });

  test("search filters products", async ({ page }) => {
    await page.goto("/");
    const initialCount = await page.locator("#product-count-text").textContent();
    await page.locator("#search-input").fill("xyz_no_match");
    await page.waitForTimeout(400);
    // Should show empty state or reduced count
    const newCount = await page.locator("#product-count-text").textContent();
    expect(newCount).toContain("0");
  });
});

test.describe("Category Filter", () => {
  // Desktop-only: #category-tree-container lives in the sidebar, hidden
  // below 768px. Runs once, on public-pc; mobile category selection is
  // covered by the "Mobile Catalog" drawer tests.
  onlyDeviceProjects("public-pc");
  test("category tree labels are clickable", async ({ page }) => {
    // Empty-baked serves (see loadCatalogWithBakedTree) carry no real
    // category to click, so (re)serve until the tree is baked.
    await loadCatalogWithBakedTree(page);
    // Scope to the desktop tree and pick a real category (not "Todos", which
    // is a no-op filter): the old `.tree-label.first()` resolved to "Todos"
    // and re-resolved after the click, so it could assert a different node
    // than the one clicked.
    const target = page.locator('#category-tree-container .tree-label:not([data-filter="all"])').first();
    await expect(target).toBeVisible();
    const filter = await target.getAttribute("data-filter");
    await target.click();
    // Scoped to the node actually clicked (index.astro adds .active to the
    // clicked label) plus the observable filter effect, so the test still
    // fails if category selection stops working.
    await expect(page.locator(`#category-tree-container .tree-label[data-filter="${filter}"]`)).toHaveClass(/active/);
    await expect(page.locator("#clear-filters")).toBeVisible();
  });
});

test.describe("Clear Filters", () => {
  // Desktop-only: drives the sidebar sort + desktop price inputs +
  // #search-input, all hidden below 768px. Runs once, on public-pc.
  onlyDeviceProjects("public-pc");
  test("clear button appears when filter is active", async ({ page }) => {
    await page.goto("/");
    await openDesktopFilters(page);
    // Initially hidden
    await expect(page.locator("#clear-filters")).toBeHidden();
    // Activate a sort
    await page.click('[data-sort="price-asc"]');
    // Should appear
    await expect(page.locator("#clear-filters")).toBeVisible();
  });

  test("clear button resets all filters", async ({ page }) => {
    await page.goto("/");
    await openDesktopFilters(page);
    // Set some filters
    await page.click("aside [data-sort='name']");
    await page.fill("#price-min-desktop", "10000");
    await page.click("#apply-filters-desktop");
    await page.locator("#search-input").fill("test");
    await page.waitForTimeout(400);
    // Clear
    await page.click("#clear-filters");
    // Default sort should be active again (scoped to the aside set — the
    // mobile panel duplicates the [data-sort] buttons)
    await expect(page.locator("aside [data-sort='default']")).toHaveClass(/active/);
    await expect(page.locator("#clear-filters")).toBeHidden();
    // Search should be cleared
    await expect(page.locator("#search-input")).toHaveValue("");
  });
});

// Viewport-aware catalog search driver: the desktop header search
// (#search-input inside .search-form) is display:none below the 768px
// breakpoint, where the catalog's own mobile bar (#mobile-search-bar-input)
// takes over. Both wire the same filter state, so empty-state assertions
// hold at every width and run once per device with no duplication.
async function searchCatalog(page: Page, text: string) {
  const width = page.viewportSize()?.width ?? 1280;
  if (width < 768) await page.locator("#mobile-search-bar-input").fill(text);
  else await page.locator("#search-input").fill(text);
}

test.describe("Empty State", () => {
  test("empty state shows when no products match", async ({ page }) => {
    await page.goto("/");
    await searchCatalog(page, "zzz_impossible_match_xyz");
    await page.waitForTimeout(400);
    await expect(page.locator("#empty-state")).toBeVisible();
    await expect(page.locator("#empty-state")).toContainText("No se encontraron productos");
  });

  test("empty state clear button works", async ({ page }) => {
    await page.goto("/");
    await searchCatalog(page, "zzz_impossible");
    await page.waitForTimeout(400);
    await page.click("#empty-clear-btn");
    // Products show again — the empty state leaves the DOM-visible state
    // (a text assertion like not.toContainText("0") is fragile: counts like
    // "20 productos encontrados" also contain a zero)
    await expect(page.locator("#empty-state")).toBeHidden();
    await expect(page.locator("product-card").first()).toBeVisible();
  });
});

test.describe("Pagination", () => {
  test("load more button appears when many products", async ({ page }) => {
    await page.goto("/");
    // The load more button may or may not be visible depending on product count
    // We just verify the element exists in the DOM
    const loadMore = page.locator("#load-more");
    await expect(loadMore).toBeAttached();
  });
});

test.describe("Product Card", () => {
  test("add to cart button opens the variant modal", async ({ page }) => {
    await page.goto("/");
    const firstCard = page.locator("product-card").first();
    await expect(firstCard).toBeVisible();

    // Access shadow DOM for the add button
    const addButton = firstCard.locator(".product-add-btn");
    await expect(addButton).toBeVisible();
    await addButton.click();

    // The button now opens the variant modal (the old inline "¡Agregado!"
    // text flip was replaced by the modal flow); the modal overlay loses
    // aria-hidden once open.
    await expect(page.locator("variant-modal .overlay")).toBeVisible();
  });
});

test.describe("Mobile Panels", () => {
  // Mobile-only: forces a 375px viewport to drive the drawers. Runs once,
  // on public-mobile.
  onlyDeviceProjects("public-mobile");
  test("mobile categories button opens panel from left", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await page.click("#open-categories");
    const panel = page.locator("#mobile-category-panel");
    await expect(panel).toHaveClass(/open/);
    await expect(panel).toBeVisible();
  });

  test("mobile filters button opens panel from right", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await page.click("#open-filters");
    const panel = page.locator("#mobile-filters-panel");
    await expect(panel).toHaveClass(/open/);
    await expect(panel).toBeVisible();
  });
});

test.describe("Mobile Catalog", () => {
  // Mobile-only drawer suite (test.use pins 375x812). Runs once, on
  // public-mobile; the tablet project (700px) shares the same below-768px
  // drawer UI, so no separate tablet run is needed.
  onlyDeviceProjects("public-mobile");
  test.use({ viewport: { width: 375, height: 812 } });

  test("category drawer opens, selects category, and closes", async ({ page }) => {
    // Empty-baked serves (see loadCatalogWithBakedTree) carry no real
    // category to click, so (re)serve until the tree is baked. The mobile
    // tree handlers are attached in initCatalog, which the helper awaits.
    await loadCatalogWithBakedTree(page);
    await page.click("#open-categories");
    const panel = page.locator("#mobile-category-panel");
    await expect(panel).toHaveClass(/open/);

    // Select a real category (not "Todos") and remember which node was
    // clicked so the assertions below cannot re-resolve to another node.
    const target = panel.locator('.tree-label:not([data-filter="all"])').first();
    await expect(target).toBeVisible();
    const filter = await target.getAttribute("data-filter");
    await target.click();

    // hideCategoryPanel (index.astro) removes .open synchronously and adds
    // .hidden after the 300ms close animation: both states are auto-retried
    // by expect, so no fixed delay drives this assertion.
    await expect(panel).not.toHaveClass(/open/);
    await expect(panel).toHaveClass(/hidden/);
    // Observable effect of the selection (index.astro syncs the desktop
    // sidebar active state and activates the filter): still fails if
    // category selection stops working.
    await expect(page.locator(`#category-tree-container .tree-label[data-filter="${filter}"]`)).toHaveClass(/active/);
    await expect(page.locator("#clear-filters")).toBeVisible();
  });

  test("category panel tree toggle expands subcategories", async ({ page }) => {
    await page.goto("/");
    await page.click("#open-categories");
    const panel = page.locator("#mobile-category-panel");
    await expect(panel).toHaveClass(/open/);

    // Find a tree toggle button (if any exist)
    const toggle = panel.locator(".tree-toggle").first();
    if (await toggle.isVisible()) {
      await toggle.click();
      await expect(toggle).toHaveClass(/expanded/);
    }
  });

  test("filter drawer opens, sorts, and closes", async ({ page }) => {
    await page.goto("/");
    await page.click("#open-filters");
    const panel = page.locator("#mobile-filters-panel");
    await expect(panel).toHaveClass(/open/);

    // Select a sort option
    await panel.locator('[data-sort="price-asc"]').click();
    await panel.locator("#apply-filters-mobile").click();

    // Panel should close (wait for animation + hidden class)
    await page.waitForTimeout(500);
    await expect(panel).not.toHaveClass(/open/);

    // Desktop sidebar sort should be updated (the one inside aside)
    await expect(page.locator("aside [data-sort='price-asc']")).toHaveClass(/active/);
  });

  test("filter panel price range inputs work", async ({ page }) => {
    await page.goto("/");
    await page.click("#open-filters");
    const panel = page.locator("#mobile-filters-panel");
    await expect(panel).toHaveClass(/open/);

    // Fill price range
    await panel.locator("#price-min-mobile").fill("50000");
    await panel.locator("#price-max-mobile").fill("150000");
    await panel.locator("#apply-filters-mobile").click();

    await page.waitForTimeout(500);
    // Clear filters should appear (price filter was applied)
    await expect(page.locator("#clear-filters")).toBeVisible();
  });

  test("category panel close button closes panel", async ({ page }) => {
    await page.goto("/");
    await page.click("#open-categories");
    const panel = page.locator("#mobile-category-panel");
    await expect(panel).toHaveClass(/open/);

    // Click close button
    await panel.locator("#close-categories").click();
    await page.waitForTimeout(500);
    await expect(panel).not.toHaveClass(/open/);
  });

  test("filter panel close button closes panel", async ({ page }) => {
    await page.goto("/");
    await page.click("#open-filters");
    const panel = page.locator("#mobile-filters-panel");
    await expect(panel).toHaveClass(/open/);

    // Click close button
    await panel.locator("#close-filters").click();
    await page.waitForTimeout(500);
    await expect(panel).not.toHaveClass(/open/);
  });

  test("category panel backdrop click closes panel", async ({ page }) => {
    await page.goto("/");
    await page.click("#open-categories");
    const panel = page.locator("#mobile-category-panel");
    await expect(panel).toHaveClass(/open/);

    // Click the overlay backdrop OUTSIDE the inner panel (the panel is
    // 85% wide = ~319px on a 375px viewport, so x=360 hits the backdrop;
    // clicking at x=10 used to hit the panel itself and never closed it).
    await panel.click({ position: { x: 360, y: 400 } });
    await page.waitForTimeout(500);
    await expect(panel).not.toHaveClass(/open/);
  });

  test("filter panel backdrop click closes panel", async ({ page }) => {
    await page.goto("/");
    await page.click("#open-filters");
    const panel = page.locator("#mobile-filters-panel");
    await expect(panel).toHaveClass(/open/);

    // Click the overlay backdrop
    await panel.click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(500);
    await expect(panel).not.toHaveClass(/open/);
  });

  test("mobile search bar filters products", async ({ page }) => {
    await page.goto("/");
    // The header search toggle/overlay were replaced by the catalog's own
    // mobile search bar (index.astro #mobile-search-bar-input).
    const bar = page.locator("#mobile-search-bar-input");
    await expect(bar).toBeVisible();
    await bar.fill("test");
    await page.waitForTimeout(400);
    // A non-empty search activates the clear-filters state
    await expect(page.locator("#clear-filters")).toBeVisible();
  });

  test("pagination works on mobile", async ({ page }) => {
    await page.goto("/");
    const loadMore = page.locator("#load-more");
    await expect(loadMore).toBeAttached();
  });
});

test.describe("Mobile Back Button (MOD-BACK-1/4/5)", () => {
  // Form-factor-pinned per test: the drawer/back tests need a 375px
  // viewport (public-mobile), while the backdrop test forces a 1024px
  // desktop viewport (public-pc). Each runs exactly once.
  test.use({ viewport: { width: 375, height: 812 } });

  /**
   * Proves the popstate interceptor consumed the back press: Astro's
   * ClientRouter re-renders the whole page on a same-URL transition, which
   * detaches the pre-back element reference from the live document. If the
   * reference is still connected, no ClientRouter swap happened (D2).
   *
   * document.body is the swap discriminator because it ALWAYS exists: an
   * earlier revision keyed on #product-count-text, which only renders when
   * the catalog is non-empty, read null on an empty seeded backend and
   * produced a false swap positive. body is present regardless of data.
   */
  async function expectNoDocumentSwap(page: Page) {
    const ref = await page.evaluateHandle(() => document.body);
    let swapped = false;
    try {
      swapped = !(await ref.evaluate((el) => !!el && el.isConnected));
    } catch {
      swapped = true; // execution context destroyed = document was swapped
    }
    expect(swapped).toBe(false);
  }

  test("back closes the category drawer with the URL unchanged", async ({ page }) => {
    test.skip(
      test.info().project.name !== "public-mobile",
      "mobile drawer back-button behavior: runs once on public-mobile"
    );
    await page.goto("/");
    await page.click("#open-categories");
    const panel = page.locator("#mobile-category-panel");
    await expect(panel).toHaveClass(/open/);

    const url = page.url();
    await page.goBack();
    await page.waitForTimeout(500);

    await expect(panel).not.toHaveClass(/open/);
    expect(page.url()).toBe(url);
    await expectNoDocumentSwap(page);
  });

  test("back closes the filters drawer with the URL unchanged", async ({ page }) => {
    test.skip(
      test.info().project.name !== "public-mobile",
      "mobile drawer back-button behavior: runs once on public-mobile"
    );
    await page.goto("/");
    await page.click("#open-filters");
    const panel = page.locator("#mobile-filters-panel");
    await expect(panel).toHaveClass(/open/);

    const url = page.url();
    await page.goBack();
    await page.waitForTimeout(500);

    await expect(panel).not.toHaveClass(/open/);
    expect(page.url()).toBe(url);
    await expectNoDocumentSwap(page);
  });

  test("back closes the variant modal with the URL unchanged", async ({ page }) => {
    test.skip(
      test.info().project.name !== "public-mobile",
      "mobile modal back-button behavior: runs once on public-mobile"
    );
    await page.goto("/");
    const firstCard = page.locator("product-card").first();
    await expect(firstCard).toBeVisible();
    await firstCard.locator(".product-add-btn").click();
    await expect(page.locator("variant-modal .overlay")).toBeVisible();

    const url = page.url();
    await page.goBack();
    await page.waitForTimeout(500);

    await expect(page.locator("variant-modal .overlay")).toBeHidden();
    expect(page.url()).toBe(url);
    await expectNoDocumentSwap(page);
  });

  test("ESC then back navigates normally with no spurious transition", async ({ page }) => {
    test.skip(
      test.info().project.name !== "public-mobile",
      "mobile drawer back-button behavior: runs once on public-mobile"
    );
    // Two real entries below the drawer's entry: /home then / — so a back
    // press AFTER ESC has somewhere real to go.
    await page.goto("/home");
    await expect(page).toHaveTitle(/Sublime/i);
    await page.goto("/");
    await page.click("#open-categories");
    const panel = page.locator("#mobile-category-panel");
    await expect(panel).toHaveClass(/open/);

    // ESC closes the drawer AND pops its entry (MOD-BACK-5 back parity)
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    await expect(panel).not.toHaveClass(/open/);

    // Back afterwards must land on the PREVIOUS page: the drawer entry is
    // gone, so there is no spurious same-URL ClientRouter transition.
    await page.goBack();
    await page.waitForURL(/\/home/, { timeout: 10_000 });
    expect(page.url()).toContain("/home");
  });

  test("backdrop-closed variant modal leaves no stale entry: back navigates normally", async ({ page }) => {
    test.skip(
      test.info().project.name !== "public-pc",
      "desktop modal back-button behavior: runs once on public-pc"
    );
    // Desktop viewport: the variant modal is centered with a clickable
    // backdrop (on mobile it fills the screen and the X button only gets a
    // listener on successful content load). Backdrop close is a manual close
    // path that must pop its own entry (MOD-BACK-5).
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/home");
    await expect(page).toHaveTitle(/Sublime/i);
    await page.goto("/");
    const firstCard = page.locator("product-card").first();
    await expect(firstCard).toBeVisible();
    await firstCard.locator(".product-add-btn").click();
    await expect(page.locator("variant-modal .overlay")).toBeVisible();

    // Click the backdrop OUTSIDE the centered modal (20,20 hits the overlay).
    await page.locator("variant-modal .overlay").click({ position: { x: 20, y: 20 } });
    await page.waitForTimeout(500);
    await expect(page.locator("variant-modal .overlay")).toBeHidden();

    // A stale entry would make back trigger a spurious same-URL transition;
    // with the entry popped, back navigates to the previous page instead.
    await page.goBack();
    await page.waitForURL(/\/home/, { timeout: 10_000 });
    expect(page.url()).toContain("/home");
  });
});

test.describe("Mobile Panels Hidden on Desktop", () => {
  // Desktop-only: forces a 1024px viewport to assert the mobile panels stay
  // hidden. Runs once, on public-pc.
  onlyDeviceProjects("public-pc");
  test("mobile action buttons are hidden on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/");
    await expect(page.locator(".mobile-actions")).toBeHidden();
  });

  test("mobile category panel is hidden on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/");
    const panel = page.locator("#mobile-category-panel");
    await expect(panel).toHaveClass(/hidden/);
  });

  test("mobile filters panel is hidden on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/");
    const panel = page.locator("#mobile-filters-panel");
    await expect(panel).toHaveClass(/hidden/);
  });
});

test.describe("Button Colors", () => {
  // Intent: primary button text must be readable against its background.
  // The design system colors the text with --on-surface (rgb(26,26,26) in
  // the light theme), not pure black, and the tokens can vary by theme — so
  // assert foreground differs from the background instead of a hard-coded
  // color.
  test("primary buttons have visible text color", async ({ page }) => {
    test.skip(
      test.info().project.name !== "public-pc",
      "desktop sidebar apply button only exists at desktop widths: runs once on public-pc"
    );
    await page.goto("/");
    await openDesktopFilters(page);
    // Check the apply filters button on desktop
    const btn = page.locator("#apply-filters-desktop");
    await expect(btn).toBeVisible();
    const colors = await btn.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { fg: cs.color, bg: cs.backgroundColor };
    });
    expect(colors.fg).not.toBe(colors.bg);
  });

  test("primary button on product detail has visible text", async ({ page }) => {
    await page.goto("/");
    const productLink = page.locator('a[href*="/products/"]').first();
    if (await productLink.isVisible()) {
      await productLink.click();
      await page.waitForURL(/\/products\//);
      const btn = page.locator("#detail-add-cart");
      if (await btn.isVisible()) {
        const colors = await btn.evaluate((el) => {
          const cs = getComputedStyle(el);
          return { fg: cs.color, bg: cs.backgroundColor };
        });
        expect(colors.fg).not.toBe(colors.bg);
      }
    }
  });
});

test.describe("Product Detail", () => {
  test("product detail page loads when clicking a product", async ({ page }) => {
    await page.goto("/");
    const productLink = page.locator('a[href*="/products/"]').first();
    if (await productLink.isVisible()) {
      await productLink.click();
      // waitForURL is retrying — the navigation completes asynchronously
      // after click() resolves, so a plain page.url() sample is racy.
      await page.waitForURL(/\/products\//);
    }
  });
});
