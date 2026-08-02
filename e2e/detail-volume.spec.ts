import { test, expect } from "@playwright/test";

function guaranies(n: number): string {
  return new Intl.NumberFormat("es-PY", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(n);
}

// camiseta-gimnasio is a seeded product with volume tiers (1 / 10 / 50 units).
test.describe("Detail Volume UI (D2/D3)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/producto/camiseta-gimnasio");
  });

  test("renders a real select with real option elements", async ({ page }) => {
    const select = page.locator(".volume-selector-select");
    await expect(select).toBeVisible();

    const options = select.locator("option");
    expect(await options.count()).toBeGreaterThanOrEqual(3);

    for (let i = 0; i < await options.count(); i++) {
      const qty = await options.nth(i).getAttribute("data-qty");
      const price = await options.nth(i).getAttribute("data-price");
      expect(qty).not.toBeNull();
      expect(price).not.toBeNull();
      expect(Number(price)).toBeGreaterThan(0);
    }

    // Regression: no inert unregistered custom element tags
    await expect(page.locator("volume-price-selector")).toHaveCount(0);
    await expect(page.locator("price-tier-list")).toHaveCount(0);
  });

  test("tier list table renders with rows", async ({ page }) => {
    const table = page.locator(".tier-table");
    await expect(table).toBeVisible();
    expect(await table.locator("tbody tr").count()).toBeGreaterThanOrEqual(3);
  });

  test("selecting a tier updates the unit price display", async ({ page }) => {
    const select = page.locator(".volume-selector-select");
    await select.selectOption({ index: 2 });

    const expectedPrice = await select.locator("option").nth(2).getAttribute("data-price");
    await expect(page.locator("#detail-price")).toContainText(guaranies(Number(expectedPrice)));
  });

  test("WhatsApp total equals qty x per-unit tier price", async ({ page }) => {
    const select = page.locator(".volume-selector-select");
    await select.selectOption({ index: 2 });

    const option = select.locator("option").nth(2);
    const unitPrice = Number(await option.getAttribute("data-price"));
    const qty = Number(await option.getAttribute("data-qty"));

    const href = await page.locator("#detail-whatsapp").getAttribute("href");
    expect(href).toContain("wa.me/");

    const message = decodeURIComponent(href!.split("?text=")[1]);
    expect(message).toContain(`${qty}xGs. ${guaranies(unitPrice)}`);
    expect(message).toContain(`*Total: Gs. ${guaranies(unitPrice * qty)}*`);
  });

  test("quantity stepper is visible and qty change updates price", async ({ page }) => {
    await expect(page.locator("#quantity-stepper-section")).toBeVisible();

    // Page script attaches its listeners on astro:page-load (proves the wa.me link is set)
    await expect(page.locator("#detail-whatsapp")).toHaveAttribute("href", /wa\.me\//);

    const numInput = page.locator("#quantity-stepper-section number-input");
    await expect(numInput).toBeAttached();

    await numInput.evaluate((el) => {
      el.dispatchEvent(
        new CustomEvent("number-input:change", {
          detail: { value: 10 },
          bubbles: true,
        })
      );
    });

    // 10 units qualifies the 10+ tier
    await expect(page.locator("#detail-price")).toContainText("117.000");
  });
});
