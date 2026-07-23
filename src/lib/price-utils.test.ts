/**
 * Price Utils Tests — Pure function tests
 */

import { describe, it, expect } from "vitest";
import {
  getBestVolumeBadge,
  getTierPrice,
  formatTierLabel,
  getTierSavings,
  getTierForQuantity,
  isBestVolumeTier,
} from "./price-utils";

const mockTiers = [
  { id: "t1", branch_id: "b1", branch_name: "Principal", min_quantity: 1, price: 100000 },
  { id: "t2", branch_id: "b1", branch_name: "Principal", min_quantity: 10, price: 90000 },
  { id: "t3", branch_id: "b1", branch_name: "Principal", min_quantity: 50, price: 80000 },
];

const mockTiersOnlyBase = [
  { id: "t1", branch_id: "b1", branch_name: "Principal", min_quantity: 1, price: 100000 },
];

const emptyTiers: typeof mockTiers = [];

describe("getBestVolumeBadge", () => {
  it("returns null for empty tiers", () => {
    expect(getBestVolumeBadge(emptyTiers)).toBeNull();
  });

  it("returns null when only base tier exists", () => {
    expect(getBestVolumeBadge(mockTiersOnlyBase)).toBeNull();
  });

  it("returns tier with lowest price among volume tiers", () => {
    const best = getBestVolumeBadge(mockTiers);
    expect(best).not.toBeNull();
    expect(best!.id).toBe("t3");
    expect(best!.min_quantity).toBe(50);
  });

  it("handles unsorted tiers", () => {
    const unsorted = [
      { id: "a", branch_id: "b1", branch_name: "P", min_quantity: 10, price: 90000 },
      { id: "b", branch_id: "b1", branch_name: "P", min_quantity: 1, price: 100000 },
      { id: "c", branch_id: "b1", branch_name: "P", min_quantity: 50, price: 80000 },
    ];
    const best = getBestVolumeBadge(unsorted);
    expect(best!.id).toBe("c");
  });
});

describe("getTierPrice", () => {
  it("returns 0 for empty tiers", () => {
    expect(getTierPrice(emptyTiers, 10)).toBe(0);
  });

  it("returns base price for qty = 1", () => {
    expect(getTierPrice(mockTiers, 1)).toBe(100000);
  });

  it("returns tier price for qty >= tier min", () => {
    expect(getTierPrice(mockTiers, 10)).toBe(90000);
    expect(getTierPrice(mockTiers, 50)).toBe(80000);
  });

  it("returns base price for qty between tiers", () => {
    expect(getTierPrice(mockTiers, 5)).toBe(100000);
    expect(getTierPrice(mockTiers, 25)).toBe(90000);
  });

  it("handles qty larger than all tiers", () => {
    expect(getTierPrice(mockTiers, 100)).toBe(80000);
  });

  it("works with only base tier", () => {
    expect(getTierPrice(mockTiersOnlyBase, 1)).toBe(100000);
    expect(getTierPrice(mockTiersOnlyBase, 100)).toBe(100000);
  });
});

describe("formatTierLabel", () => {
  it("formats correctly with Guaraníes formatting", () => {
    const tier = { id: "t2", branch_id: "b1", branch_name: "P", min_quantity: 10, price: 90000 };
    expect(formatTierLabel(tier)).toBe("Desde 10 unds: Gs. 90.000");
  });

  it("handles large prices", () => {
    const tier = { id: "t1", branch_id: "b1", branch_name: "P", min_quantity: 1, price: 1500000 };
    expect(formatTierLabel(tier)).toBe("Desde 1 unds: Gs. 1.500.000");
  });
});

describe("getTierSavings", () => {
  it("calculates percentage savings correctly", () => {
    expect(getTierSavings(mockTiers[1], mockTiers)).toBe(10);
    expect(getTierSavings(mockTiers[2], mockTiers)).toBe(20);
  });

  it("returns 0 for base tier", () => {
    expect(getTierSavings(mockTiers[0], mockTiers)).toBe(0);
  });

  it("returns 0 for missing base tier", () => {
    const noBase = [{ id: "t2", branch_id: "b1", branch_name: "P", min_quantity: 10, price: 90000 }];
    expect(getTierSavings(noBase[0], noBase)).toBe(0);
  });

  it("returns 0 for zero base price", () => {
    const zeroBase = [
      { id: "t1", branch_id: "b1", branch_name: "P", min_quantity: 1, price: 0 },
      { id: "t2", branch_id: "b1", branch_name: "P", min_quantity: 10, price: 90000 },
    ];
    expect(getTierSavings(zeroBase[1], zeroBase)).toBe(0);
  });
});

describe("getTierForQuantity", () => {
  it("returns null for empty tiers", () => {
    expect(getTierForQuantity(emptyTiers, 10)).toBeNull();
  });

  it("returns base tier for qty = 1", () => {
    const tier = getTierForQuantity(mockTiers, 1);
    expect(tier?.id).toBe("t1");
  });

  it("returns correct tier for qty", () => {
    expect(getTierForQuantity(mockTiers, 10)?.id).toBe("t2");
    expect(getTierForQuantity(mockTiers, 50)?.id).toBe("t3");
  });

  it("returns highest applicable tier for qty between tiers", () => {
    expect(getTierForQuantity(mockTiers, 25)?.id).toBe("t2");
  });
});

describe("isBestVolumeTier", () => {
  it("returns true for best volume tier", () => {
    expect(isBestVolumeTier(mockTiers[2], mockTiers)).toBe(true);
  });

  it("returns false for other tiers", () => {
    expect(isBestVolumeTier(mockTiers[0], mockTiers)).toBe(false);
    expect(isBestVolumeTier(mockTiers[1], mockTiers)).toBe(false);
  });

  it("returns false when no volume tiers exist", () => {
    expect(isBestVolumeTier(mockTiersOnlyBase[0], mockTiersOnlyBase)).toBe(false);
  });
});