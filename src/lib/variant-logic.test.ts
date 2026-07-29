/**
 * Variant Logic Tests — TDD
 *
 * Tests for computeFinalPrice and isSelectionComplete functions.
 */

import { describe, it, expect } from "vitest";
import {
  computeFinalPrice,
  isSelectionComplete,
  ModuleWithValues,
} from "./variant-logic";

// ─── Test Fixtures ──────────────────────────────────────────────────
function createModule(
  id: string,
  name: string,
  values: { value_id: string; label: string; raw_value: string; available: boolean }[]
): ModuleWithValues {
  return {
    id,
    module_id: id,
    name,
    slug: `slug-${id}`,
    frontend_component: "SizeSelector",
    sort_order: 0,
    values: values.map((v) => ({
      ...v,
      hex_color: null,
      price_modifier: 0,
    })),
  };
}

// ════════════════════════════════════════════════════════════════════
//  COMPUTE FINAL PRICE
// ════════════════════════════════════════════════════════════════════
describe("computeFinalPrice", () => {
  it("returns base price when no modifiers", () => {
    expect(computeFinalPrice(10000, [])).toBe(10000);
  });

  it("adds positive modifiers", () => {
    expect(computeFinalPrice(10000, [500, 1000])).toBe(11500);
  });

  it("subtracts negative modifiers", () => {
    expect(computeFinalPrice(10000, [-500, -1000])).toBe(8500);
  });

  it("never goes below 0", () => {
    expect(computeFinalPrice(1000, [-5000])).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════
//  SELECTION COMPLETENESS
// ════════════════════════════════════════════════════════════════════
describe("isSelectionComplete", () => {
  it("returns true for empty modules", () => {
    expect(isSelectionComplete([], new Map())).toBe(true);
  });

  it("returns true when all modules with values have selection", () => {
    const modules = [
      createModule("m1", "Color", [
        { value_id: "v1", label: "Red", raw_value: "#FF0000", available: true },
      ]),
    ];
    const selected = new Map([["m1", "v1"]]);

    expect(isSelectionComplete(modules, selected)).toBe(true);
  });

  it("returns false when module with values has no selection", () => {
    const modules = [
      createModule("m1", "Color", [
        { value_id: "v1", label: "Red", raw_value: "#FF0000", available: true },
      ]),
    ];
    const selected = new Map<string, string>();

    expect(isSelectionComplete(modules, selected)).toBe(false);
  });
});
