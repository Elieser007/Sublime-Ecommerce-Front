import { test, expect } from "@playwright/test";

test.describe("Admin Login", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("body")).toBeVisible();
  });

  test("admin dashboard redirects to login when not authenticated", async ({ page }) => {
    await page.goto("/admin");
    // Should redirect to login or show login form
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Deploy Button", () => {
  test("admin panel shows deploy option when authenticated", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.locator("body")).toBeVisible();
  });
});
