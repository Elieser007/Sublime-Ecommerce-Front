/**
 * Variant modal volume badges — source-structure test
 *
 * The modal lists every volume tier. It must read in ascending quantity order
 * (lowest first) so the first badge follows the same rule as the product card
 * badge: the buyer sees what the smallest commitment unlocks first.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const modalSource = readFileSync(
  resolve(__dirname, "../components/variant-modal.js"),
  "utf-8"
);

const volumeBadgesBody = modalSource.slice(
  modalSource.indexOf("_renderVolumeBadges() {"),
  modalSource.indexOf("_renderModalBody() {")
);

describe("variant-modal.js volume badge order", () => {
  it("sorts tiers by ascending min_quantity", () => {
    expect(volumeBadgesBody).toContain(
      ".sort((a, b) => a.min_quantity - b.min_quantity)"
    );
  });

  it("no longer moves the deepest-discount tier into the first position", () => {
    expect(volumeBadgesBody).not.toContain("orderedTiers");
    expect(volumeBadgesBody).not.toContain("getBestVolumeBadge");
  });

  it("still renders one labelled badge per volume tier and marks the active one", () => {
    expect(volumeBadgesBody).toContain("formatTierLabel(tier)");
    expect(volumeBadgesBody).toContain('data-active="true"');
  });
});
