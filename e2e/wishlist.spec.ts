import { test, expect } from "@playwright/test";

const WISHLIST_ITEMS = [
  {
    id: "wl-1",
    slug: "camiseta-sublime",
    name: "Camiseta Sublime",
    price: 120000,
    image: "/placeholder-product.svg",
  },
  {
    id: "wl-2",
    slug: "tote-bag",
    name: "Tote Bag",
    price: 85000,
    image: "/placeholder-product.svg",
  },
];

async function setWishlist(page: import("@playwright/test").Page, items: unknown[]) {
  await page.addInitScript((wishlistItems) => {
    localStorage.setItem("wishlist", JSON.stringify(wishlistItems));
  }, items);
}

test.describe("Wishlist Page", () => {
  test.beforeEach(async ({ page }) => {
    await setWishlist(page, WISHLIST_ITEMS);
  });

  test("shows seeded items with name and formatted price", async ({ page }) => {
    await page.goto("/wishlist");

    const rows = page.locator(".wishlist-item");
    await expect(rows).toHaveCount(2);

    await expect(rows.nth(0).locator(".wishlist-item-name")).toContainText("Camiseta Sublime");
    await expect(rows.nth(0).locator(".wishlist-item-price")).toContainText("Gs. 120.000");

    await expect(rows.nth(1).locator(".wishlist-item-name")).toContainText("Tote Bag");
    await expect(rows.nth(1).locator(".wishlist-item-price")).toContainText("Gs. 85.000");
  });

  test("shows empty state when nothing is stored", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("wishlist", "[]");
    });

    await page.goto("/wishlist");

    await expect(page.locator(".empty-state")).toBeVisible();
    await expect(page.locator(".empty-state h2")).toContainText("vacía");
    await expect(page.locator(".empty-state-icon")).toBeVisible();
    await expect(page.locator(".empty-state .btn")).toHaveAttribute("href", "/");
  });

  test("remove drops the row and the last removal shows empty state", async ({ page }) => {
    await page.goto("/wishlist");

    const rows = page.locator(".wishlist-item");
    await expect(rows).toHaveCount(2);

    await rows.nth(0).locator(".wishlist-item-remove").click();
    await page.waitForTimeout(400);

    await expect(page.locator(".wishlist-item")).toHaveCount(1);
    await expect(page.locator(".wishlist-item-name")).toContainText("Tote Bag");

    await page.locator(".wishlist-item-remove").click();
    await page.waitForTimeout(400);

    await expect(page.locator(".empty-state")).toBeVisible();
    await expect(page.locator(".empty-state h2")).toContainText("vacía");
  });

  test("add to cart updates the cart badge and keeps the item in the wishlist", async ({ page }) => {
    await page.goto("/wishlist");

    await expect(page.locator(".wishlist-item")).toHaveCount(2);

    await page.locator(".wishlist-item").nth(0).locator(".wishlist-add-to-cart").click();

    await expect(page.locator("#cart-count")).toContainText("1");
    await expect(page.locator(".wishlist-item")).toHaveCount(2);
  });

  test("header badge shows the stored count", async ({ page }) => {
    await page.goto("/wishlist");

    const badge = page.locator("#wishlist-count");
    await expect(badge).toBeVisible();
    await expect(badge).toContainText("2");
  });
});

test.describe("Wishlist Page — Mobile", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await setWishlist(page, WISHLIST_ITEMS);
  });

  test("wishlist button is hidden below 768px", async ({ page }) => {
    await page.goto("/wishlist");

    await expect(page.locator("#wishlist-btn")).toBeHidden();
    await expect(page.locator(".wishlist-item")).toHaveCount(2);
  });
});
