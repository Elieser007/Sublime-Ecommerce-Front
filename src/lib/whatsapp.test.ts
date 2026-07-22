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
  { id: "1", name: "Camiseta Básica", price: 120000, quantity: 2, image: "" },
  { id: "2", name: "Tote Bag", price: 85000, quantity: 1, image: "" },
];

describe("formatGuaranies", () => {
  it("formats number as Guaraníes without decimals", () => {
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

    expect(message).toContain("Camiseta Básica");
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

    expect(textParam).toContain("Camiseta Básica");
    expect(textParam).toContain("Tote Bag");
  });
});
