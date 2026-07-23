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