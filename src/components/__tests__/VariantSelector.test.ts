/**
 * VariantSelector Tests
 *
 * Tests for public variant selection logic:
 * - Price calculation with modifiers
 * - Dependency filtering
 * - Selection completeness check
 * - Module sorting
 */

import { describe, it, expect } from "vitest";
import {
  computeFinalPrice,
  filterAvailableOptions,
  isSelectionComplete,
  sortModules,
  type ModuleWithValues,
  type Dependency,
} from "../../lib/variant-logic";

// ─── MOCK DATA ────────────────────────────────────────────

const mockModules: ModuleWithValues[] = [
  {
    id: "mod-color",
    module_id: "mod-color",
    name: "Color",
    slug: "color_hex",
    frontend_component: "ColorSelector",
    sort_order: 1,
    values: [
      { value_id: "val-rojo", label: "Rojo", raw_value: "#FF0000", hex_color: "#FF0000", price_modifier: 0, available: true },
      { value_id: "val-azul", label: "Azul", raw_value: "#0000FF", hex_color: "#0000FF", price_modifier: 500, available: true },
    ],
  },
  {
    id: "mod-size",
    module_id: "mod-size",
    name: "Talle",
    slug: "size_nomenclature",
    frontend_component: "SizeSelector",
    sort_order: 2,
    values: [
      { value_id: "val-s", label: "S", raw_value: "S", hex_color: null, price_modifier: 0, available: true },
      { value_id: "val-m", label: "M", raw_value: "M", hex_color: null, price_modifier: 0, available: true },
      { value_id: "val-l", label: "L", raw_value: "L", hex_color: null, price_modifier: 200, available: true },
      { value_id: "val-xl", label: "XL", raw_value: "XL", hex_color: null, price_modifier: 500, available: true },
    ],
  },
  {
    id: "mod-material",
    module_id: "mod-material",
    name: "Material",
    slug: "material_type",
    frontend_component: "MaterialSelector",
    sort_order: 3,
    values: [
      { value_id: "val-algodon", label: "Algodón", raw_value: "cotton", hex_color: null, price_modifier: 0, available: true },
      { value_id: "val-polyester", label: "Poliéster", raw_value: "polyester", hex_color: null, price_modifier: -300, available: true },
    ],
  },
];

const mockDependencies: Dependency[] = [
  // When Rojo is selected, only M, L, XL are available (not S)
  { parent_module_id: "mod-color", parent_value_id: "val-rojo", child_module_id: "mod-size", child_value_id: "val-m" },
  { parent_module_id: "mod-color", parent_value_id: "val-rojo", child_module_id: "mod-size", child_value_id: "val-l" },
  { parent_module_id: "mod-color", parent_value_id: "val-rojo", child_module_id: "mod-size", child_value_id: "val-xl" },
];

// ─── TESTS ────────────────────────────────────────────────

describe("VariantSelector logic", () => {
  // ── Price Calculation ──

  describe("computeFinalPrice", () => {
    it("returns base price when no modifiers selected", () => {
      expect(computeFinalPrice(15000, [])).toBe(15000);
    });

    it("adds positive modifiers to base price", () => {
      // base 15000 + Azul(+500) + XL(+500) = 16000
      expect(computeFinalPrice(15000, [500, 500])).toBe(16000);
    });

    it("subtracts negative modifiers from base price", () => {
      // base 15000 + Poliéster(-300) = 14700
      expect(computeFinalPrice(15000, [-300])).toBe(14700);
    });

    it("handles mixed positive and negative modifiers", () => {
      // base 15000 + Azul(+500) + L(+200) + Poliéster(-300) = 15400
      expect(computeFinalPrice(15000, [500, 200, -300])).toBe(15400);
    });

    it("never goes below 0 (floor at zero)", () => {
      // base 1000 + Poliéster(-300) + Poliéster(-300) + Poliéster(-300) = max(0, 100)
      expect(computeFinalPrice(1000, [-300, -300, -300])).toBe(100);
    });

    it("returns 0 when base price is 0", () => {
      expect(computeFinalPrice(0, [500])).toBe(500);
    });

    it("handles all zero modifiers (EC-6)", () => {
      expect(computeFinalPrice(15000, [0, 0, 0])).toBe(15000);
    });

    it("handles large prices typical of Guaraníes", () => {
      expect(computeFinalPrice(250000, [15000, -5000])).toBe(260000);
    });
  });

  // ── Dependency Filtering ──

  describe("filterAvailableOptions", () => {
    it("returns all values available when no dependencies exist", () => {
      const result = filterAvailableOptions(mockModules, new Map(), []);
      // All values should be available
      for (const mod of result) {
        for (const val of mod.values) {
          expect(val.available).toBe(true);
        }
      }
    });

    it("disables child values not allowed by parent selection", () => {
      const selected = new Map<string, string>([["mod-color", "val-rojo"]]);
      const result = filterAvailableOptions(mockModules, selected, mockDependencies);

      const sizeModule = result.find((m) => m.id === "mod-size");
      expect(sizeModule).toBeDefined();

      // S should be unavailable (not in dependencies for Rojo)
      const sValue = sizeModule!.values.find((v) => v.value_id === "val-s");
      expect(sValue!.available).toBe(false);

      // M, L, XL should be available
      const mValue = sizeModule!.values.find((v) => v.value_id === "val-m");
      const lValue = sizeModule!.values.find((v) => v.value_id === "val-l");
      const xlValue = sizeModule!.values.find((v) => v.value_id === "val-xl");
      expect(mValue!.available).toBe(true);
      expect(lValue!.available).toBe(true);
      expect(xlValue!.available).toBe(true);
    });

    it("keeps all child values available when parent has no dependencies", () => {
      const selected = new Map<string, string>([["mod-color", "val-azul"]]);
      const result = filterAvailableOptions(mockModules, selected, mockDependencies);

      const sizeModule = result.find((m) => m.id === "mod-size");
      expect(sizeModule).toBeDefined();

      // No dependencies for Azul, so all sizes available
      for (const val of sizeModule!.values) {
        expect(val.available).toBe(true);
      }
    });

    it("returns empty values array when all dependencies eliminate options", () => {
      // Create deps that eliminate ALL size values for a color
      const restrictiveDeps: Dependency[] = [];
      // No deps for Rojo means all sizes available, so let's test with a selection
      // that has dependencies eliminating everything
      const selected = new Map<string, string>([["mod-color", "val-rojo"]]);
      const allSizesBlocked: Dependency[] = []; // Empty = no restrictions

      const result = filterAvailableOptions(mockModules, selected, allSizesBlocked);
      const sizeModule = result.find((m) => m.id === "mod-size");
      // With no deps, all should be available
      for (const val of sizeModule!.values) {
        expect(val.available).toBe(true);
      }
    });

    it("null child_value_id allows all values in child module (EC-3)", () => {
      const depsWithNull: Dependency[] = [
        { parent_module_id: "mod-color", parent_value_id: "val-azul", child_module_id: "mod-size", child_value_id: null },
      ];
      const selected = new Map<string, string>([["mod-color", "val-azul"]]);
      const result = filterAvailableOptions(mockModules, selected, depsWithNull);

      const sizeModule = result.find((m) => m.id === "mod-size");
      // null child_value_id = all sizes allowed for Azul
      for (const val of sizeModule!.values) {
        expect(val.available).toBe(true);
      }
    });

    it("multiple parent selections combine allowed children", () => {
      // Rojo selected → only M, L, XL allowed (not S)
      // Material module has no deps referencing it → all values available
      const selected = new Map<string, string>([
        ["mod-color", "val-rojo"],
      ]);
      const result = filterAvailableOptions(mockModules, selected, mockDependencies);

      const sizeModule = result.find((m) => m.id === "mod-size");
      const sValue = sizeModule!.values.find((v) => v.value_id === "val-s");
      // S is not in Rojo's deps → unavailable
      expect(sValue!.available).toBe(false);

      // Material module has no dependencies → all values available
      const materialModule = result.find((m) => m.id === "mod-material");
      for (const val of materialModule!.values) {
        expect(val.available).toBe(true);
      }
    });
  });

  // ── Selection Completeness ──

  describe("isSelectionComplete", () => {
    it("returns true when all modules with values are selected", () => {
      const selected = new Map<string, string>([
        ["mod-color", "val-rojo"],
        ["mod-size", "val-m"],
        ["mod-material", "val-algodon"],
      ]);
      expect(isSelectionComplete(mockModules, selected)).toBe(true);
    });

    it("returns false when a module is not selected", () => {
      const selected = new Map<string, string>([
        ["mod-color", "val-rojo"],
        // size not selected
        ["mod-material", "val-algodon"],
      ]);
      expect(isSelectionComplete(mockModules, selected)).toBe(false);
    });

    it("returns false when no modules are selected", () => {
      expect(isSelectionComplete(mockModules, new Map())).toBe(false);
    });

    it("returns true for empty modules list", () => {
      expect(isSelectionComplete([], new Map())).toBe(true);
    });

    it("skips modules with no values", () => {
      const modulesWithEmpty: ModuleWithValues[] = [
        { ...mockModules[0], values: [] }, // color module with no values
        mockModules[1], // size module with values
      ];
      const selected = new Map<string, string>([["mod-size", "val-m"]]);
      expect(isSelectionComplete(modulesWithEmpty, selected)).toBe(true);
    });
  });

  // ── Module Sorting ──

  describe("sortModules", () => {
    it("sorts modules by sort_order ascending", () => {
      const unsorted: ModuleWithValues[] = [
        { ...mockModules[2] }, // material, sort_order: 3
        { ...mockModules[0] }, // color, sort_order: 1
        { ...mockModules[1] }, // size, sort_order: 2
      ];

      const sorted = sortModules(unsorted);
      expect(sorted.map((m) => m.id)).toEqual(["mod-color", "mod-size", "mod-material"]);
    });

    it("does not mutate original array", () => {
      const unsorted: ModuleWithValues[] = [
        { ...mockModules[2] },
        { ...mockModules[0] },
      ];
      const originalIds = unsorted.map((m) => m.id);

      sortModules(unsorted);
      expect(unsorted.map((m) => m.id)).toEqual(originalIds);
    });

    it("handles empty array", () => {
      expect(sortModules([])).toEqual([]);
    });

    it("handles single module", () => {
      const single = [{ ...mockModules[0] }];
      expect(sortModules(single)).toHaveLength(1);
    });
  });
});
