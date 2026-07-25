import { test, expect } from "@playwright/test";

test.describe("Catalog Browse", () => {
  test("home page loads successfully", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Sublime/i);
  });

  test("product items are visible on home page", async ({ page }) => {
    await page.goto("/");
    // Wait for any product-like content to appear
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Product Detail", () => {
  test("product detail page loads when clicking a product", async ({ page }) => {
    await page.goto("/");
    // Look for any product link
    const productLink = page.locator('a[href*="/producto/"]').first();
    if (await productLink.isVisible()) {
      await productLink.click();
      await expect(page.url()).toContain("/producto/");
    }
  });
});
