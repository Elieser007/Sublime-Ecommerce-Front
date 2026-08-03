import { test, expect } from "@playwright/test";

const CART_ITEMS = [
  {
    id: "test-1",
    composite_key: "test-1:mod-1=v1~mod-2=v2",
    name: "Camiseta Sublime",
    price: 120000,
    image: "/placeholder-product.svg",
    quantity: 2,
    selected_attributes: {
      "mod-1": { value_id: "v1", label: "Rojo", raw_value: "Rojo" },
      "mod-2": { value_id: "v2", label: "XL", raw_value: "XL" },
    },
    price_tiers: [
      { min_quantity: 1, price: 120000 },
      { min_quantity: 15, price: 100000 },
    ],
  },
  {
    id: "test-2",
    composite_key: "test-2",
    name: "Tote Bag",
    price: 85000,
    image: "/placeholder-product.svg",
    quantity: 1,
  },
];

async function setCart(page: import("@playwright/test").Page, items: typeof CART_ITEMS) {
  await page.addInitScript((cartItems) => {
    localStorage.setItem("cart", JSON.stringify(cartItems));
  }, items);
}

async function getCartItem(page: import("@playwright/test").Page, index: number) {
  return page.locator(".cart-item").nth(index);
}

async function clickInc(page: import("@playwright/test").Page, itemIndex: number) {
  const item = await getCartItem(page, itemIndex);
  await item.getByRole("button", { name: "Aumentar" }).click();
}

async function clickDec(page: import("@playwright/test").Page, itemIndex: number) {
  const item = await getCartItem(page, itemIndex);
  await item.getByRole("button", { name: "Disminuir" }).click();
}

async function getQtyValue(page: import("@playwright/test").Page, itemIndex: number) {
  const item = await getCartItem(page, itemIndex);
  return item.getByRole("spinbutton", { name: "Cantidad" });
}

test.describe("Cart Page", () => {
  test.beforeEach(async ({ page }) => {
    await setCart(page, CART_ITEMS);
  });

  test("shows cart items with correct layout", async ({ page }) => {
    await page.goto("/cart");

    const cartItems = page.locator(".cart-item");
    await expect(cartItems).toHaveCount(2);

    const firstItem = cartItems.nth(0);
    await expect(firstItem.locator(".cart-item-name")).toContainText("Camiseta Sublime");
    await expect(await getQtyValue(page, 0)).toHaveValue("2");

    const secondItem = cartItems.nth(1);
    await expect(secondItem.locator(".cart-item-name")).toContainText("Tote Bag");
    await expect(await getQtyValue(page, 1)).toHaveValue("1");
  });

  test("shows empty cart state with illustration", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("cart", "[]");
    });

    await page.goto("/cart");

    await expect(page.locator(".empty-state")).toBeVisible();
    await expect(page.locator(".empty-state h2")).toContainText("vacío");
    await expect(page.locator(".empty-state-icon")).toBeVisible();
    await expect(page.locator(".empty-state .btn")).toBeVisible();
  });

  test("quantity increase works", async ({ page }) => {
    await page.goto("/cart");

    await expect(await getQtyValue(page, 0)).toHaveValue("2");

    await clickInc(page, 0);
    await expect(await getQtyValue(page, 0)).toHaveValue("3");
  });

  test("quantity decrease works and disables at 1", async ({ page }) => {
    await page.goto("/cart");

    const qty = await getQtyValue(page, 1);
    const item = await getCartItem(page, 1);
    const decBtn = item.getByRole("button", { name: "Disminuir" });

    await expect(qty).toHaveValue("1");
    await expect(decBtn).toBeDisabled();

    await clickInc(page, 1);
    await expect(qty).toHaveValue("2");
    await expect(decBtn).not.toBeDisabled();

    await clickDec(page, 1);
    await expect(qty).toHaveValue("1");
    await expect(decBtn).toBeDisabled();
  });

  test("remove item works with animation", async ({ page }) => {
    await page.goto("/cart");

    const cartItems = page.locator(".cart-item");
    await expect(cartItems).toHaveCount(2);

    await cartItems.nth(0).locator(".cart-item-remove").click();
    await page.waitForTimeout(400);

    await expect(page.locator(".cart-item")).toHaveCount(1);
    await expect(page.locator(".cart-item-name")).toContainText("Tote Bag");
  });

  test("summary shows item count", async ({ page }) => {
    await page.goto("/cart");

    await expect(page.locator("#summary-count")).toContainText("3 productos");
  });

  test("summary updates when qty changes", async ({ page }) => {
    await page.goto("/cart");

    await expect(page.locator("#summary-count")).toContainText("3 productos");

    await clickInc(page, 0);
    await expect(page.locator("#summary-count")).toContainText("4 productos");
  });

  test("WhatsApp link contains correct message", async ({ page }) => {
    await page.goto("/cart");

    const whatsappBtn = page.locator("#checkout-whatsapp");
    await expect(whatsappBtn).toBeVisible();

    const href = await whatsappBtn.getAttribute("href");
    expect(href).toContain("wa.me/595991969608");
    expect(href).toContain("text=");

    const text = decodeURIComponent(href!.split("text=")[1]);
    expect(text).toContain("Camiseta Sublime");
    expect(text).toContain("Tote Bag");
  });

  test("header badge updates on cart page", async ({ page }) => {
    await page.goto("/cart");

    await expect(page.locator(".cart-item")).toHaveCount(2);

    const badge = page.locator("#cart-count");
    await expect(badge).toBeVisible();
    await expect(badge).toContainText("3");

    await clickInc(page, 0);
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
    await page.goto("/cart");

    await expect(page.locator(".cart-item")).toHaveCount(2);
    await expect(page.locator("text=Camiseta Básica")).not.toBeVisible();
  });

  test("page title is correct", async ({ page }) => {
    await page.goto("/cart");
    await expect(page).toHaveTitle(/Carrito/);
  });

  test("remove last item shows empty state", async ({ page }) => {
    await page.goto("/cart");

    await page.locator(".cart-item").nth(0).locator(".cart-item-remove").click();
    await page.waitForTimeout(400);

    await page.locator(".cart-item").nth(0).locator(".cart-item-remove").click();
    await page.waitForTimeout(400);

    await expect(page.locator(".empty-state")).toBeVisible();
    await expect(page.locator(".empty-state h2")).toContainText("vacío");
  });

  test("shows attribute labels for cart item with selected_attributes", async ({ page }) => {
    await page.goto("/cart");

    const firstItem = page.locator(".cart-item").nth(0);
    await expect(firstItem.locator(".cart-item-attrs")).toBeVisible();
    await expect(firstItem.locator(".cart-item-attrs")).toContainText("Rojo | XL");

    const secondItem = page.locator(".cart-item").nth(1);
    await expect(secondItem.locator(".cart-item-attrs")).not.toBeVisible();
  });

  test("shows tier badge for cart item with price_tiers (recompute-first)", async ({ page }) => {
    await page.goto("/cart");

    const firstItem = page.locator(".cart-item").nth(0);
    await expect(firstItem.locator(".cart-item-tier-badge")).toBeVisible();
    await expect(firstItem.locator(".cart-item-tier-badge")).toContainText("Desde 1 unds");
    await expect(firstItem.locator(".cart-item-tier-badge")).toContainText("120.000");

    const secondItem = page.locator(".cart-item").nth(1);
    await expect(secondItem.locator(".cart-item-tier-badge")).not.toBeVisible();
  });

  test("tier badge switches live to the cheapest tier and activates at qty 15", async ({ page }) => {
    await page.goto("/cart");

    const firstItem = page.locator(".cart-item").nth(0);
    const badge = firstItem.locator(".cart-item-tier-badge");
    await expect(badge).toContainText("Desde 1 unds");
    await expect(badge).toContainText("120.000");
    await expect(badge).not.toHaveClass(/cart-item-tier-badge--active/);

    // qty 2 -> 15 (13 increments)
    for (let i = 0; i < 13; i++) {
      await clickInc(page, 0);
    }
    await expect(await getQtyValue(page, 0)).toHaveValue("15");
    await expect(badge).toContainText("Desde 15 unds");
    await expect(badge).toContainText("100.000");
    await expect(badge).toHaveClass(/cart-item-tier-badge--active/);
  });

  test("unit price and subtotal recompute live on quantity change", async ({ page }) => {
    await page.goto("/cart");

    const firstItem = page.locator(".cart-item").nth(0);
    const priceEl = firstItem.locator(".cart-item-price");
    const totalEl = firstItem.locator(".cart-item-total");

    // qty 2 applies tier [1 -> 120000]: unit 120.000, subtotal 240.000
    await expect(priceEl).toContainText("Gs. 120.000 c/u");
    await expect(totalEl).toContainText("Gs. 240.000");

    // qty 2 -> 15 (13 increments) applies tier [15 -> 100000]: unit 100.000, subtotal 1.500.000
    for (let i = 0; i < 13; i++) {
      await clickInc(page, 0);
    }
    await expect(await getQtyValue(page, 0)).toHaveValue("15");
    await expect(priceEl).toContainText("Gs. 100.000 c/u");
    await expect(totalEl).toContainText("Gs. 1.500.000");
  });

  test("renders 'Type: Label' attribute prefix from type_name (detail add path)", async ({ page }) => {
    const items = [
      {
        id: "test-3",
        composite_key: "test-3:mod-color=v-azul",
        name: "Remera Azul",
        price: 100000,
        image: "/placeholder-product.svg",
        quantity: 1,
        selected_attributes: {
          "mod-color": { value_id: "v-azul", label: "Azul", raw_value: "Azul", type_name: "Color" },
        },
      },
    ];
    await setCart(page, items);

    await page.goto("/cart");

    await expect(page.locator(".cart-item-attrs")).toContainText("Color: Azul");
  });

  test("falls back to module_name prefix for legacy attribute payloads", async ({ page }) => {
    const items = [
      {
        id: "test-4",
        composite_key: "test-4:mod-talla=v-xl",
        name: "Remera XL",
        price: 100000,
        image: "/placeholder-product.svg",
        quantity: 1,
        selected_attributes: {
          "mod-talla": { value_id: "v-xl", label: "XL", raw_value: "XL", module_name: "Talla" },
        },
      },
    ];
    await setCart(page, items);

    await page.goto("/cart");

    await expect(page.locator(".cart-item-attrs")).toContainText("Talla: XL");
  });

  test("composite key identity: same product ID with different attributes are separate items", async ({ page }) => {
    const items = [
      {
        id: "shared-1",
        composite_key: "shared-1:mod-1=v1",
        name: "Camiseta Roja",
        price: 100000,
        image: "/placeholder-product.svg",
        quantity: 1,
        selected_attributes: {
          "mod-1": { value_id: "v1", label: "Rojo", raw_value: "Rojo" },
        },
      },
      {
        id: "shared-1",
        composite_key: "shared-1:mod-1=v2",
        name: "Camiseta Azul",
        price: 100000,
        image: "/placeholder-product.svg",
        quantity: 2,
        selected_attributes: {
          "mod-1": { value_id: "v2", label: "Azul", raw_value: "Azul" },
        },
      },
    ];
    await setCart(page, items);

    await page.goto("/cart");

    const cartItems = page.locator(".cart-item");
    await expect(cartItems).toHaveCount(2);
    await expect(cartItems.nth(0).locator(".cart-item-name")).toContainText("Camiseta Roja");
    await expect(cartItems.nth(1).locator(".cart-item-name")).toContainText("Camiseta Azul");

    await cartItems.nth(0).locator(".cart-item-remove").click();
    await page.waitForTimeout(400);

    await expect(page.locator(".cart-item")).toHaveCount(1);
    await expect(page.locator(".cart-item-name")).toContainText("Camiseta Azul");
  });

  test("quantity persists after page reload", async ({ page }) => {
    await page.goto("/cart");

    await expect(await getQtyValue(page, 0)).toHaveValue("2");

    await clickInc(page, 0);
    await expect(await getQtyValue(page, 0)).toHaveValue("3");

    const updatedCart = await page.evaluate(() => localStorage.getItem("cart"));
    await page.addInitScript((cart) => {
      localStorage.setItem("cart", cart);
    }, updatedCart);

    await page.reload();

    await expect(await getQtyValue(page, 0)).toHaveValue("3");
  });
});

test.describe("Cart Page — Mobile", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await setCart(page, CART_ITEMS);
  });

  test("cart items stack vertically on mobile", async ({ page }) => {
    await page.goto("/cart");

    const cartItems = page.locator(".cart-item");
    await expect(cartItems).toHaveCount(2);

    const firstItem = cartItems.nth(0);
    await expect(firstItem).toBeVisible();

    const summary = page.locator(".cart-summary");
    await expect(summary).toBeVisible();
  });

  test("quantity controls are touch-friendly on mobile", async ({ page }) => {
    await page.goto("/cart");

    const incBtn = (await getCartItem(page, 0)).getByRole("button", { name: "Aumentar" });
    const box = await incBtn.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(40);
    expect(box!.height).toBeGreaterThanOrEqual(40);
  });

  test("WhatsApp button is full width on mobile", async ({ page }) => {
    await page.goto("/cart");

    const btn = page.locator("#checkout-whatsapp");
    const box = await btn.boundingBox();
    const viewport = page.viewportSize()!;

    expect(box!.width).toBeGreaterThan(viewport.width * 0.6);
  });

  test("no horizontal overflow on cart page", async ({ page }) => {
    await page.goto("/cart");
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test("remove item works on mobile", async ({ page }) => {
    await page.goto("/cart");
    const cartItems = page.locator(".cart-item");
    await expect(cartItems).toHaveCount(2);

    await cartItems.nth(0).locator(".cart-item-remove").click();
    await page.waitForTimeout(400);

    await expect(page.locator(".cart-item")).toHaveCount(1);
  });

  test("quantity increase works on mobile", async ({ page }) => {
    await page.goto("/cart");

    await expect(await getQtyValue(page, 0)).toHaveValue("2");

    await clickInc(page, 0);
    await expect(await getQtyValue(page, 0)).toHaveValue("3");
  });
});
