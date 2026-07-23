/**
 * PriceTierList Tests
 */

import { describe, it, expect } from "vitest";
import { getTierPrice, getTierSavings } from "../lib/price-utils";

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

  it("getTierSavings calculates percentage correctly", () => {
    expect(getTierSavings(mockTiers[1], mockTiers)).toBe(10); // 10% savings at 10 unds
    expect(getTierSavings(mockTiers[2], mockTiers)).toBe(20); // 20% savings at 50 unds
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