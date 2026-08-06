import { test, expect, type Page } from "@playwright/test";

// The desktop sidebar shows ONE tab at a time (sidebar-tabs landed in 2be0321):
// sort/price controls live in the "Filtros" panel, which is display:none until
// its tab is activated. Every test that drives those controls opens it first.
async function openDesktopFilters(page: Page) {
  await page.click('.sidebar-tab[data-sidebar-tab="filters"]');
  await expect(page.locator("#sidebar-filters")).toHaveClass(/active/);
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
  test("category tree labels are clickable", async ({ page }) => {
    await page.goto("/");
    const firstLabel = page.locator(".tree-label").first();
    await expect(firstLabel).toBeVisible();
    await firstLabel.click();
    // Category should become active
    await expect(firstLabel).toHaveClass(/active/);
  });
});

test.describe("Clear Filters", () => {
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

test.describe("Empty State", () => {
  test("empty state shows when no products match", async ({ page }) => {
    await page.goto("/");
    await page.locator("#search-input").fill("zzz_impossible_match_xyz");
    await page.waitForTimeout(400);
    await expect(page.locator("#empty-state")).toBeVisible();
    await expect(page.locator("#empty-state")).toContainText("No se encontraron productos");
  });

  test("empty state clear button works", async ({ page }) => {
    await page.goto("/");
    await page.locator("#search-input").fill("zzz_impossible");
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
  test.use({ viewport: { width: 375, height: 812 } });

  test("category drawer opens, selects category, and closes", async ({ page }) => {
    await page.goto("/");
    await page.click("#open-categories");
    const panel = page.locator("#mobile-category-panel");
    await expect(panel).toHaveClass(/open/);

    // Select a category
    const firstLabel = panel.locator(".tree-label").first();
    await firstLabel.click();
    await page.waitForTimeout(500);

    // Panel should close
    await expect(panel).not.toHaveClass(/open/);
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
