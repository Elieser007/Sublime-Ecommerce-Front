/**
 * Variant Logic Tests — TDD
 *
 * Tests for filterAvailableOptions, computeFinalPrice,
 * isSelectionComplete, and sortModules functions.
 */

import { describe, it, expect } from "vitest";
import {
  filterAvailableOptions,
  computeFinalPrice,
  isSelectionComplete,
  sortModules,
  ModuleWithValues,
  Dependency,
} from "./variant-logic";

// ─── Test Fixtures ──────────────────────────────────────────────────
function createModule(
  id: string,
  name: string,
  values: { value_id: string; label: string; raw_value: string; available: boolean }[]
): ModuleWithValues {
  return {
    id,
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
//  FILTER AVAILABLE OPTIONS
// ════════════════════════════════════════════════════════════════════
describe("filterAvailableOptions", () => {
  it("returns all values available when no dependencies exist", () => {
    const modules = [
      createModule("m1", "Color", [
        { value_id: "v1", label: "Red", raw_value: "#FF0000", available: true },
        { value_id: "v2", label: "Blue", raw_value: "#0000FF", available: true },
      ]),
      createModule("m2", "Size", [
        { value_id: "v3", label: "S", raw_value: "S", available: true },
        { value_id: "v4", label: "M", raw_value: "M", available: true },
      ]),
    ];
    const selected = new Map<string, string>();
    const dependencies: Dependency[] = [];

    const result = filterAvailableOptions(modules, selected, dependencies);

    expect(result[0].values.every((v) => v.available)).toBe(true);
    expect(result[1].values.every((v) => v.available)).toBe(true);
  });

  it("filters values when parent value has specific child dependency", () => {
    const modules = [
      createModule("m1", "Color", [
        { value_id: "v1", label: "Red", raw_value: "#FF0000", available: true },
      ]),
      createModule("m2", "Size", [
        { value_id: "v3", label: "S", raw_value: "S", available: true },
        { value_id: "v4", label: "M", raw_value: "M", available: true },
      ]),
    ];
    const selected = new Map([["m1", "v1"]]);
    const dependencies: Dependency[] = [
      { parent_module_id: "m1", parent_value_id: "v1", child_module_id: "m2", child_value_id: "v3" },
    ];

    const result = filterAvailableOptions(modules, selected, dependencies);

    const sizeModule = result.find((m) => m.id === "m2")!;
    expect(sizeModule.values.length).toBe(2);
    expect(sizeModule.values.find((v) => v.value_id === "v3")!.available).toBe(true);
    expect(sizeModule.values.find((v) => v.value_id === "v4")!.available).toBe(false);
  });

  it("shows all child values when parent has no dependency for selected value", () => {
    const modules = [
      createModule("m1", "Color", [
        { value_id: "v1", label: "Red", raw_value: "#FF0000", available: true },
        { value_id: "v2", label: "Blue", raw_value: "#0000FF", available: true },
      ]),
      createModule("m2", "Size", [
        { value_id: "v3", label: "S", raw_value: "S", available: true },
        { value_id: "v4", label: "M", raw_value: "M", available: true },
      ]),
    ];
    // Select Blue (no dependency restriction)
    const selected = new Map([["m1", "v2"]]);
    const dependencies: Dependency[] = [
      { parent_module_id: "m1", parent_value_id: "v1", child_module_id: "m2", child_value_id: "v3" },
    ];

    const result = filterAvailableOptions(modules, selected, dependencies);

    const sizeModule = result.find((m) => m.id === "m2")!;
    expect(sizeModule.values.every((v) => v.available)).toBe(true);
  });

  it("shows all child values when no parent is selected despite existing dependencies", () => {
    const modules = [
      createModule("m1", "Color", [
        { value_id: "v1", label: "Red", raw_value: "#FF0000", available: true },
      ]),
      createModule("m2", "Size", [
        { value_id: "v3", label: "S", raw_value: "S", available: true },
        { value_id: "v4", label: "M", raw_value: "M", available: true },
      ]),
    ];
    const selected = new Map<string, string>();
    const dependencies: Dependency[] = [
      { parent_module_id: "m1", parent_value_id: "v1", child_module_id: "m2", child_value_id: "v3" },
    ];

    const result = filterAvailableOptions(modules, selected, dependencies);

    const sizeModule = result.find((m) => m.id === "m2")!;
    expect(sizeModule.values.every((v) => v.available)).toBe(true);
  });

  it("allows all child values when dependency has null child_value_id", () => {
    const modules = [
      createModule("m1", "Color", [
        { value_id: "v1", label: "Red", raw_value: "#FF0000", available: true },
      ]),
      createModule("m2", "Size", [
        { value_id: "v3", label: "S", raw_value: "S", available: true },
        { value_id: "v4", label: "M", raw_value: "M", available: true },
      ]),
    ];
    const selected = new Map([["m1", "v1"]]);
    const dependencies: Dependency[] = [
      { parent_module_id: "m1", parent_value_id: "v1", child_module_id: "m2", child_value_id: null },
    ];

    const result = filterAvailableOptions(modules, selected, dependencies);

    const sizeModule = result.find((m) => m.id === "m2")!;
    expect(sizeModule.values.every((v) => v.available)).toBe(true);
  });
});

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

// ════════════════════════════════════════════════════════════════════
//  MODULE SORTING
// ════════════════════════════════════════════════════════════════════
describe("sortModules", () => {
  it("sorts by sort_order ascending", () => {
    const modules = [
      { ...createModule("m1", "Color", []), sort_order: 2 },
      { ...createModule("m2", "Size", []), sort_order: 0 },
      { ...createModule("m3", "Material", []), sort_order: 1 },
    ];

    const sorted = sortModules(modules);

    expect(sorted.map((m) => m.id)).toEqual(["m2", "m3", "m1"]);
  });

  it("does not mutate original array", () => {
    const modules = [
      { ...createModule("m1", "Color", []), sort_order: 2 },
      { ...createModule("m2", "Size", []), sort_order: 0 },
    ];

    sortModules(modules);

    expect(modules[0].id).toBe("m1");
    expect(modules[1].id).toBe("m2");
  });
});
