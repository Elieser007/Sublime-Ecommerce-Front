/**
 * Detail Volume UI — Static Source Tests (D2/D3)
 *
 * Asserts the product detail volume UI is server-rendered as a static
 * tier table (no interactive <select>, no volume-tier-change event
 * machinery) and hydrated as an Astro client:load island.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const tierListSource = readFileSync(
  resolve(__dirname, "../components/PriceTierList.astro"),
  "utf-8"
);
const detailSource = readFileSync(
  resolve(__dirname, "../pages/producto/[slug].astro"),
  "utf-8"
);
const modalSource = readFileSync(
  resolve(__dirname, "../components/variant-modal.js"),
  "utf-8"
);
const cartUtilsSource = readFileSync(
  resolve(__dirname, "../lib/cart-utils.ts"),
  "utf-8"
);

describe("PriceTierList renders statically (D2/D3)", () => {
  it("exposes min_quantity per row", () => {
    expect(tierListSource).toContain("data-min-qty={tier.min_quantity}");
  });

  it("no longer listens for volume-tier-change", () => {
    expect(tierListSource).not.toContain("'volume-tier-change'");
  });
});

describe("[slug].astro server-rendered volume UI (D2)", () => {
  it("renders PriceTierList as the only volume UI component", () => {
    expect(detailSource).toContain("<PriceTierList");
    expect(detailSource).not.toContain("<VolumePriceSelector");
  });

  it("hydrates the tier list island with client:load", () => {
    expect(detailSource).toContain("client:load");
  });

  it("no longer wires the volume-tier-change event", () => {
    expect(detailSource).not.toContain("'volume-tier-change'");
  });

  it("removes the renderVolumeSection innerHTML swap of unregistered elements", () => {
    expect(detailSource).not.toContain("renderVolumeSection");
    expect(detailSource).not.toContain("$volumeSection.innerHTML");
  });

  it("keeps the quantity stepper visible when tiers exist", () => {
    expect(detailSource).toContain('tiers.length > 0 ? "display: block;"');
  });

  it("wires the base_price fallback into the price display", () => {
    expect(detailSource).toContain("const basePrice = currentProduct.base_price");
    expect(detailSource).toMatch(
      /getTierPrice\(currentTiers, selectedQty,\s*basePrice\)\s*:\s*basePrice/
    );
  });
});

describe("Add-to-cart D4 price contract", () => {
  it("variant-modal imports getTierForQuantity", () => {
    expect(modalSource).toContain("getTierForQuantity");
  });

  it("variant-modal _handleConfirm stores the pure base price", () => {
    expect(modalSource).toContain("price: this._basePrice");
  });

  it("variant-modal _handleConfirm stores selected_tier_id/price/min_qty", () => {
    expect(modalSource).toContain("selected_tier_id: tier?.id");
    expect(modalSource).toContain("selected_tier_price: tier?.price");
    expect(modalSource).toContain("selected_tier_min_qty: tier?.min_quantity");
  });

  it("variant-modal _recalculatePrice passes base price as getTierPrice fallback", () => {
    expect(modalSource).toContain(
      "getTierPrice(this._priceTiers, this._quantity, this._basePrice)"
    );
  });

  it("[slug].astro add handler stores the pure base price", () => {
    expect(detailSource).toContain("price: currentProduct.base_price");
  });

  it("[slug].astro add handler stores the pure tier price", () => {
    expect(detailSource).toContain("selected_tier_price: selectedTier?.price");
  });

  it("cart-utils recomputes the applicable tier from the sanitized quantity", () => {
    expect(cartUtilsSource).toContain(
      "getTierForQuantity(item.price_tiers, sanitizeQuantity(item.quantity))"
    );
  });
});
