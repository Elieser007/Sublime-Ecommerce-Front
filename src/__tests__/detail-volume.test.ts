/**
 * Detail Volume UI — Static Source Tests (D2/D3)
 *
 * Asserts the product detail volume UI is server-rendered with real
 * <option> elements (not escaped HTML strings) and hydrated as Astro
 * client:load islands — regression for the volume-price-selector /
 * price-tier-list innerHTML swap of unregistered elements.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const selectorSource = readFileSync(
  resolve(__dirname, "../components/VolumePriceSelector.astro"),
  "utf-8"
);
const tierListSource = readFileSync(
  resolve(__dirname, "../components/PriceTierList.astro"),
  "utf-8"
);
const detailSource = readFileSync(
  resolve(__dirname, "../pages/producto/[slug].astro"),
  "utf-8"
);

describe("VolumePriceSelector renders real options (D3)", () => {
  it("maps tiers to real <option> elements instead of an escaped HTML string", () => {
    expect(selectorSource).toContain("sortedTiers.map((tier) => {");
    expect(selectorSource).toContain("data-price={tier.price}");
    expect(selectorSource).not.toContain('.join("")');
    expect(selectorSource).not.toContain('<option value="${tier.id}"');
  });

  it("exposes a basePrice prop used as the initial price fallback", () => {
    expect(selectorSource).toContain("basePrice?: number");
    expect(selectorSource).toMatch(/getTierPrice\(tiers, initialQty,\s*basePrice/);
  });
});

describe("PriceTierList highlights on volume-tier-change (D2)", () => {
  it("has a client script listening for volume-tier-change", () => {
    expect(tierListSource).toContain("'volume-tier-change'");
  });

  it("exposes min_quantity per row for client highlight", () => {
    expect(tierListSource).toContain("data-min-qty={tier.min_quantity}");
  });
});

describe("[slug].astro server-rendered volume UI (D2)", () => {
  it("renders VolumePriceSelector and PriceTierList as Astro components", () => {
    expect(detailSource).toContain("<VolumePriceSelector");
    expect(detailSource).toContain("<PriceTierList");
  });

  it("hydrates the volume islands with client:load", () => {
    expect(detailSource).toContain("client:load");
  });

  it("removes the renderVolumeSection innerHTML swap of unregistered elements", () => {
    expect(detailSource).not.toContain("renderVolumeSection");
    expect(detailSource).not.toContain("$volumeSection.innerHTML");
  });

  it("keeps the quantity stepper visible when tiers exist", () => {
    expect(detailSource).toContain('tiers.length > 0 ? "display: block;"');
  });

  it("wires the base_price fallback into the price display", () => {
    expect(detailSource).toMatch(
      /getTierPrice\(currentTiers, selectedQty,\s*currentProduct\.base_price\)/
    );
  });
});
