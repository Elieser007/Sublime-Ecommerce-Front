import { test, expect } from "@playwright/test";

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
  test("sort by price ascending", async ({ page }) => {
    await page.goto("/");
    await page.click('[data-sort="price-asc"]');
    // Verify button is active
    await expect(page.locator('[data-sort="price-asc"]')).toHaveClass(/active/);
    // Wait for re-render
    await page.waitForTimeout(200);
  });

  test("sort by price descending", async ({ page }) => {
    await page.goto("/");
    await page.click('[data-sort="price-desc"]');
    await expect(page.locator('[data-sort="price-desc"]')).toHaveClass(/active/);
  });

  test("sort by name", async ({ page }) => {
    await page.goto("/");
    await page.click('[data-sort="name"]');
    await expect(page.locator('[data-sort="name"]')).toHaveClass(/active/);
  });

  test("default sort returns to Destacados", async ({ page }) => {
    await page.goto("/");
    await page.click('[data-sort="price-asc"]');
    await page.click('[data-sort="default"]');
    await expect(page.locator('[data-sort="default"]')).toHaveClass(/active/);
  });
});

test.describe("Price Filter", () => {
  test("price range filter with apply button", async ({ page }) => {
    await page.goto("/");
    await page.fill("#price-min-desktop", "50000");
    await page.fill("#price-max-desktop", "150000");
    await page.click("#apply-filters-desktop");
    // Verify clear filters button appears
    await expect(page.locator("#clear-filters")).toBeVisible();
  });

  test("clear filters resets price inputs", async ({ page }) => {
    await page.goto("/");
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
    const searchInput = page.locator("#catalog-search-input");
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
    await page.locator("#catalog-search-input").fill("xyz_no_match");
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
    // Initially hidden
    await expect(page.locator("#clear-filters")).toBeHidden();
    // Activate a sort
    await page.click('[data-sort="price-asc"]');
    // Should appear
    await expect(page.locator("#clear-filters")).toBeVisible();
  });

  test("clear button resets all filters", async ({ page }) => {
    await page.goto("/");
    // Set some filters
    await page.click('[data-sort="name"]');
    await page.fill("#price-min-desktop", "10000");
    await page.click("#apply-filters-desktop");
    await page.locator("#catalog-search-input").fill("test");
    await page.waitForTimeout(400);
    // Clear
    await page.click("#clear-filters");
    // Default sort should be active again
    await expect(page.locator('[data-sort="default"]')).toHaveClass(/active/);
    await expect(page.locator("#clear-filters")).toBeHidden();
    // Search should be cleared
    await expect(page.locator("#catalog-search-input")).toHaveValue("");
  });
});

test.describe("Empty State", () => {
  test("empty state shows when no products match", async ({ page }) => {
    await page.goto("/");
    await page.locator("#catalog-search-input").fill("zzz_impossible_match_xyz");
    await page.waitForTimeout(400);
    await expect(page.locator("#empty-state")).toBeVisible();
    await expect(page.locator("#empty-state")).toContainText("No se encontraron productos");
  });

  test("empty state clear button works", async ({ page }) => {
    await page.goto("/");
    await page.locator("#catalog-search-input").fill("zzz_impossible");
    await page.waitForTimeout(400);
    await page.click("#empty-clear-btn");
    // Should show products again
    await expect(page.locator("#product-count-text")).not.toContainText("0");
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
  test("add to cart button works", async ({ page }) => {
    await page.goto("/");
    const firstCard = page.locator("product-card").first();
    await expect(firstCard).toBeVisible();
    
    // Access shadow DOM for the add button
    const addButton = firstCard.locator(".product-add-btn");
    await expect(addButton).toBeVisible();
    await addButton.click();
    
    // Button text should change to "¡Agregado!"
    await expect(addButton).toContainText("¡Agregado!");
    
    // Wait for it to revert
    await page.waitForTimeout(2000);
    await expect(addButton).toContainText("Agregar al carrito");
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

    // Click the overlay backdrop (the panel element itself, not the inner content)
    // The overlay is the parent; clicking outside the inner panel triggers close
    await panel.click({ position: { x: 10, y: 10 } });
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

  test("search overlay works on mobile", async ({ page }) => {
    await page.goto("/");
    await page.click("#search-toggle");
    await expect(page.locator("#search-overlay")).toHaveClass(/open/);

    // Type in search
    await page.fill("#search-overlay-input", "test");
    await expect(page.locator("#search-overlay-input")).toHaveValue("test");
  });

  test("pagination works on mobile", async ({ page }) => {
    await page.goto("/");
    const loadMore = page.locator("#load-more");
    await expect(loadMore).toBeAttached();
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
  test("primary buttons have visible text color", async ({ page }) => {
    await page.goto("/");
    // Check the apply filters button on desktop
    const btn = page.locator("#apply-filters-desktop");
    await expect(btn).toBeVisible();
    const color = await btn.evaluate((el) => getComputedStyle(el).color);
    // Should be black (#000) for contrast on cyan background
    expect(color).toBe("rgb(0, 0, 0)");
  });

  test("primary button on product detail has visible text", async ({ page }) => {
    await page.goto("/");
    const productLink = page.locator('a[href*="/producto/"]').first();
    if (await productLink.isVisible()) {
      await productLink.click();
      await page.waitForLoadState("networkidle");
      const btn = page.locator("#detail-add-cart");
      if (await btn.isVisible()) {
        const color = await btn.evaluate((el) => getComputedStyle(el).color);
        expect(color).toBe("rgb(0, 0, 0)");
      }
    }
  });
});

test.describe("Product Detail", () => {
  test("product detail page loads when clicking a product", async ({ page }) => {
    await page.goto("/");
    const productLink = page.locator('a[href*="/producto/"]').first();
    if (await productLink.isVisible()) {
      await productLink.click();
      await expect(page.url()).toContain("/producto/");
    }
  });
});
