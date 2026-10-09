/**
 * Price Utils Tests — Pure function tests
 */

import { describe, it, expect } from "vitest";
import {
  getTierPrice,
  formatTierLabel,
  formatTierOption,
  getTierSavings,
  getTierSavingsPercent,
  getTierForQuantity,
  getVolumeTierCount,
  getEntryVolumeTier,
  getVolumeBadgeInfo,
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

// Real shop shape: the deepest discount needs 160 units, the entry tier 60.
const shopTiers = [
  { id: "t1", branch_id: "b1", branch_name: "Principal", min_quantity: 1, price: 20000 },
  { id: "t2", branch_id: "b1", branch_name: "Principal", min_quantity: 60, price: 9000 },
  { id: "t3", branch_id: "b1", branch_name: "Principal", min_quantity: 160, price: 6500 },
];

describe("getEntryVolumeTier", () => {
  it("returns null for empty tiers and for a base tier only", () => {
    expect(getEntryVolumeTier(emptyTiers)).toBeNull();
    expect(getEntryVolumeTier(mockTiersOnlyBase)).toBeNull();
  });

  it("returns the tier with the LOWEST quantity, not the lowest price", () => {
    const entry = getEntryVolumeTier(shopTiers);

    expect(entry).not.toBeNull();
    expect(entry!.min_quantity).toBe(60);
    expect(entry!.price).toBe(9000);
    // The deepest-discount row is a different concept: it must not be the badge.
    expect(shopTiers[2].min_quantity).toBe(160);
  });

  it("ignores array order", () => {
    const unsorted = [shopTiers[2], shopTiers[0], shopTiers[1]];

    expect(getEntryVolumeTier(unsorted)!.id).toBe("t2");
  });

  it("picks the lowest quantity for batch-shaped data without a base row", () => {
    const batchTiers = [
      { id: "v2", branch_id: "b1", branch_name: "Principal", min_quantity: 24, price: 408000 },
      { id: "v1", branch_id: "b1", branch_name: "Principal", min_quantity: 12, price: 216000 },
    ];

    expect(getEntryVolumeTier(batchTiers)!.id).toBe("v1");
  });
});

describe("getVolumeBadgeInfo", () => {
  it("builds the badge label from the entry tier", () => {
    const info = getVolumeBadgeInfo(shopTiers);

    expect(info).toEqual({ label: "Desde 60 unds: Gs. 9.000", extraCount: 1 });
  });

  it("counts the remaining volume tiers for the +N badge", () => {
    const fourTiers = [
      ...shopTiers,
      { id: "t4", branch_id: "b1", branch_name: "Principal", min_quantity: 500, price: 5000 },
    ];

    expect(getVolumeBadgeInfo(fourTiers)!.extraCount).toBe(2);
  });

  it("reports no extras when there is a single volume tier", () => {
    const single = [shopTiers[0], shopTiers[1]];

    expect(getVolumeBadgeInfo(single)!.extraCount).toBe(0);
  });

  it("returns null when there is nothing to advertise", () => {
    expect(getVolumeBadgeInfo(emptyTiers)).toBeNull();
    expect(getVolumeBadgeInfo(mockTiersOnlyBase)).toBeNull();
  });
});