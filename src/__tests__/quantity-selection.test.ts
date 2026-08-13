/**
 * Quantity Selection — Static Source Tests (quantity-9999-dynamic-width)
 *
 * Asserts the unified 9999 cap and the digit-driven dynamic width wiring
 * across every customer quantity selector, using the detail-volume pattern:
 * readFileSync markers against the edited sources.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const numberInputSource = readFileSync(
  resolve(__dirname, "../components/number-input.js"),
  "utf-8"
);
const modalSource = readFileSync(
  resolve(__dirname, "../components/variant-modal.js"),
  "utf-8"
);
const detailSource = readFileSync(
  resolve(__dirname, "../pages/products/[slug].astro"),
  "utf-8"
);
const cartPageSource = readFileSync(
  resolve(__dirname, "../pages/cart.astro"),
  "utf-8"
);
const numberInputAstroSource = readFileSync(
  resolve(__dirname, "../components/NumberInput.astro"),
  "utf-8"
);
const cartLibSource = readFileSync(
  resolve(__dirname, "../lib/cart.js"),
  "utf-8"
);

describe("number-input.js — unified 9999 max + dynamic width", () => {
  it("defaults #max to 9999", () => {
    expect(numberInputSource).toContain("'9999'");
  });

  it("applies the digit-driven width from qtyDisplayWidth", () => {
    expect(numberInputSource).toContain("qtyDisplayWidth");
    expect(numberInputSource).toContain("style.width");
  });

  it("styles the display with a 40px desktop min-width", () => {
    expect(numberInputSource).toContain("min-width: 40px");
  });

  it("styles the display with a 44px mobile min-width", () => {
    expect(numberInputSource).toContain("min-width: 44px");
  });
});

describe("variant-modal.js — 9999 bound + dynamic width", () => {
  it("bounds _adjustQuantity at 9999", () => {
    expect(modalSource).toContain("next > 9999");
  });

  it("applies the digit-driven width on every quantity change", () => {
    expect(modalSource).toContain("qtyDisplayWidth(this._quantity)");
  });

  it("styles .qty-value with a 40px desktop min-width", () => {
    expect(modalSource).toContain("min-width: 40px");
  });
});

describe("[slug].astro — 9999 cap on the tier-select handler", () => {
  it("renders data-max=\"9999\" on the quantity stepper", () => {
    expect(detailSource).toContain('data-max="9999"');
  });

  it("clamps applied tier minimums with Math.min(9999, qty)", () => {
    expect(detailSource).toContain("Math.min(9999, qty)");
  });
});

describe("cart.astro — 9999 cap + 4-digit grid fit", () => {
  it("renders data-max=\"9999\" on cart quantity inputs", () => {
    expect(cartPageSource).toContain('data-max="9999"');
  });

  it("widens the desktop qty column to 150px", () => {
    expect(cartPageSource).toContain("150px 110px 40px");
  });

  it("widens the tablet qty column to 140px", () => {
    expect(cartPageSource).toContain("140px 110px 36px");
  });
});

describe("NumberInput.astro — 9999 default", () => {
  it("defaults the max prop to 9999", () => {
    expect(numberInputAstroSource).toContain("max = 9999");
  });
});

describe("cart.js — library enforcement point", () => {
  it("exports MAX_QUANTITY = 9999", () => {
    expect(cartLibSource).toContain("MAX_QUANTITY = 9999");
  });
});
