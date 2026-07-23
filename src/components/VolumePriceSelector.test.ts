/**
 * VolumePriceSelector Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTierPrice, getTierForQuantity, formatTierOption } from "../lib/price-utils";

const mockTiers = [
  { id: "t1", branch_id: "b1", branch_name: "Principal", min_quantity: 1, price: 100000 },
  { id: "t2", branch_id: "b1", branch_name: "Principal", min_quantity: 10, price: 90000 },
  { id: "t3", branch_id: "b1", branch_name: "Principal", min_quantity: 50, price: 80000 },
];

describe("VolumePriceSelector logic", () => {
  it("getTierForQuantity returns correct tier for initial qty", () => {
    expect(getTierForQuantity(mockTiers, 1)?.id).toBe("t1");
    expect(getTierForQuantity(mockTiers, 10)?.id).toBe("t2");
    expect(getTierForQuantity(mockTiers, 50)?.id).toBe("t3");
  });

  it("getTierPrice returns correct price for qty", () => {
    expect(getTierPrice(mockTiers, 1)).toBe(100000);
    expect(getTierPrice(mockTiers, 10)).toBe(90000);
    expect(getTierPrice(mockTiers, 50)).toBe(80000);
  });

  it("formatTierOption formats options correctly", () => {
    expect(formatTierOption(mockTiers[0])).toBe("1+ unds \u2014 Gs. 100.000/u");
    expect(formatTierOption(mockTiers[1])).toBe("10+ unds \u2014 Gs. 90.000/u");
    expect(formatTierOption(mockTiers[2])).toBe("50+ unds \u2014 Gs. 80.000/u");
  });

  it("handles empty tiers", () => {
    expect(getTierPrice([], 10)).toBe(0);
    expect(getTierForQuantity([], 10)).toBeNull();
  });

  it("handles only base tier", () => {
    const onlyBase = [{ id: "t1", branch_id: "b1", branch_name: "P", min_quantity: 1, price: 100000 }];
    expect(getTierPrice(onlyBase, 100)).toBe(100000);
    expect(getTierForQuantity(onlyBase, 100)?.id).toBe("t1");
  });
});