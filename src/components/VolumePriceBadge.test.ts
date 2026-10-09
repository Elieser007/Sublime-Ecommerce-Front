/**
 * VolumePriceBadge Tests
 */

import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { getEntryVolumeTier, formatTierLabel } from "../lib/price-utils";

const badgeSource = readFileSync(resolve(__dirname, "VolumePriceBadge.astro"), "utf-8");

// Mock the component behavior
const mockTiers = [
  { id: "t1", branch_id: "b1", branch_name: "Principal", min_quantity: 1, price: 100000 },
  { id: "t2", branch_id: "b1", branch_name: "Principal", min_quantity: 10, price: 90000 },
  { id: "t3", branch_id: "b1", branch_name: "Principal", min_quantity: 50, price: 80000 },
];

describe("VolumePriceBadge logic", () => {
  it("getEntryVolumeTier returns null for empty tiers", () => {
    expect(getEntryVolumeTier([])).toBeNull();
  });

  it("getEntryVolumeTier returns null for only base tier", () => {
    const onlyBase = [{ id: "t1", branch_id: "b1", branch_name: "P", min_quantity: 1, price: 100000 }];
    expect(getEntryVolumeTier(onlyBase)).toBeNull();
  });

  it("getEntryVolumeTier returns the lowest quantity discount tier", () => {
    const result = getEntryVolumeTier(mockTiers);
    expect(result).not.toBeNull();
    expect(result!.min_quantity).toBe(10);
    expect(result!.price).toBe(90000);
  });

  it("component renders the entry tier, never the deepest discount", () => {
    expect(badgeSource).toContain("getEntryVolumeTier");
    expect(badgeSource).not.toContain("getBestVolumeBadge");
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