import { test, expect } from "@playwright/test";

test.describe("Cart Flow", () => {
  test("cart page is accessible", async ({ page }) => {
    await page.goto("/cart");
    await expect(page.locator("body")).toBeVisible();
  });
});
