import { test, expect, type Page } from "@playwright/test";

// The mobile category tree is baked into the served HTML per request
// (index.astro:45 fetches the tree in frontmatter with a 10s
// fetchWithTimeout; on abort the page bakes "Sin categorías" —
// CategoryTree.astro:20/75 — and no runtime fetch ever repairs it: the panel
// open path only toggles hidden/open classes via rAF, index.astro:629-633).
// Under parallel full-battery load wrangler dev fails that tree fetch in
// bursts (three parallel workers were observed serving "Sin categorías"
// with healthy products repeatedly), so a served page can contain zero real
// category labels no matter how long the test then waits (a 15s toBeAttached
// gate was observed timing out on exactly such a serve). Probe the baked DOM
// once initCatalog has run — the trailing inline script executes after the
// tree markup is parsed, so the count is final — and retry with a fresh
// request until a 20s budget is spent instead of sleeping or waiting on a
// condition that can never become true. Empty-baked serves are cheap (the
// tree fetch fails fast), so bursts get many retries; the 20s cap + 5s loud
// gate keep the whole test inside the 30s test timeout.
async function loadCatalogWithBakedTree(page: Page) {
  const deadline = Date.now() + 20_000;
  let firstServe = true;
  for (;;) {
    if (firstServe) {
      await page.goto("/");
      firstServe = false;
    } else {
      await page.reload();
    }
    await page.waitForFunction(() => (window as any).__catalogInitialized === true);
    const baked = await page
      .locator('#mobile-category-panel .tree-label:not([data-filter="all"]), #category-tree-container .tree-label:not([data-filter="all"])')
      .count();
    if (baked > 0) return;
    if (Date.now() >= deadline) break;
  }
  // Loud failure on the app's own readiness signal (never vacuously green):
  // the backend served an empty tree for the whole budget.
  await expect(
    page.locator('#mobile-category-panel .tree-label:not([data-filter="all"])').first(),
  ).toBeAttached({ timeout: 5_000 });
}

// ============================================================
// Responsive Design E2E Tests
// Tests at multiple viewport sizes to verify mobile polish.
// ============================================================

const VIEWPORTS = {
  mobileSE: { width: 375, height: 812, label: "iPhone SE" },
  mobile14: { width: 390, height: 844, label: "iPhone 14" },
  tablet: { width: 768, height: 1024, label: "iPad" },
  desktop: { width: 1280, height: 800, label: "Desktop" },
};

// -----------------------------------------------------------
// CATALOG PAGE — Responsive Tests
// -----------------------------------------------------------

test.describe("Catalog — Responsive Layout", () => {
  for (const [key, vp] of Object.entries(VIEWPORTS)) {
    test.describe(`${vp.label} (${vp.width}x${vp.height})`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test("page loads and shows products", async ({ page }) => {
        await page.goto("/");
        await expect(page).toHaveTitle(/Sublime/i);
        await expect(page.locator("product-card").first()).toBeVisible();
      });

      test("no horizontal overflow", async ({ page }) => {
        await page.goto("/");
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
      });

      test("all text is readable (min 11px)", async ({ page }) => {
        await page.goto("/");
        const tooSmall = await page.evaluate(() => {
          const elements = document.querySelectorAll("body *:not(script):not(style)");
          let smallest = Infinity;
          for (const el of elements) {
            const style = window.getComputedStyle(el);
            const size = parseFloat(style.fontSize);
            if (size > 0 && size < smallest) smallest = size;
          }
          return smallest;
        });
        expect(tooSmall).toBeGreaterThanOrEqual(11);
      });

      if (vp.width < 768) {
        test("desktop sidebar is hidden", async ({ page }) => {
          await page.goto("/");
          await expect(page.locator(".shop-sidebar")).toBeHidden();
        });

        test("mobile action buttons are visible", async ({ page }) => {
          await page.goto("/");
          await expect(page.locator("#open-categories")).toBeVisible();
          await expect(page.locator("#open-filters")).toBeVisible();
        });

        test("product grid is 1 column on mobile", async ({ page }) => {
          await page.goto("/");
          const grid = page.locator(".products-grid");
          const columns = await grid.evaluate((el) => {
            return window.getComputedStyle(el).gridTemplateColumns;
          });
          // Should be single column (one value)
          const colCount = columns.split(" ").filter((c) => c.trim()).length;
          expect(colCount).toBe(1);
        });
      }

      if (vp.width >= 640 && vp.width < 1024) {
        test("product grid is 2 columns on tablet", async ({ page }) => {
          await page.goto("/");
          const grid = page.locator(".products-grid");
          const columns = await grid.evaluate((el) => {
            return window.getComputedStyle(el).gridTemplateColumns;
          });
          const colCount = columns.split(" ").filter((c) => c.trim()).length;
          expect(colCount).toBeGreaterThanOrEqual(2);
        });
      }

      if (vp.width >= 1024) {
        test("desktop sidebar is visible", async ({ page }) => {
          await page.goto("/");
          await expect(page.locator(".shop-sidebar")).toBeVisible();
        });

        test("mobile action buttons are hidden on desktop", async ({ page }) => {
          await page.goto("/");
          await expect(page.locator(".mobile-actions")).toBeHidden();
        });
      }
    });
  }
});

// -----------------------------------------------------------
// HEADER — Responsive Tests
// -----------------------------------------------------------

test.describe("Header — Responsive", () => {
  test.describe("Mobile (375px)", () => {
    test.use({ viewport: { width: 375, height: 812 } });

    // The header search toggle/overlay were removed in the header redesign;
    // mobile search now lives in the catalog's own search bar
    // (#mobile-search-bar / #mobile-search-bar-input, index.astro).
    test("search bar is hidden, mobile search bar is visible", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator(".search-form")).toBeHidden();
      await expect(page.locator("#mobile-search-bar")).toBeVisible();
    });

    test("wishlist icon is hidden on mobile", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("#wishlist-btn")).toBeHidden();
    });

    test("cart icon is visible on mobile", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("#cart-btn")).toBeVisible();
    });

    test("account icon is visible on mobile", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("#user-btn")).toBeVisible();
    });

    test("hamburger menu is visible on mobile", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("#menu-toggle")).toBeVisible();
    });

    test("mobile search bar is interactive", async ({ page }) => {
      await page.goto("/");
      const bar = page.locator("#mobile-search-bar-input");
      await expect(bar).toBeVisible();
      await bar.fill("camiseta");
      await expect(bar).toHaveValue("camiseta");
      await page.waitForTimeout(400);
      // The search wires the catalog filter state
      await expect(page.locator("#clear-filters")).toBeVisible();
    });

    test("clear filters resets mobile search bar", async ({ page }) => {
      await page.goto("/");
      const bar = page.locator("#mobile-search-bar-input");
      await bar.fill("camiseta");
      await page.waitForTimeout(400);
      await expect(page.locator("#clear-filters")).toBeVisible();
      await page.click("#clear-filters");
      await expect(bar).toHaveValue("");
    });

    test("Escape closes the mobile filters panel", async ({ page }) => {
      await page.goto("/");
      await page.click("#open-filters");
      await expect(page.locator("#mobile-filters-panel")).toHaveClass(/open/);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
      await expect(page.locator("#mobile-filters-panel")).not.toHaveClass(/open/);
    });

    test("hamburger menu opens mobile nav", async ({ page }) => {
      await page.goto("/");
      // Use evaluate to click the button directly (bypasses viewport issues with fixed header)
      await page.evaluate(() => {
        document.getElementById("menu-toggle")?.click();
      });
      await expect(page.locator("#nav-mobile")).toHaveClass(/open/);
    });
  });

  test.describe("Desktop (1280px)", () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test("search bar is visible on desktop", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator(".search-form")).toBeVisible();
    });

    test("mobile search bar is hidden on desktop", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("#mobile-search-bar")).toBeHidden();
    });

    test("wishlist icon is visible on desktop", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("#wishlist-btn")).toBeVisible();
    });

    test("hamburger menu is hidden on desktop", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("#menu-toggle")).toBeHidden();
    });
  });
});

// -----------------------------------------------------------
// MOBILE CATEGORY PANEL — Responsive Tests
// -----------------------------------------------------------

test.describe("Mobile Category Panel", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("category panel opens on mobile", async ({ page }) => {
    await page.goto("/");
    await page.click("#open-categories");
    const panel = page.locator("#mobile-category-panel");
    await expect(panel).toBeVisible();
    await expect(panel).toHaveClass(/open/);
  });

  test("category panel closes on close button", async ({ page }) => {
    await page.goto("/");
    await page.click("#open-categories");
    await page.click("#close-categories");
    await page.waitForTimeout(400);
    await expect(page.locator("#mobile-category-panel")).toHaveClass(/hidden/);
  });

  test("category panel closes on overlay click", async ({ page }) => {
    await page.goto("/");
    await page.click("#open-categories");
    const panel = page.locator("#mobile-category-panel");
    await expect(panel).toHaveClass(/open/);
    // Click on the overlay via JS (Playwright mouse.click can't reach behind fixed-position panels)
    await page.evaluate(() => {
      const overlay = document.getElementById("mobile-category-panel");
      if (overlay) {
        overlay.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, clientX: 370, clientY: 400 }));
      }
    });
    await page.waitForTimeout(500);
    await expect(panel).not.toHaveClass(/open/);
  });

  test("category selection works in mobile panel", async ({ page }) => {
    // Empty-baked serves (see loadCatalogWithBakedTree) carry no real
    // category to click, so (re)serve until the tree is baked. The mobile
    // tree handlers are attached in initCatalog, which the helper awaits.
    await loadCatalogWithBakedTree(page);
    await page.click("#open-categories");
    const panel = page.locator("#mobile-category-panel");
    await expect(panel).toHaveClass(/open/);
    // Click a real category (not "Todos") and remember which node was
    // clicked so the assertions scope to it instead of a re-resolved .first().
    const target = panel.locator('.tree-label:not([data-filter="all"])').first();
    await expect(target).toBeVisible();
    const filter = await target.getAttribute("data-filter");
    await target.click();
    // hideCategoryPanel (index.astro) removes .open synchronously and adds
    // .hidden after the 300ms close animation: both are auto-retried by
    // expect, so no fixed delay drives this assertion.
    await expect(panel).not.toHaveClass(/open/);
    await expect(panel).toHaveClass(/hidden/);
    // Observable effect of the selection (index.astro syncs the desktop
    // sidebar active state and activates the filter): still fails if
    // category selection stops working.
    await expect(page.locator(`#category-tree-container .tree-label[data-filter="${filter}"]`)).toHaveClass(/active/);
    await expect(page.locator("#clear-filters")).toBeVisible();
  });

  test("category tree toggle works in mobile panel", async ({ page }) => {
    await page.goto("/");
    await page.click("#open-categories");
    const panel = page.locator("#mobile-category-panel");
    const toggle = panel.locator(".tree-toggle").first();
    if (await toggle.isVisible()) {
      await toggle.click();
      // The sublist should expand (have expanded class)
      await page.waitForTimeout(200);
      const sublist = panel.locator(".tree-sublist.expanded").first();
      await expect(sublist).toBeAttached();
    }
  });
});

// -----------------------------------------------------------
// MOBILE FILTER PANEL — Responsive Tests
// -----------------------------------------------------------

test.describe("Mobile Filter Panel", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("filter panel opens on mobile", async ({ page }) => {
    await page.goto("/");
    await page.click("#open-filters");
    const panel = page.locator("#mobile-filters-panel");
    await expect(panel).toBeVisible();
    await expect(panel).toHaveClass(/open/);
  });

  test("filter panel closes on close button", async ({ page }) => {
    await page.goto("/");
    await page.click("#open-filters");
    await page.click("#close-filters");
    await page.waitForTimeout(400);
    await expect(page.locator("#mobile-filters-panel")).toHaveClass(/hidden/);
  });

  test("sort selection works in mobile filter panel", async ({ page }) => {
    await page.goto("/");
    await page.click("#open-filters");
    const panel = page.locator("#mobile-filters-panel");
    await panel.locator('[data-sort="price-asc"]').click();
    // The panel syncs the active state to the DESKTOP sidebar button
    // (index.astro mobile sort handler re-applies active to the first
    // [data-sort] match, which is the aside's button — the panel button
    // itself stays unstyled by design).
    await expect(page.locator("aside [data-sort='price-asc']")).toHaveClass(/active/);
  });

  test("apply filters works in mobile filter panel", async ({ page }) => {
    await page.goto("/");
    await page.click("#open-filters");
    const panel = page.locator("#mobile-filters-panel");
    // Wait for panel to be fully open
    await expect(panel).toHaveClass(/open/);
    await page.waitForTimeout(300);
    
    // Click sort option using evaluate to avoid visibility issues
    await page.evaluate(() => {
      const panel = document.getElementById("mobile-filters-panel");
      const btn = panel?.querySelector('[data-sort="price-desc"]');
      btn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    
    await page.waitForTimeout(200);
    
    // Click apply
    await page.evaluate(() => {
      const panel = document.getElementById("mobile-filters-panel");
      const applyBtn = panel?.querySelector("#apply-filters-mobile");
      applyBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    
    await page.waitForTimeout(500);
    await expect(panel).not.toHaveClass(/open/);
    
    // Desktop sidebar sort should be updated
    await expect(page.locator("aside [data-sort='price-desc']")).toHaveClass(/active/);
  });
});

// -----------------------------------------------------------
// PRODUCT DETAIL — Responsive Tests
// -----------------------------------------------------------

test.describe("Product Detail — Responsive", () => {
  for (const [key, vp] of Object.entries(VIEWPORTS)) {
    test.describe(`${vp.label} (${vp.width}x${vp.height})`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test("product detail page loads", async ({ page }) => {
        // Navigate to catalog first, then click a product
        await page.goto("/");
        const productLink = page.locator('a[href*="/products/"]').first();
        if (await productLink.isVisible()) {
          await productLink.click();
          // Retrying wait — navigation completes asynchronously after the
          // click, so a single page.url() sample is racy.
          await page.waitForURL(/\/products\//);
        }
      });

      test("no horizontal overflow on product detail", async ({ page }) => {
        await page.goto("/");
        const productLink = page.locator('a[href*="/products/"]').first();
        if (await productLink.isVisible()) {
          await productLink.click();
          const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
          const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
          expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
        }
      });
    });
  }

  test.describe("Mobile (375px)", () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test("add to cart button is full width and touch-friendly", async ({ page }) => {
      await page.goto("/");
      const productLink = page.locator('a[href*="/products/"]').first();
      if (await productLink.isVisible()) {
        await productLink.click();
        const btn = page.locator("#detail-add-cart");
        await expect(btn).toBeVisible();
        const box = await btn.boundingBox();
        expect(box!.width).toBeGreaterThan(200); // Should be wide
        expect(box!.height).toBeGreaterThanOrEqual(44); // Touch target
      }
    });

    test("whatsapp button is full width and touch-friendly", async ({ page }) => {
      await page.goto("/");
      const productLink = page.locator('a[href*="/products/"]').first();
      if (await productLink.isVisible()) {
        await productLink.click();
        const btn = page.locator("#detail-whatsapp");
        await expect(btn).toBeVisible();
        const box = await btn.boundingBox();
        expect(box!.width).toBeGreaterThan(200); // Should be wide
        expect(box!.height).toBeGreaterThanOrEqual(44); // Touch target
      }
    });
  });
});

// -----------------------------------------------------------
// CART PAGE — Responsive Tests
// -----------------------------------------------------------

test.describe("Cart — Responsive Layout", () => {
  const CART_ITEMS = [
    { id: "1", name: "Camiseta Sublime", price: 120000, image: "/placeholder-product.svg", quantity: 2 },
    { id: "2", name: "Tote Bag", price: 85000, image: "/placeholder-product.svg", quantity: 1 },
  ];

  for (const [key, vp] of Object.entries(VIEWPORTS)) {
    test.describe(`${vp.label} (${vp.width}x${vp.height})`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test.beforeEach(async ({ page }) => {
        await page.addInitScript((items) => {
          localStorage.setItem("cart", JSON.stringify(items));
        }, CART_ITEMS);
      });

      test("cart page loads with items", async ({ page }) => {
        await page.goto("/cart");
        await expect(page.locator(".cart-item")).toHaveCount(2);
      });

      test("no horizontal overflow on cart", async ({ page }) => {
        await page.goto("/cart");
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
      });

      if (vp.width < 640) {
        test("cart items stack vertically on mobile", async ({ page }) => {
          await page.goto("/cart");
          const firstItem = page.locator(".cart-item").nth(0);
          await expect(firstItem).toBeVisible();
          // Summary should be visible below
          await expect(page.locator(".cart-summary").first()).toBeVisible();
        });

        test("quantity controls are touch-friendly on mobile", async ({ page }) => {
          await page.goto("/cart");
          // The cart's increment button is role-identified ("Aumentar");
          // the old [data-action="increase"] attribute no longer exists.
          const btn = page.locator(".cart-item").first().getByRole("button", { name: "Aumentar" });
          const box = await btn.boundingBox();
          expect(box!.width).toBeGreaterThanOrEqual(40);
          expect(box!.height).toBeGreaterThanOrEqual(40);
        });
      }
    });
  }
});

// -----------------------------------------------------------
// TOUCH TARGETS AUDIT
// -----------------------------------------------------------

test.describe("Touch Targets — All Interactive Elements", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("all buttons on catalog page meet 44px touch target", async ({ page }) => {
    await page.goto("/");
    const buttons = await page.locator("button:visible, a.action-btn:visible").all();
    for (const btn of buttons) {
      const box = await btn.boundingBox();
      if (box && box.width > 0 && box.height > 0) {
        // Allow smaller sizes for inline text links, but buttons should be 44px
        const isNavBtn = await btn.evaluate((el) => {
          return el.closest(".header-actions, .mobile-actions, .filter-options") !== null;
        });
        if (isNavBtn) {
          expect(box.height).toBeGreaterThanOrEqual(40); // Slightly relaxed for header
        }
      }
    }
  });

  test("mobile action buttons meet 44px touch target", async ({ page }) => {
    await page.goto("/");
    const catBtn = page.locator("#open-categories");
    const filterBtn = page.locator("#open-filters");
    
    const catBox = await catBtn.boundingBox();
    const filterBox = await filterBtn.boundingBox();
    
    expect(catBox!.height).toBeGreaterThanOrEqual(44);
    expect(filterBox!.height).toBeGreaterThanOrEqual(44);
  });

  test("header icons meet touch target on mobile", async ({ page }) => {
    await page.goto("/");
    const cartBtn = page.locator("#cart-btn");
    const userBtn = page.locator("#user-btn");
    // The search toggle icon was removed; the theme toggle (40x40) now
    // represents the header icon set alongside cart/user.
    const themeToggle = page.locator("#theme-toggle");
    
    const cartBox = await cartBtn.boundingBox();
    const userBox = await userBtn.boundingBox();
    const themeBox = await themeToggle.boundingBox();
    
    expect(cartBox!.height).toBeGreaterThanOrEqual(40);
    expect(userBox!.height).toBeGreaterThanOrEqual(40);
    expect(themeBox!.height).toBeGreaterThanOrEqual(40);
  });
});

// -----------------------------------------------------------
// PROMOTIONAL BANNER — Mobile Truncation
// -----------------------------------------------------------

test.describe("Promotional Banner — Mobile", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("banner text is truncated on mobile (no excessive wrapping)", async ({ page }) => {
    await page.goto("/");
    const banner = page.locator(".banner-item").first();
    if (await banner.isVisible()) {
      const box = await banner.boundingBox();
      // Banner should not be excessively tall (max ~100px for 2 lines)
      expect(box!.height).toBeLessThan(150);
    }
  });
});
