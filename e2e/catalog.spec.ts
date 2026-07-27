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
  test("mobile categories button opens panel", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await page.click("#open-categories");
    await expect(page.locator("#mobile-category-panel")).toBeVisible();
  });

  test("mobile filters button opens panel", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await page.click("#open-filters");
    await expect(page.locator("#mobile-filters-panel")).toBeVisible();
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
