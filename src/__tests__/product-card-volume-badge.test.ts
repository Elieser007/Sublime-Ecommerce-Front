/**
 * Product card volume badge — static source tests
 *
 * The card badge advertises the ENTRY tier (the lowest quantity that unlocks a
 * discount). Showing the deepest-discount tier instead told buyers they needed
 * far more units than the offer actually required ("Desde 160 unds" for a
 * product whose first volume tier starts at 60).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { getVolumeBadgeInfo } from "../lib/price-utils";

const cardSource = readFileSync(
  resolve(__dirname, "../components/product-card.js"),
  "utf-8"
);

describe("product-card.js volume badge (entry tier)", () => {
  it("builds the badge from getVolumeBadgeInfo", () => {
    expect(cardSource).toContain("getVolumeBadgeInfo");
    expect(cardSource).toContain("badge.label");
  });

  it("no longer pulls the deepest-discount tier for the badge", () => {
    expect(cardSource).not.toContain("getBestVolumeBadge");
  });

  it("renders +N from the badge extras count", () => {
    expect(cardSource).toContain("badge.extraCount");
  });

  it("labels the reported product shape with the 60-unds tier", () => {
    const info = getVolumeBadgeInfo([
      { id: "t1", branch_id: "b1", branch_name: "Principal", min_quantity: 1, price: 20000 },
      { id: "t2", branch_id: "b1", branch_name: "Principal", min_quantity: 60, price: 9000 },
      { id: "t3", branch_id: "b1", branch_name: "Principal", min_quantity: 160, price: 6500 },
    ]);

    expect(info!.label).toBe("Desde 60 unds: Gs. 9.000");
  });
});
