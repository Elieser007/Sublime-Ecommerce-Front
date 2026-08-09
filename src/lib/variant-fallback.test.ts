/**
 * variant-fallback — bake-outcome fallback decision (SSG).
 *
 * Unit tests for the pure decision that guards against silently adding a
 * variant product to the cart when the build-time bake of its variant graph
 * failed. The signal is bake-outcome based (`bakeFailed`, computed by
 * src/lib/catalog-batch.ts resolveProductGraph): a payload that said modules
 * should exist but delivered a missing/corrupt graph shows the fallback
 * notice and blocks add-to-cart. Zero modules with a clean payload (e.g.
 * seeded size products: SKUs but no attribute modules) is a genuine
 * "no variants" product and stays purchasable.
 */

import { describe, it, expect } from "vitest";
import { resolveVariantUiState } from "./variant-fallback";

describe("resolveVariantUiState", () => {
  it("bakeFailed true → fallback notice shown, add-to-cart blocked", () => {
    const ui = resolveVariantUiState({ id: "p1" }, [], [], true);
    expect(ui.showFallbackNotice).toBe(true);
    expect(ui.canAddToCart).toBe(false);
  });

  it("bakeFailed true with baked modules present → still notice (graph corrupt)", () => {
    // A corrupt graph can carry partial modules; the flag wins.
    const ui = resolveVariantUiState(
      { id: "p1" },
      [{ module_id: "m1", values: [] }],
      [],
      true
    );
    expect(ui.showFallbackNotice).toBe(true);
    expect(ui.canAddToCart).toBe(false);
  });

  it("bakeFailed false + zero modules → 'no variants', purchasable", () => {
    // Seeded size products: SKUs but no attribute modules → genuine no-variants.
    const ui = resolveVariantUiState({ id: "p1" }, [], [], false);
    expect(ui.showFallbackNotice).toBe(false);
    expect(ui.canAddToCart).toBe(true);
  });

  it("bakeFailed false + baked modules → selector, purchasable", () => {
    const ui = resolveVariantUiState(
      { id: "p1" },
      [{ module_id: "m1", values: [] }],
      [],
      false
    );
    expect(ui.showFallbackNotice).toBe(false);
    expect(ui.canAddToCart).toBe(true);
  });

  it("corrupt graph (unparseable available_modules) surfaces as bakeFailed → notice", () => {
    // resolveProductGraph flags unparseable/non-array modules as corrupt and
    // passes bakeFailed=true; the UI layer must honor it.
    const ui = resolveVariantUiState({ id: "p1" }, [], [], true);
    expect(ui.showFallbackNotice).toBe(true);
    expect(ui.canAddToCart).toBe(false);
  });

  it("corrupt graph (missing base_price) surfaces as bakeFailed → notice", () => {
    const ui = resolveVariantUiState({ id: "p1" }, [], [], true);
    expect(ui.showFallbackNotice).toBe(true);
    expect(ui.canAddToCart).toBe(false);
  });

  it("payload said modules should exist but none baked → notice", () => {
    // has_attribute_modules true + empty modules → bakeFailed true upstream.
    const ui = resolveVariantUiState({ id: "p1" }, [], [], true);
    expect(ui.showFallbackNotice).toBe(true);
    expect(ui.canAddToCart).toBe(false);
  });
});
