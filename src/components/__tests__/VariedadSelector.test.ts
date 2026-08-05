/**
 * VariedadSelector Tests
 *
 * Source-structure tests (Button.test.ts pattern) for the global "Variedad"
 * attribute module (candy products):
 * - VariedadSelector.astro exposes the SizeSelector data-attribute contract (REQ-5)
 * - variant-selector.js registers case 'VariedadSelector' reusing _renderSizeSelector (D1)
 * - dead VariantSelector.astro registers the same case + parse + handlers (D3/REQ-5)
 * - price math via computeFinalPrice: base 5000 + 1000 = 6000, -6000 clamp → 0 (REQ-4)
 * - modifier hint tokens "₲" / "1.000" via Intl es-PY (REQ-3; whitespace non-normative,
 *   design open question)
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { computeFinalPrice } from "../../lib/variant-logic";

// ─── SOURCES (Button.test.ts pattern — Astro/WC need build-time render) ───

const variedadSource = readFileSync(
  resolve(__dirname, "../product/VariedadSelector.astro"),
  "utf-8"
);
const wcSource = readFileSync(
  resolve(__dirname, "../variant-selector.js"),
  "utf-8"
);
const deadSource = readFileSync(
  resolve(__dirname, "../product/VariantSelector.astro"),
  "utf-8"
);

describe("VariedadSelector.astro — SizeSelector contract (REQ-5)", () => {
  it("exposes data-module-id / data-value-id / data-raw-value / data-price-modifier", () => {
    expect(variedadSource).toContain("data-module-id");
    expect(variedadSource).toContain("data-value-id");
    expect(variedadSource).toContain("data-raw-value");
    expect(variedadSource).toContain("data-price-modifier");
  });

  it("renders chips as radio buttons with aria-checked", () => {
    expect(variedadSource).toContain('role="radio"');
    expect(variedadSource).toContain("aria-checked");
  });

  it("keeps touch targets ≥ 44px", () => {
    expect(variedadSource).toContain("min-width: 44px");
    expect(variedadSource).toContain("min-height: 44px");
  });

  it("uses its own .variedad-selector__* BEM prefix (D2)", () => {
    expect(variedadSource).toContain("variedad-selector__options");
    expect(variedadSource).toContain("variedad-selector__btn");
    expect(variedadSource).toContain("variedad-selector__label");
    expect(variedadSource).toContain("variedad-selector__modifier");
    // D2: the astro must not mislabel itself as SizeSelector (footgun if re-activated)
    expect(variedadSource).not.toContain("size-selector__btn");
  });

  it("mirrors SizeSelector props (moduleId, moduleName, values, selectedValueId)", () => {
    expect(variedadSource).toContain("moduleId: string");
    expect(variedadSource).toContain("moduleName: string");
    expect(variedadSource).toContain("selectedValueId");
    expect(variedadSource).toContain("price_modifier: number");
  });
});

describe("variant-selector.js — active renderer registration (D1, REQ-8)", () => {
  it("registers case 'VariedadSelector'", () => {
    expect(wcSource).toContain("case 'VariedadSelector':");
  });

  it("reuses _renderSizeSelector (D1)", () => {
    expect(wcSource).toContain("_renderSizeSelector(mod)");
  });
});

describe("VariantSelector.astro — dead-code parity (D3, REQ-5)", () => {
  it("registers case VariedadSelector and imports the component", () => {
    expect(deadSource).toContain('case "VariedadSelector"');
    expect(deadSource).toContain('import VariedadSelector from "./VariedadSelector.astro"');
  });

  it("parses .variedad-selector__btn in parseModules", () => {
    expect(deadSource).toContain('container.querySelectorAll(".variedad-selector__btn")');
  });

  it("handles clicks on variedad chips", () => {
    expect(deadSource).toContain('closest(".variedad-selector__btn")');
  });

  it("handles keyboard on variedad chips", () => {
    expect(deadSource).toContain('classList.contains("variedad-selector__btn")');
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
    expect(variedadSource).toContain("₲");
    expect(variedadSource).toContain('toLocaleString("es-PY")');
  });

  it("es-PY locale renders 1.000 for 1000 (whitespace non-normative)", () => {
    expect((1000).toLocaleString("es-PY")).toBe("1.000");
  });
});
