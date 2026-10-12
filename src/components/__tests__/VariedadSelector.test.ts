/**
 * VariedadSelector Tests
 *
 * Source-structure tests (Button.test.ts pattern) for the global "Variedad"
 * attribute module (candy products):
 * - variant-selector.js registers case 'VariedadSelector' reusing _renderSizeSelector (D1)
 * - price math via computeFinalPrice: base 5000 + 1000 = 6000, -6000 clamp → 0 (REQ-4)
 * - modifier hint tokens "₲" / "1.000" via Intl es-PY (REQ-3; whitespace non-normative,
 *   design open question)
 *
 * NOTE: the dead Astro selectors (product/VariantSelector.astro and siblings)
 * were deleted — the live renderer is the variant-selector custom element, so
 * the SizeSelector-contract and dead-code-parity suites were dropped with them.
 * The live element reuses the size chip renderer for VariedadSelector (D1), so
 * the old .variedad-selector__* BEM distinction no longer exists to assert on.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { computeFinalPrice } from "../../lib/variant-logic";

// ─── SOURCES (Button.test.ts pattern — Astro/WC need build-time render) ───

const wcSource = readFileSync(
  resolve(__dirname, "../variant-selector.js"),
  "utf-8"
);

describe("variant-selector.js — active renderer registration (D1, REQ-8)", () => {
  it("registers case 'VariedadSelector'", () => {
    expect(wcSource).toContain("case 'VariedadSelector':");
  });

  it("reuses _renderSizeSelector (D1)", () => {
    expect(wcSource).toContain("_renderSizeSelector(mod)");
  });
});

describe("Price math with variedad modifiers (REQ-4)", () => {
  it("adds +1000 to base 5000 → 6000", () => {
    expect(computeFinalPrice(5000, [1000])).toBe(6000);
  });

  it("clamps -6000 modifier on base 5000 → 0, never negative", () => {
    expect(computeFinalPrice(5000, [-6000])).toBe(0);
  });
});

describe("Modifier hint tokens (REQ-3, open question)", () => {
  it("formats hints with ₲ via es-PY locale", () => {
    expect(wcSource).toContain("₲");
    expect(wcSource).toContain("toLocaleString('es-PY')");
  });

  it("es-PY locale renders 1.000 for 1000 (whitespace non-normative)", () => {
    expect((1000).toLocaleString("es-PY")).toBe("1.000");
  });
});
