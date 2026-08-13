/**
 * Price Utils Tests — Pure function tests
 */

import { describe, it, expect } from "vitest";
import {
  getBestVolumeBadge,
  getTierPrice,
  formatTierLabel,
  formatTierOption,
  getTierSavings,
  getTierSavingsPercent,
  getTierForQuantity,
  isBestVolumeTier,
  getVolumeTierCount,
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

  it("returns lowest-priced tier for batch-shaped data without base row", () => {
    const batchTiers = [
      { id: "v1", branch_id: "b1", branch_name: "Principal", min_quantity: 12, price: 216000 },
      { id: "v2", branch_id: "b1", branch_name: "Principal", min_quantity: 24, price: 408000 },
    ];
    const best = getBestVolumeBadge(batchTiers);
    expect(best).not.toBeNull();
    expect(best!.id).toBe("v1");
    expect(best!.price).toBe(216000);
  });

  it("returns lowest-priced tier regardless of min_quantity order", () => {
    const reversedPriceTiers = [
      { id: "v1", branch_id: "b1", branch_name: "Principal", min_quantity: 12, price: 408000 },
      { id: "v2", branch_id: "b1", branch_name: "Principal", min_quantity: 24, price: 216000 },
    ];
    const best = getBestVolumeBadge(reversedPriceTiers);
    expect(best).not.toBeNull();
    expect(best!.id).toBe("v2");
    expect(best!.price).toBe(216000);
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

  it("returns caller fallback when qty below all tiers and no base row", () => {
    const noBaseTiers = [
      { id: "v1", branch_id: "b1", branch_name: "Principal", min_quantity: 12, price: 18000 },
      { id: "v2", branch_id: "b1", branch_name: "Principal", min_quantity: 24, price: 17000 },
    ];
    expect(getTierPrice(noBaseTiers, 1, 20000)).toBe(20000);
    expect(getTierPrice(noBaseTiers, 5, 20000)).toBe(20000);
  });

  it("returns tier price when quantity qualifies and no base row present", () => {
    const noBaseTiers = [
      { id: "v1", branch_id: "b1", branch_name: "Principal", min_quantity: 12, price: 18000 },
      { id: "v2", branch_id: "b1", branch_name: "Principal", min_quantity: 24, price: 17000 },
    ];
    expect(getTierPrice(noBaseTiers, 12)).toBe(18000);
    expect(getTierPrice(noBaseTiers, 24)).toBe(17000);
  });

  it("defaults fallback to 0 when below all tiers and no fallback given", () => {
    const noBaseTiers = [
      { id: "v1", branch_id: "b1", branch_name: "Principal", min_quantity: 12, price: 18000 },
    ];
    expect(getTierPrice(noBaseTiers, 1)).toBe(0);
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

describe("formatTierOption", () => {
  it("formats options correctly with Guaraníes formatting", () => {
    expect(formatTierOption(mockTiers[0])).toBe("1+ unds \u2014 Gs. 100.000/u");
    expect(formatTierOption(mockTiers[1])).toBe("10+ unds \u2014 Gs. 90.000/u");
    expect(formatTierOption(mockTiers[2])).toBe("50+ unds \u2014 Gs. 80.000/u");
  });
});

describe("getTierSavings", () => {
  // Prod-like tiers: batch quantities only (12+), no min_quantity === 1 row
  const prodTiers = [
    { id: "v1", branch_id: "b1", branch_name: "Principal", min_quantity: 12, price: 216000 },
    { id: "v2", branch_id: "b1", branch_name: "Principal", min_quantity: 24, price: 208000 },
  ];

  it("calculates savings in Guaraníes from basePrice", () => {
    expect(getTierSavings(prodTiers[0], prodTiers, 240000)).toBe(24000);
    expect(getTierSavings(prodTiers[1], prodTiers, 240000)).toBe(32000);
  });

  it("clamps savings to 0 when tier price exceeds base", () => {
    const aboveBase = [
      { id: "t1", branch_id: "b1", branch_name: "P", min_quantity: 1, price: 100000 },
      { id: "t2", branch_id: "b1", branch_name: "P", min_quantity: 10, price: 120000 },
    ];
    expect(getTierSavings(aboveBase[1], aboveBase)).toBe(0);
    expect(getTierSavings(prodTiers[0], prodTiers, 200000)).toBe(0);
  });

  it("falls back to the min_quantity === 1 row when basePrice is absent", () => {
    const withBase = [
      { id: "t1", branch_id: "b1", branch_name: "P", min_quantity: 1, price: 100000 },
      { id: "t2", branch_id: "b1", branch_name: "P", min_quantity: 10, price: 90000 },
    ];
    expect(getTierSavings(withBase[1], withBase)).toBe(10000);
  });

  it("returns 0 for base tier", () => {
    const withBase = [
      { id: "t1", branch_id: "b1", branch_name: "P", min_quantity: 1, price: 100000 },
      { id: "t2", branch_id: "b1", branch_name: "P", min_quantity: 10, price: 90000 },
    ];
    expect(getTierSavings(withBase[0], withBase)).toBe(0);
  });

  it("returns 0 when no basePrice and no min_quantity === 1 row exist", () => {
    expect(getTierSavings(prodTiers[0], prodTiers)).toBe(0);
    expect(getTierSavings(prodTiers[1], prodTiers)).toBe(0);
  });

  it("returns 0 for zero base price", () => {
    const zeroBase = [
      { id: "t1", branch_id: "b1", branch_name: "P", min_quantity: 1, price: 0 },
      { id: "t2", branch_id: "b1", branch_name: "P", min_quantity: 10, price: 90000 },
    ];
    expect(getTierSavings(zeroBase[1], zeroBase)).toBe(0);
  });

  it("returns 0 for empty tiers", () => {
    expect(getTierSavings(undefined as any, [])).toBe(0);
  });
});

describe("getTierSavingsPercent", () => {
  const baseTiers = [
    { id: "t1", branch_id: "b1", branch_name: "Principal", min_quantity: 1, price: 100000 },
    { id: "t2", branch_id: "b1", branch_name: "Principal", min_quantity: 10, price: 90000 },
    { id: "t3", branch_id: "b1", branch_name: "Principal", min_quantity: 50, price: 80000 },
  ];

  it("returns the rounded percentage saved against the base row", () => {
    expect(getTierSavingsPercent(baseTiers[1], baseTiers)).toBe(10); // 10% at 10 unds
    expect(getTierSavingsPercent(baseTiers[2], baseTiers)).toBe(20); // 20% at 50 unds
  });

  it("rounds fractional percentages to the nearest integer", () => {
    const prodTiers = [
      { id: "v1", branch_id: "b1", branch_name: "P", min_quantity: 12, price: 216000 },
      { id: "v2", branch_id: "b1", branch_name: "P", min_quantity: 24, price: 208000 },
    ];
    expect(getTierSavingsPercent(prodTiers[0], prodTiers, 240000)).toBe(10); // 24.000/240.000
    expect(getTierSavingsPercent(prodTiers[1], prodTiers, 240000)).toBe(13); // 32.000/240.000 = 13.33%
  });

  it("returns 0 when the tier price exceeds the base", () => {
    const aboveBase = [
      { id: "t1", branch_id: "b1", branch_name: "P", min_quantity: 1, price: 100000 },
      { id: "t2", branch_id: "b1", branch_name: "P", min_quantity: 10, price: 120000 },
    ];
    expect(getTierSavingsPercent(aboveBase[1], aboveBase)).toBe(0);
  });

  it("returns 0 for the base tier", () => {
    expect(getTierSavingsPercent(baseTiers[0], baseTiers)).toBe(0);
  });

  it("returns 0 when no base price and no min_quantity === 1 row exist", () => {
    const batchOnly = [
      { id: "v1", branch_id: "b1", branch_name: "P", min_quantity: 12, price: 216000 },
    ];
    expect(getTierSavingsPercent(batchOnly[0], batchOnly)).toBe(0);
  });

  it("returns 0 for zero base price", () => {
    const zeroBase = [
      { id: "t1", branch_id: "b1", branch_name: "P", min_quantity: 1, price: 0 },
      { id: "t2", branch_id: "b1", branch_name: "P", min_quantity: 10, price: 90000 },
    ];
    expect(getTierSavingsPercent(zeroBase[1], zeroBase)).toBe(0);
  });

  it("returns 0 for empty tiers", () => {
    expect(getTierSavingsPercent(undefined as any, [])).toBe(0);
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

  it("returns base tier when only base tier exists", () => {
    expect(getTierForQuantity(mockTiersOnlyBase, 100)?.id).toBe("t1");
  });
});

describe("getVolumeTierCount", () => {
  it("returns 0 for empty tiers", () => {
    expect(getVolumeTierCount(emptyTiers)).toBe(0);
  });

  it("returns 0 when only base tier exists", () => {
    expect(getVolumeTierCount(mockTiersOnlyBase)).toBe(0);
  });

  it("counts tiers with min_quantity > 1", () => {
    expect(getVolumeTierCount(mockTiers)).toBe(2);
  });

  it("counts volume tiers regardless of array order", () => {
    const unsorted = [
      { id: "c", branch_id: "b1", branch_name: "P", min_quantity: 50, price: 80000 },
      { id: "a", branch_id: "b1", branch_name: "P", min_quantity: 10, price: 90000 },
      { id: "b", branch_id: "b1", branch_name: "P", min_quantity: 1, price: 100000 },
    ];
    expect(getVolumeTierCount(unsorted)).toBe(2);
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