/**
 * PriceTierList Tests
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { getTierPrice, getTierSavings } from "../lib/price-utils";

const tierListSource = readFileSync(
  resolve(__dirname, "./PriceTierList.astro"),
  "utf-8"
);

const mockTiers = [
  { id: "t1", branch_id: "b1", branch_name: "Principal", min_quantity: 1, price: 100000 },
  { id: "t2", branch_id: "b1", branch_name: "Principal", min_quantity: 10, price: 90000 },
  { id: "t3", branch_id: "b1", branch_name: "Principal", min_quantity: 50, price: 80000 },
];

describe("PriceTierList logic", () => {
  it("getTierPrice returns correct price for selected qty", () => {
    expect(getTierPrice(mockTiers, 1)).toBe(100000);
    expect(getTierPrice(mockTiers, 10)).toBe(90000);
    expect(getTierPrice(mockTiers, 50)).toBe(80000);
  });

  it("getTierSavings returns Guaraníes amount against the base row", () => {
    expect(getTierSavings(mockTiers[1], mockTiers)).toBe(10000); // Gs. 10.000 at 10 unds
    expect(getTierSavings(mockTiers[2], mockTiers)).toBe(20000); // Gs. 20.000 at 50 unds
  });

  it("handles missing base tier gracefully", () => {
    const noBase = [
      { id: "t2", branch_id: "b1", branch_name: "P", min_quantity: 10, price: 90000 },
    ];
    expect(getTierSavings(noBase[0], noBase)).toBe(0);
  });

  it("handles zero base price", () => {
    const zeroBase = [
      { id: "t1", branch_id: "b1", branch_name: "P", min_quantity: 1, price: 0 },
      { id: "t2", branch_id: "b1", branch_name: "P", min_quantity: 10, price: 90000 },
    ];
    expect(getTierSavings(zeroBase[1], zeroBase)).toBe(0);
  });
});

describe("PriceTierList markup (D1-D4)", () => {
  it("renders savings as a Guaraníes amount, not a percentage", () => {
    expect(tierListSource).toContain("Ahorro: Gs.");
    expect(tierListSource).toContain("formatPrice(savings)");
    expect(tierListSource).not.toContain("{savings}%");
  });

  it("dispatches tier-add with min_quantity from each row's + button", () => {
    expect(tierListSource).toContain("'tier-add'");
    expect(tierListSource).toContain("tier-add-btn");
    expect(tierListSource).toContain("data-tiers");
  });

  it("reacts to number-input:change to move the active row", () => {
    expect(tierListSource).toContain("number-input:change");
    expect(tierListSource).toContain("tier-row--active");
  });

  it("blinks the active row and disables the blink under reduced motion", () => {
    expect(tierListSource).toContain("tier-row--blink");
    expect(tierListSource).toContain("prefers-reduced-motion");
  });
});
