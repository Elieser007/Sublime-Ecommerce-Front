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
  resolve(__dirname, "../pages/products/[slug].astro"),
  "utf-8"
);
const modalSource = readFileSync(
  resolve(__dirname, "../components/variant-modal.js"),
  "utf-8"
);
const cardSource = readFileSync(
  resolve(__dirname, "../components/product-card.js"),
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

  it("does not hydrate the Astro component with client:load", () => {
    expect(detailSource).not.toContain("client:load");
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

describe("[slug].astro — static variant data flow (SSG)", () => {
  it("injects the baked variant graph as window.__VARIANTS_DATA__", () => {
    expect(detailSource).toContain("window.__VARIANTS_DATA__");
  });

  it("resolves availability + price client-side from baked data", () => {
    expect(detailSource).toContain("resolveAvailable");
    expect(detailSource).toContain("resolveFinalPrice");
    expect(detailSource).toContain("recomputeVariants");
  });

  it("no longer fetches /variants at runtime (loadVariants/refreshVariants gone)", () => {
    expect(detailSource).not.toContain("function loadVariants");
    expect(detailSource).not.toContain("function refreshVariants");
    expect(detailSource).not.toContain("function buildSelectedParam");
    expect(detailSource).not.toContain("loadVariants(currentProduct.id)");
  });

  it("no longer imports getApiUrl into the client script", () => {
    // The build-time fetch uses getApiUrl in frontmatter, but the browser
    // script must not resolve a runtime API URL anymore.
    const scriptBody = detailSource.slice(detailSource.indexOf("<script>"));
    expect(scriptBody).not.toContain("getApiUrl");
  });
});

describe("variant-modal.js — baked variant data (SSG)", () => {
  it("accepts a baked 'variants' attribute", () => {
    expect(modalSource).toContain("'variants'");
    expect(modalSource).toContain("this.getAttribute('variants')");
  });

  it("resolves availability + price client-side", () => {
    expect(modalSource).toContain("resolveAvailable");
    expect(modalSource).toContain("resolveFinalPrice");
    expect(modalSource).toContain("_applyAvailability");
  });

  it("no longer fetches anything at runtime", () => {
    expect(modalSource).not.toContain("_fetchVariants");
    expect(modalSource).not.toContain("_refreshVariants");
    expect(modalSource).not.toContain("getApiUrl");
    expect(modalSource).not.toContain("fetch(");
  });
});

describe("Bake-failure fallback (SSG) — no cart entry without options", () => {
  const NOTICE = "No se pudieron cargar las variantes. Consultanos por WhatsApp.";

  it("[slug].astro imports and uses resolveVariantUiState", () => {
    expect(detailSource).toContain("resolveVariantUiState");
  });

  it("[slug].astro server-renders the fallback notice when modules are empty", () => {
    expect(detailSource).toContain("variantUi.showFallbackNotice");
    expect(detailSource).toContain(NOTICE);
  });

  it("[slug].astro disables add-to-cart on fallback (server + client)", () => {
    expect(detailSource).toContain("disabled={variantUi.showFallbackNotice}");
    expect(detailSource).toContain("$addCart.disabled = variantUi.showFallbackNotice || !complete");
  });

  it("[slug].astro passes the bakeFailed signal into resolveVariantUiState", () => {
    // Server render: props.bakeFailed; client: currentProduct.bakeFailed
    // (the ProductWithDetails payload carries the resolved flag).
    expect(detailSource).toMatch(/resolveVariantUiState\(\s*product,/);
    expect(detailSource).toMatch(/resolveVariantUiState\(\s*currentProduct,/);
    expect(detailSource).toContain("bakeFailed");
  });

  it("[slug].astro guards the add-to-cart click on fallback", () => {
    expect(detailSource).toContain("variantUi.showFallbackNotice) return");
  });

  it("variant-modal reads the bake-failed signal (not legacy has-variants)", () => {
    expect(modalSource).toContain("'bake-failed'");
    expect(modalSource).toContain("this.getAttribute('bake-failed')");
    expect(modalSource).not.toContain("'has-variants'");
    expect(modalSource).not.toContain("this.getAttribute('has-variants')");
  });

  it("variant-modal renders the fallback notice and disables confirm", () => {
    expect(modalSource).toContain("variant-fallback-notice");
    expect(modalSource).toContain(NOTICE);
    expect(modalSource).toContain("ui.showFallbackNotice ? ' disabled' : ''");
  });

  it("variant-modal guards confirm-to-cart on fallback", () => {
    expect(modalSource).toContain("if (this._currentVariantUi().showFallbackNotice) return;");
  });

  it("product-card forwards bake-failed to the modal (not has-variants)", () => {
    expect(cardSource).toContain("modal.setAttribute('bake-failed'");
    expect(cardSource).not.toContain("has-variants");
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
