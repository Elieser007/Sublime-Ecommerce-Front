/**
 * VolumePriceBadge Tests
 */

import { describe, it, expect, vi } from "vitest";
import { getBestVolumeBadge, formatTierLabel } from "../lib/price-utils";

// Mock the component behavior
const mockTiers = [
  { id: "t1", branch_id: "b1", branch_name: "Principal", min_quantity: 1, price: 100000 },
  { id: "t2", branch_id: "b1", branch_name: "Principal", min_quantity: 10, price: 90000 },
  { id: "t3", branch_id: "b1", branch_name: "Principal", min_quantity: 50, price: 80000 },
];

describe("VolumePriceBadge logic", () => {
  it("getBestVolumeBadge returns null for empty tiers", () => {
    expect(getBestVolumeBadge([])).toBeNull();
  });

  it("getBestVolumeBadge returns null for only base tier", () => {
    const onlyBase = [{ id: "t1", branch_id: "b1", branch_name: "P", min_quantity: 1, price: 100000 }];
    expect(getBestVolumeBadge(onlyBase)).toBeNull();
  });

  it("getBestVolumeBadge returns lowest price discount tier", () => {
    const result = getBestVolumeBadge(mockTiers);
    expect(result).not.toBeNull();
    expect(result!.min_quantity).toBe(50);
    expect(result!.price).toBe(80000);
  });

  it("formatTierLabel formats correctly", () => {
    const tier = { id: "t1", branch_id: "b1", branch_name: "P", min_quantity: 10, price: 90000 };
    expect(formatTierLabel(tier)).toBe("Desde 10 unds: Gs. 90.000");
  });

  it("formatTierLabel handles large numbers", () => {
    const tier = { id: "t1", branch_id: "b1", branch_name: "P", min_quantity: 100, price: 1500000 };
    expect(formatTierLabel(tier)).toBe("Desde 100 unds: Gs. 1.500.000");
  });
});