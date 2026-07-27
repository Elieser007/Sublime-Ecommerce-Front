import { test, expect } from "@playwright/test";

const CART_ITEMS = [
  { id: "1", name: "Camiseta Sublime", price: 120000, image: "/placeholder-product.svg", quantity: 2 },
  { id: "2", name: "Tote Bag", price: 85000, image: "/placeholder-product.svg", quantity: 1 },
];

test.describe("Cart Page", () => {
  test.beforeEach(async ({ page }) => {
    // Set cart in localStorage before navigating
    await page.addInitScript((items) => {
      localStorage.setItem("cart", JSON.stringify(items));
    }, CART_ITEMS);
  });

  test("shows cart items with correct layout", async ({ page }) => {
    await page.goto("/cart");

    // Wait for cart items to render
    const cartItems = page.locator(".cart-item");
    await expect(cartItems).toHaveCount(2);

    // First item
    const firstItem = cartItems.nth(0);
    await expect(firstItem.locator(".cart-item-name")).toContainText("Camiseta Sublime");
    await expect(firstItem.locator(".qty-input")).toHaveValue("2");

    // Second item
    const secondItem = cartItems.nth(1);
    await expect(secondItem.locator(".cart-item-name")).toContainText("Tote Bag");
    await expect(secondItem.locator(".qty-input")).toHaveValue("1");
  });

  test("shows empty cart state with illustration", async ({ page }) => {
    // Clear cart
    await page.addInitScript(() => {
      localStorage.setItem("cart", "[]");
    });

    await page.goto("/cart");

    // Wait for empty state
    await expect(page.locator(".empty-state")).toBeVisible();
    await expect(page.locator(".empty-state h2")).toContainText("vacío");
    await expect(page.locator(".empty-state-icon")).toBeVisible();
    await expect(page.locator(".empty-state .btn")).toBeVisible();
  });

  test("quantity increase works", async ({ page }) => {
    await page.goto("/cart");

    const firstItem = page.locator(".cart-item").nth(0);
    const qtyInput = firstItem.locator(".qty-input");

    // Initial quantity is 2
    await expect(qtyInput).toHaveValue("2");

    // Click increase
    await firstItem.locator('[data-action="increase"]').click();
    await expect(qtyInput).toHaveValue("3");
  });

  test("quantity decrease works and disables at 1", async ({ page }) => {
    await page.goto("/cart");

    const secondItem = page.locator(".cart-item").nth(1);
    const qtyInput = secondItem.locator(".qty-input");
    const decreaseBtn = secondItem.locator('[data-action="decrease"]');

    // Initial quantity is 1 — decrease should be disabled
    await expect(qtyInput).toHaveValue("1");
    await expect(decreaseBtn).toBeDisabled();

    // Increase first, then decrease
    await secondItem.locator('[data-action="increase"]').click();
    await expect(qtyInput).toHaveValue("2");
    await expect(decreaseBtn).not.toBeDisabled();

    await decreaseBtn.click();
    await expect(qtyInput).toHaveValue("1");
    await expect(decreaseBtn).toBeDisabled();
  });

  test("remove item works with animation", async ({ page }) => {
    await page.goto("/cart");

    const cartItems = page.locator(".cart-item");
    await expect(cartItems).toHaveCount(2);

    // Remove first item
    await cartItems.nth(0).locator(".cart-item-remove").click();

    // Wait for animation to complete
    await page.waitForTimeout(400);

    // Should have 1 item remaining
    await expect(page.locator(".cart-item")).toHaveCount(1);
    await expect(page.locator(".cart-item-name")).toContainText("Tote Bag");
  });

  test("summary shows item count", async ({ page }) => {
    await page.goto("/cart");

    await expect(page.locator("#summary-count")).toContainText("3 productos");
  });

  test("summary updates when qty changes", async ({ page }) => {
    await page.goto("/cart");

    // Initial: 2 + 1 = 3 products
    await expect(page.locator("#summary-count")).toContainText("3 productos");

    // Increase first item quantity: 3 + 1 = 4
    await page.locator(".cart-item").nth(0).locator('[data-action="increase"]').click();
    await expect(page.locator("#summary-count")).toContainText("4 productos");
  });

  test("WhatsApp link contains correct message", async ({ page }) => {
    await page.goto("/cart");

    const whatsappBtn = page.locator("#checkout-whatsapp");
    await expect(whatsappBtn).toBeVisible();

    const href = await whatsappBtn.getAttribute("href");
    expect(href).toContain("wa.me/595991969608");
    expect(href).toContain("text=");

    // Decode and verify content
    const text = decodeURIComponent(href!.split("text=")[1]);
    expect(text).toContain("Camiseta Sublime");
    expect(text).toContain("Tote Bag");
  });

  test("header badge updates on cart page", async ({ page }) => {
    await page.goto("/cart");

    // Wait for cart items to render
    await expect(page.locator(".cart-item")).toHaveCount(2);

    // Header badge should show total items
    const badge = page.locator("#cart-count");
    await expect(badge).toBeVisible();
    await expect(badge).toContainText("3");

    // Increase first item
    await page.locator(".cart-item").nth(0).locator('[data-action="increase"]').click();

    // Badge should update to 4
    await expect(badge).toContainText("4");
  });

  test("continue shopping link works", async ({ page }) => {
    await page.goto("/cart");

    const continueLink = page.locator(".continue-shopping, .continue-link").first();
    await expect(continueLink).toBeVisible();

    const href = await continueLink.getAttribute("href");
    expect(href).toBe("/");
  });

  test("does not show placeholder products on load", async ({ page }) => {
    // Set cart data via init script
    await page.addInitScript((items) => {
      localStorage.setItem("cart", JSON.stringify(items));
    }, CART_ITEMS);

    await page.goto("/cart");

    // Wait for real cart items to render
    await expect(page.locator(".cart-item")).toHaveCount(2);

    // Verify no hardcoded placeholder text appears
    await expect(page.locator("text=Camiseta Básica")).not.toBeVisible();
  });

  test("page title is correct", async ({ page }) => {
    await page.goto("/cart");
    await expect(page).toHaveTitle(/Carrito/);
  });

  test("remove last item shows empty state", async ({ page }) => {
    await page.goto("/cart");

    // Remove first item
    await page.locator(".cart-item").nth(0).locator(".cart-item-remove").click();
    await page.waitForTimeout(400);

    // Remove second item
    await page.locator(".cart-item").nth(0).locator(".cart-item-remove").click();
    await page.waitForTimeout(400);

    // Should show empty state
    await expect(page.locator(".empty-state")).toBeVisible();
    await expect(page.locator(".empty-state h2")).toContainText("vacío");
  });
});

test.describe("Cart Page — Mobile", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript((items) => {
      localStorage.setItem("cart", JSON.stringify(items));
    }, CART_ITEMS);
  });

  test("cart items stack vertically on mobile", async ({ page }) => {
    await page.goto("/cart");

    const cartItems = page.locator(".cart-item");
    await expect(cartItems).toHaveCount(2);

    // Cart items should be visible and stacked
    const firstItem = cartItems.nth(0);
    await expect(firstItem).toBeVisible();

    // Summary should be below cart items
    const summary = page.locator(".cart-summary");
    await expect(summary).toBeVisible();
  });

  test("quantity controls are touch-friendly on mobile", async ({ page }) => {
    await page.goto("/cart");

    const firstItem = page.locator(".cart-item").nth(0);
    const btn = firstItem.locator('[data-action="increase"]');

    // Button should be large enough for touch (min 40px)
    const box = await btn.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(40);
    expect(box!.height).toBeGreaterThanOrEqual(40);
  });

  test("WhatsApp button is full width on mobile", async ({ page }) => {
    await page.goto("/cart");

    const btn = page.locator("#checkout-whatsapp");
    const box = await btn.boundingBox();
    const viewport = page.viewportSize()!;

    // Button should be wide enough (accounting for page padding)
    expect(box!.width).toBeGreaterThan(viewport.width * 0.6);
  });
});
