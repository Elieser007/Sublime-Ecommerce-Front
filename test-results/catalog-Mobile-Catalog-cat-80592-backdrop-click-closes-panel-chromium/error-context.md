# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: catalog.spec.ts >> Mobile Catalog >> category panel backdrop click closes panel
- Location: e2e/catalog.spec.ts:295:3

# Error details

```
Error: expect(locator).not.toHaveClass(expected) failed

Locator: locator('#mobile-category-panel')
Expected pattern: not /open/
Received string: "mobile-panel-overlay open"
Timeout: 5000ms

Call log:
  - Expect "not toHaveClass" with timeout 5000ms
  - waiting for locator('#mobile-category-panel')
    13 × locator resolved to <div id="mobile-category-panel" data-astro-cid-lcdefpme="" class="mobile-panel-overlay open">…</div>
       - unexpected value "mobile-panel-overlay open"

```

```yaml
- heading "Categorías" [level=3]
- button "Cerrar panel": ✕
- list:
  - listitem: Todos
  - listitem
  - listitem
  - listitem
  - listitem
  - listitem
  - listitem
  - listitem
  - listitem
  - listitem
```

# Test source

```ts
  205 | test.describe("Mobile Catalog", () => {
  206 |   test.use({ viewport: { width: 375, height: 812 } });
  207 | 
  208 |   test("category drawer opens, selects category, and closes", async ({ page }) => {
  209 |     await page.goto("/");
  210 |     await page.click("#open-categories");
  211 |     const panel = page.locator("#mobile-category-panel");
  212 |     await expect(panel).toHaveClass(/open/);
  213 | 
  214 |     // Select a category
  215 |     const firstLabel = panel.locator(".tree-label").first();
  216 |     await firstLabel.click();
  217 |     await page.waitForTimeout(500);
  218 | 
  219 |     // Panel should close
  220 |     await expect(panel).not.toHaveClass(/open/);
  221 |   });
  222 | 
  223 |   test("category panel tree toggle expands subcategories", async ({ page }) => {
  224 |     await page.goto("/");
  225 |     await page.click("#open-categories");
  226 |     const panel = page.locator("#mobile-category-panel");
  227 |     await expect(panel).toHaveClass(/open/);
  228 | 
  229 |     // Find a tree toggle button (if any exist)
  230 |     const toggle = panel.locator(".tree-toggle").first();
  231 |     if (await toggle.isVisible()) {
  232 |       await toggle.click();
  233 |       await expect(toggle).toHaveClass(/expanded/);
  234 |     }
  235 |   });
  236 | 
  237 |   test("filter drawer opens, sorts, and closes", async ({ page }) => {
  238 |     await page.goto("/");
  239 |     await page.click("#open-filters");
  240 |     const panel = page.locator("#mobile-filters-panel");
  241 |     await expect(panel).toHaveClass(/open/);
  242 | 
  243 |     // Select a sort option
  244 |     await panel.locator('[data-sort="price-asc"]').click();
  245 |     await panel.locator("#apply-filters-mobile").click();
  246 | 
  247 |     // Panel should close (wait for animation + hidden class)
  248 |     await page.waitForTimeout(500);
  249 |     await expect(panel).not.toHaveClass(/open/);
  250 | 
  251 |     // Desktop sidebar sort should be updated (the one inside aside)
  252 |     await expect(page.locator("aside [data-sort='price-asc']")).toHaveClass(/active/);
  253 |   });
  254 | 
  255 |   test("filter panel price range inputs work", async ({ page }) => {
  256 |     await page.goto("/");
  257 |     await page.click("#open-filters");
  258 |     const panel = page.locator("#mobile-filters-panel");
  259 |     await expect(panel).toHaveClass(/open/);
  260 | 
  261 |     // Fill price range
  262 |     await panel.locator("#price-min-mobile").fill("50000");
  263 |     await panel.locator("#price-max-mobile").fill("150000");
  264 |     await panel.locator("#apply-filters-mobile").click();
  265 | 
  266 |     await page.waitForTimeout(500);
  267 |     // Clear filters should appear (price filter was applied)
  268 |     await expect(page.locator("#clear-filters")).toBeVisible();
  269 |   });
  270 | 
  271 |   test("category panel close button closes panel", async ({ page }) => {
  272 |     await page.goto("/");
  273 |     await page.click("#open-categories");
  274 |     const panel = page.locator("#mobile-category-panel");
  275 |     await expect(panel).toHaveClass(/open/);
  276 | 
  277 |     // Click close button
  278 |     await panel.locator("#close-categories").click();
  279 |     await page.waitForTimeout(500);
  280 |     await expect(panel).not.toHaveClass(/open/);
  281 |   });
  282 | 
  283 |   test("filter panel close button closes panel", async ({ page }) => {
  284 |     await page.goto("/");
  285 |     await page.click("#open-filters");
  286 |     const panel = page.locator("#mobile-filters-panel");
  287 |     await expect(panel).toHaveClass(/open/);
  288 | 
  289 |     // Click close button
  290 |     await panel.locator("#close-filters").click();
  291 |     await page.waitForTimeout(500);
  292 |     await expect(panel).not.toHaveClass(/open/);
  293 |   });
  294 | 
  295 |   test("category panel backdrop click closes panel", async ({ page }) => {
  296 |     await page.goto("/");
  297 |     await page.click("#open-categories");
  298 |     const panel = page.locator("#mobile-category-panel");
  299 |     await expect(panel).toHaveClass(/open/);
  300 | 
  301 |     // Click the overlay backdrop (the panel element itself, not the inner content)
  302 |     // The overlay is the parent; clicking outside the inner panel triggers close
  303 |     await panel.click({ position: { x: 10, y: 10 } });
  304 |     await page.waitForTimeout(500);
> 305 |     await expect(panel).not.toHaveClass(/open/);
      |                             ^ Error: expect(locator).not.toHaveClass(expected) failed
  306 |   });
  307 | 
  308 |   test("filter panel backdrop click closes panel", async ({ page }) => {
  309 |     await page.goto("/");
  310 |     await page.click("#open-filters");
  311 |     const panel = page.locator("#mobile-filters-panel");
  312 |     await expect(panel).toHaveClass(/open/);
  313 | 
  314 |     // Click the overlay backdrop
  315 |     await panel.click({ position: { x: 10, y: 10 } });
  316 |     await page.waitForTimeout(500);
  317 |     await expect(panel).not.toHaveClass(/open/);
  318 |   });
  319 | 
  320 |   test("search overlay works on mobile", async ({ page }) => {
  321 |     await page.goto("/");
  322 |     await page.click("#search-toggle");
  323 |     await expect(page.locator("#search-overlay")).toHaveClass(/open/);
  324 | 
  325 |     // Type in search
  326 |     await page.fill("#search-overlay-input", "test");
  327 |     await expect(page.locator("#search-overlay-input")).toHaveValue("test");
  328 |   });
  329 | 
  330 |   test("pagination works on mobile", async ({ page }) => {
  331 |     await page.goto("/");
  332 |     const loadMore = page.locator("#load-more");
  333 |     await expect(loadMore).toBeAttached();
  334 |   });
  335 | });
  336 | 
  337 | test.describe("Mobile Panels Hidden on Desktop", () => {
  338 |   test("mobile action buttons are hidden on desktop", async ({ page }) => {
  339 |     await page.setViewportSize({ width: 1024, height: 768 });
  340 |     await page.goto("/");
  341 |     await expect(page.locator(".mobile-actions")).toBeHidden();
  342 |   });
  343 | 
  344 |   test("mobile category panel is hidden on desktop", async ({ page }) => {
  345 |     await page.setViewportSize({ width: 1024, height: 768 });
  346 |     await page.goto("/");
  347 |     const panel = page.locator("#mobile-category-panel");
  348 |     await expect(panel).toHaveClass(/hidden/);
  349 |   });
  350 | 
  351 |   test("mobile filters panel is hidden on desktop", async ({ page }) => {
  352 |     await page.setViewportSize({ width: 1024, height: 768 });
  353 |     await page.goto("/");
  354 |     const panel = page.locator("#mobile-filters-panel");
  355 |     await expect(panel).toHaveClass(/hidden/);
  356 |   });
  357 | });
  358 | 
  359 | test.describe("Button Colors", () => {
  360 |   test("primary buttons have visible text color", async ({ page }) => {
  361 |     await page.goto("/");
  362 |     // Check the apply filters button on desktop
  363 |     const btn = page.locator("#apply-filters-desktop");
  364 |     await expect(btn).toBeVisible();
  365 |     const color = await btn.evaluate((el) => getComputedStyle(el).color);
  366 |     // Should be black (#000) for contrast on cyan background
  367 |     expect(color).toBe("rgb(0, 0, 0)");
  368 |   });
  369 | 
  370 |   test("primary button on product detail has visible text", async ({ page }) => {
  371 |     await page.goto("/");
  372 |     const productLink = page.locator('a[href*="/producto/"]').first();
  373 |     if (await productLink.isVisible()) {
  374 |       await productLink.click();
  375 |       await page.waitForLoadState("networkidle");
  376 |       const btn = page.locator("#detail-add-cart");
  377 |       if (await btn.isVisible()) {
  378 |         const color = await btn.evaluate((el) => getComputedStyle(el).color);
  379 |         expect(color).toBe("rgb(0, 0, 0)");
  380 |       }
  381 |     }
  382 |   });
  383 | });
  384 | 
  385 | test.describe("Product Detail", () => {
  386 |   test("product detail page loads when clicking a product", async ({ page }) => {
  387 |     await page.goto("/");
  388 |     const productLink = page.locator('a[href*="/producto/"]').first();
  389 |     if (await productLink.isVisible()) {
  390 |       await productLink.click();
  391 |       await expect(page.url()).toContain("/producto/");
  392 |     }
  393 |   });
  394 | });
  395 | 
```