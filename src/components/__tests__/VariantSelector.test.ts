/**
 * VariantSelector Tests
 *
 * Tests for public variant selection logic:
 * - Price calculation with modifiers
 * - Selection completeness check
 */

import { describe, it, expect } from "vitest";
import {
  computeFinalPrice,
  isSelectionComplete,
  type ModuleWithValues,
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
});
