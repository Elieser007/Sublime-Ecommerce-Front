/**
 * WhatsApp Checkout Tests — Tarea 4
 * 
 * Tests for generating wa.me links from cart data:
 * - Reads cart array
 * - Calculates subtotals and total in Gs.
 * - Generates valid wa.me URL
 * - Message is structured and readable
 * - encodeURIComponent used for message
 */

import { describe, it, expect } from "vitest";
import { generateWhatsAppUrl, formatGuaranies, buildCartMessage } from "./whatsapp";

// Mock cart data
const mockCart = [
  { id: "1", name: "Camiseta Basica", price: 120000, quantity: 2, image: "" },
  { id: "2", name: "Tote Bag", price: 85000, quantity: 1, image: "" },
];

describe("formatGuaranies", () => {
  it("formats number as Guaranies without decimals", () => {
    expect(formatGuaranies(120000)).toBe("120.000");
  });

  it("handles zero", () => {
    expect(formatGuaranies(0)).toBe("0");
  });

  it("handles small numbers", () => {
    expect(formatGuaranies(1500)).toBe("1.500");
  });

  it("handles large numbers", () => {
    expect(formatGuaranies(1250000)).toBe("1.250.000");
  });
});

describe("buildCartMessage", () => {
  it("builds readable message with products", () => {
    const message = buildCartMessage(mockCart);

    expect(message).toContain("Camiseta Basica");
    expect(message).toContain("Tote Bag");
  });

  it("includes quantities", () => {
    const message = buildCartMessage(mockCart);

    expect(message).toContain("2x");
    expect(message).toContain("1x");
  });

  it("includes prices in Gs.", () => {
    const message = buildCartMessage(mockCart);

    expect(message).toContain("120.000");
    expect(message).toContain("85.000");
  });

  it("includes total", () => {
    const message = buildCartMessage(mockCart);

    // Total: (120000 * 2) + (85000 * 1) = 325000
    expect(message).toContain("325.000");
  });

  it("has order confirmation line", () => {
    const message = buildCartMessage(mockCart);

    expect(message).toContain("Confirmo mi pedido");
  });

  it("handles empty cart", () => {
    const message = buildCartMessage([]);

    expect(message).toContain("Pedido");
  });

  it("uses tier price and shows tier info when selected_tier_price is set", () => {
    const cartWithTier = [
      { id: "1", name: "Producto Volumen", price: 100000, quantity: 10, selected_tier_id: "tier-10", selected_tier_price: 90000, selected_tier_min_qty: 10 },
    ];
    const message = buildCartMessage(cartWithTier);
    expect(message).toContain("90.000"); // tier price
    expect(message).toContain("Precio por volumen");
    expect(message).toContain("10+ unds");
  });

  it("shows warning when qty < tier min_qty", () => {
    const cartWithTier = [
      { id: "1", name: "Producto Volumen", price: 100000, quantity: 5, selected_tier_id: "tier-10", selected_tier_price: 90000, selected_tier_min_qty: 10 },
    ];
    const message = buildCartMessage(cartWithTier);
    expect(message).toContain("\u26A0\uFE0F");
    expect(message).toContain("Precio v\u00E1lido para 10+ unidades");
    expect(message).toContain("Cantidad actual: 5");
  });

  it("does not show warning when qty >= tier min_qty", () => {
    const cartWithTier = [
      { id: "1", name: "Producto Volumen", price: 100000, quantity: 10, selected_tier_id: "tier-10", selected_tier_price: 90000, selected_tier_min_qty: 10 },
    ];
    const message = buildCartMessage(cartWithTier);
    expect(message).not.toContain("\u26A0\uFE0F");
    expect(message).not.toContain("Precio v\u00E1lido");
  });

  it("works with legacy items without tier fields (backward compat)", () => {
    const legacyCart = [{ id: "1", name: "Legado", price: 50000, quantity: 3 }];
    const message = buildCartMessage(legacyCart);
    expect(message).toContain("50.000");
    expect(message).toContain("150.000"); // 3 * 50000
    expect(message).not.toContain("Precio por volumen");
  });

  it("includes selected attributes in message", () => {
    const cartWithAttributes = [
      {
        id: "1",
        name: "Remera Basica",
        price: 15500,
        quantity: 1,
        selected_attributes: {
          "mod-color": { value_id: "val-rojo", label: "Rojo", raw_value: "#FF0000" },
          "mod-size": { value_id: "val-xl", label: "XL", raw_value: "XL" },
        },
      },
    ];
    const message = buildCartMessage(cartWithAttributes);
    expect(message).toContain("Rojo");
    expect(message).toContain("XL");
    expect(message).toContain("Remera Basica");
  });

  it("works with items without selected_attributes (backward compat)", () => {
    const cartWithoutAttributes = [
      { id: "1", name: "Sin Atributos", price: 10000, quantity: 1 },
    ];
    const message = buildCartMessage(cartWithoutAttributes);
    expect(message).toContain("Sin Atributos");
    expect(message).toContain("10.000");
  });

  it("shows the tier line for a modal-added item without any quantity change (D4)", () => {
    const tiers = [
      { id: "t1", branch_id: "b1", branch_name: "B", min_quantity: 1, price: 20000 },
      { id: "t2", branch_id: "b1", branch_name: "B", min_quantity: 24, price: 17000 },
    ];
    const cart = [
      {
        id: "1", name: "Producto Modal", price: 20000, image: "", quantity: 24,
        price_tiers: tiers, selected_tier_id: "t2", selected_tier_price: 17000, selected_tier_min_qty: 24,
      },
    ];
    const message = buildCartMessage(cart);
    expect(message).toContain("Precio por volumen");
    expect(message).toContain("24+ unds");
    expect(message).not.toContain("\u26A0\uFE0F");
  });

  it("totals qty x per-unit tier price plus surcharges without double-counting (D4)", () => {
    const tiers = [
      { id: "t1", branch_id: "b1", branch_name: "B", min_quantity: 1, price: 20000 },
      { id: "t2", branch_id: "b1", branch_name: "B", min_quantity: 24, price: 17000 },
    ];
    const cart = [
      {
        id: "1", name: "Producto Modal", price: 20000, image: "", quantity: 24,
        price_tiers: tiers, selected_tier_id: "t2", selected_tier_price: 17000, selected_tier_min_qty: 24,
        selected_attributes: { "mod-size": { value_id: "v-s", label: "S", raw_value: "S", price_modifier: 1000 } },
      },
    ];
    const message = buildCartMessage(cart);
    // unit = 17000 + 1000 = 18000; subtotal = 24 x 18000 = 432.000
    expect(message).toContain("24xGs. 18.000 = *Gs. 432.000*");
    expect(message).toContain("*Total: Gs. 432.000*");
  });

  it("shows the PURE applicable tier price in the volume line, ignoring modifiers (recompute-first)", () => {
    const tiers = [
      { id: "t1", branch_id: "b1", branch_name: "B", min_quantity: 1, price: 20000 },
      { id: "t2", branch_id: "b1", branch_name: "B", min_quantity: 24, price: 17000 },
    ];
    const cart = [
      {
        id: "1", name: "Producto Volumen", price: 20000, image: "", quantity: 24,
        price_tiers: tiers, selected_tier_id: "t2", selected_tier_price: 17000, selected_tier_min_qty: 24,
        selected_attributes: { "mod-size": { value_id: "v-s", label: "S", raw_value: "S", price_modifier: 1000 } },
      },
    ];
    const message = buildCartMessage(cart);
    // 📦 shows tier price 17.000, never the modifier-inclusive 18.000
    expect(message).toContain("24+ unds): Gs. 17.000/u");
    expect(message).not.toContain("24+ unds): Gs. 18.000");
    // Unit line and totals keep the modifier-inclusive effective price
    expect(message).toContain("24xGs. 18.000 = *Gs. 432.000*");
    expect(message).toContain("*Total: Gs. 432.000*");
  });

  it("does not show a volume line or legacy warning when tiers exist but none applies", () => {
    const tiers = [
      { id: "t1", branch_id: "b1", branch_name: "B", min_quantity: 10, price: 18000 },
    ];
    const cart = [
      {
        id: "1", name: "Producto Volumen", price: 20000, image: "", quantity: 2,
        price_tiers: tiers, selected_tier_id: "t1", selected_tier_price: 18000, selected_tier_min_qty: 10,
      },
    ];
    const message = buildCartMessage(cart);
    expect(message).not.toContain("Precio por volumen");
    expect(message).not.toContain("\u26A0\uFE0F");
  });
});

describe("generateWhatsAppUrl", () => {
  it("generates valid wa.me URL", () => {
    const url = generateWhatsAppUrl(mockCart, "595991969608");

    expect(url).toMatch(/^https:\/\/wa\.me\/595991969608\?text=/);
  });

  it("encodes message in URL", () => {
    const url = generateWhatsAppUrl(mockCart, "595991969608");

    // URL should contain encoded text parameter
    expect(url).toContain("text=");
    expect(url).not.toContain(" ");
  });

  it("returns hash for empty cart", () => {
    const url = generateWhatsAppUrl([], "595991969608");

    expect(url).toBe("#");
  });

  it("includes product names in encoded text", () => {
    const url = generateWhatsAppUrl(mockCart, "595991969608");
    const textParam = decodeURIComponent(url.split("text=")[1]);

    expect(textParam).toContain("Camiseta Basica");
    expect(textParam).toContain("Tote Bag");
  });
});