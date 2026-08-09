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

  it("treats an all-unavailable module as absent — selection can complete", () => {
    // A module whose values are ALL unavailable (e.g. every child filtered out
    // by dependencies) must not permanently block add-to-cart: the backend
    // filters such values out entirely, so completeness mirrors that by
    // counting only modules with ≥1 available value.
    const modules = [
      createModule("m1", "Color", [
        { value_id: "v1", label: "Red", raw_value: "#FF0000", available: false },
        { value_id: "v2", label: "Blue", raw_value: "#0000FF", available: false },
      ]),
    ];
    const selected = new Map<string, string>();

    expect(isSelectionComplete(modules, selected)).toBe(true);
  });

  it("excludes an all-unavailable module while a selectable module still requires selection", () => {
    const modules = [
      createModule("m1", "Color", [
        { value_id: "v1", label: "Red", raw_value: "#FF0000", available: true },
      ]),
      createModule("m2", "Size", [
        { value_id: "v3", label: "S", raw_value: "S", available: false },
        { value_id: "v4", label: "M", raw_value: "M", available: false },
      ]),
    ];

    // Selectable module unselected → incomplete, even though m2 is excluded.
    expect(isSelectionComplete(modules, new Map<string, string>())).toBe(false);
    // Both selectable+excluded handled → complete.
    expect(isSelectionComplete(modules, new Map([["m1", "v1"]]))).toBe(true);
  });

  it("a module with a single available value still requires a selection", () => {
    const modules = [
      createModule("m1", "Color", [
        { value_id: "v1", label: "Red", raw_value: "#FF0000", available: false },
        { value_id: "v2", label: "Blue", raw_value: "#0000FF", available: true },
      ]),
    ];

    expect(isSelectionComplete(modules, new Map<string, string>())).toBe(false);
    expect(isSelectionComplete(modules, new Map([["m1", "v2"]]))).toBe(true);
  });

  it("treats values without an explicit available flag as selectable (legacy parity)", () => {
    const modules = [
      createModule("m1", "Color", [
        { value_id: "v1", label: "Red", raw_value: "#FF0000", available: false },
      ]),
    ];
    // Force a value with no `available` field — it must count as available.
    const legacyModules = [
      { ...modules[0], values: [{ value_id: "v1", label: "Red", raw_value: "#FF0000", hex_color: null, price_modifier: 0 }] },
    ] as unknown as ModuleWithValues[];

    expect(isSelectionComplete(legacyModules, new Map<string, string>())).toBe(false);
    expect(isSelectionComplete(legacyModules, new Map([["m1", "v1"]]))).toBe(true);
  });
});
