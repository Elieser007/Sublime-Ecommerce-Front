/**
 * AttributeManager Tests
 * 
 * Tests for admin attribute management logic:
 * - Module assignment/unassignment
 * - Value management with price modifiers
 * - Dependency form cascading selectors
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// ─── TYPES ────────────────────────────────────────────────

interface AttributeModule {
  id: string;
  name: string;
  slug: string;
  frontend_component: string;
  sort_order: number;
  is_active: boolean;
}

interface AttributeValue {
  id: string;
  module_id: string;
  label: string;
  raw_value: string;
  hex_color: string | null;
  sort_order: number;
}

interface ProductAttribute {
  id: string;
  product_id: string;
  module_id: string;
  module_name: string;
  values: Array<{
    id: string;
    label: string;
    raw_value: string;
    price_modifier: number;
  }>;
}

interface AttributeDependency {
  id: string;
  parent_module_id: string;
  parent_value_id: string;
  parent_value_label: string;
  child_module_id: string;
  child_value_id: string | null;
  child_value_label: string | null;
}

// ─── MOCK DATA ────────────────────────────────────────────

const mockModules: AttributeModule[] = [
  { id: "mod-1", name: "Color", slug: "color", frontend_component: "ColorSelector", sort_order: 1, is_active: true },
  { id: "mod-2", name: "Talle", slug: "talle", frontend_component: "SizeSelector", sort_order: 2, is_active: true },
  { id: "mod-3", name: "Material", slug: "material", frontend_component: "MaterialSelector", sort_order: 3, is_active: true },
];

const mockProductAttributes: ProductAttribute[] = [
  {
    id: "pa-1",
    product_id: "prod-1",
    module_id: "mod-1",
    module_name: "Color",
    values: [
      { id: "val-1", label: "Rojo", raw_value: "#FF0000", price_modifier: 0 },
      { id: "val-2", label: "Azul", raw_value: "#0000FF", price_modifier: 500 },
    ],
  },
  {
    id: "pa-2",
    product_id: "prod-1",
    module_id: "mod-2",
    module_name: "Talle",
    values: [
      { id: "val-3", label: "S", raw_value: "S", price_modifier: 0 },
      { id: "val-4", label: "M", raw_value: "M", price_modifier: 0 },
      { id: "val-5", label: "L", raw_value: "L", price_modifier: 200 },
    ],
  },
];

const mockDependencies: AttributeDependency[] = [
  {
    id: "dep-1",
    parent_module_id: "mod-1",
    parent_value_id: "val-1",
    parent_value_label: "Rojo",
    child_module_id: "mod-2",
    child_value_id: "val-3",
    child_value_label: "S",
  },
];

// ─── HELPER FUNCTIONS ─────────────────────────────────────

/**
 * Get available modules (not yet assigned to product)
 */
function getAvailableModules(
  allModules: AttributeModule[],
  assignedAttributes: ProductAttribute[]
): AttributeModule[] {
  const assignedModuleIds = new Set(assignedAttributes.map((a) => a.module_id));
  return allModules.filter((m) => !assignedModuleIds.has(m.id));
}

/**
 * Calculate total price modifier for a product
 */
function calculateTotalModifier(attributes: ProductAttribute[]): number {
  return attributes.reduce((total, attr) => {
    return total + attr.values.reduce((sum, v) => sum + v.price_modifier, 0);
  }, 0);
}

/**
 * Format price modifier for display
 */
function formatPriceModifier(modifier: number): string {
  if (modifier === 0) return "";
  const sign = modifier > 0 ? "+" : "";
  return `${sign}₲${modifier.toLocaleString("es-PY")}`;
}

/**
 * Validate dependency form inputs
 */
function validateDependencyForm(
  parentModuleId: string,
  parentValueId: string,
  childModuleId: string,
  childValueIds: string[]
): { valid: boolean; error?: string } {
  if (!parentModuleId) return { valid: false, error: "Seleccioná un módulo padre" };
  if (!parentValueId) return { valid: false, error: "Seleccioná un valor padre" };
  if (!childModuleId) return { valid: false, error: "Seleccioná un módulo hijo" };
  if (parentModuleId === childModuleId) {
    return { valid: false, error: "El módulo hijo debe ser diferente al padre" };
  }
  return { valid: true };
}

/**
 * Check if a dependency already exists
 */
function dependencyExists(
  dependencies: AttributeDependency[],
  parentModuleId: string,
  parentValueId: string,
  childModuleId: string,
  childValueId: string | null
): boolean {
  return dependencies.some(
    (d) =>
      d.parent_module_id === parentModuleId &&
      d.parent_value_id === parentValueId &&
      d.child_module_id === childModuleId &&
      d.child_value_id === childValueId
  );
}

/**
 * Get available values for picker (filter out already assigned)
 */
function getAvailableValuesForPicker(
  allValues: AttributeValue[],
  assignedValueIds: Set<string>
): AttributeValue[] {
  return allValues.filter((v) => !assignedValueIds.has(v.id));
}

/**
 * Check if a value is already assigned to a product attribute
 */
function isValueAssigned(assignedValueIds: Set<string>, valueId: string): boolean {
  return assignedValueIds.has(valueId);
}

/**
 * Build assigned value IDs set from product attributes
 */
function buildAssignedValueIds(attributes: ProductAttribute[], moduleId: string): Set<string> {
  const attr = attributes.find((a) => a.module_id === moduleId);
  if (!attr) return new Set();
  return new Set(attr.values.map((v) => v.id));
}

// ─── TESTS ────────────────────────────────────────────────

describe("AttributeManager logic", () => {
  describe("getAvailableModules", () => {
    it("returns all modules when none are assigned", () => {
      const available = getAvailableModules(mockModules, []);
      expect(available).toHaveLength(3);
      expect(available.map((m) => m.id)).toEqual(["mod-1", "mod-2", "mod-3"]);
    });

    it("excludes assigned modules", () => {
      const available = getAvailableModules(mockModules, mockProductAttributes);
      expect(available).toHaveLength(1);
      expect(available[0].id).toBe("mod-3");
    });

    it("handles empty modules list", () => {
      const available = getAvailableModules([], mockProductAttributes);
      expect(available).toHaveLength(0);
    });
  });

  describe("calculateTotalModifier", () => {
    it("sums all price modifiers across modules", () => {
      // Color: 0 + 500 = 500, Talle: 0 + 0 + 200 = 200, Total: 700
      const total = calculateTotalModifier(mockProductAttributes);
      expect(total).toBe(700);
    });

    it("returns 0 for empty attributes", () => {
      expect(calculateTotalModifier([])).toBe(0);
    });

    it("handles negative modifiers", () => {
      const attrs: ProductAttribute[] = [
        {
          id: "pa-1",
          product_id: "prod-1",
          module_id: "mod-1",
          module_name: "Color",
          values: [{ id: "val-1", label: "Rojo", raw_value: "#FF0000", price_modifier: -200 }],
        },
      ];
      expect(calculateTotalModifier(attrs)).toBe(-200);
    });
  });

  describe("formatPriceModifier", () => {
    it("returns empty string for zero modifier", () => {
      expect(formatPriceModifier(0)).toBe("");
    });

    it("formats positive modifier with + sign", () => {
      expect(formatPriceModifier(500)).toBe("+₲500");
    });

    it("formats negative modifier", () => {
      // Intl.NumberFormat places currency symbol after negative sign
      expect(formatPriceModifier(-300)).toBe("₲-300");
    });

    it("formats large numbers with locale", () => {
      expect(formatPriceModifier(15000)).toBe("+₲15.000");
    });
  });

  describe("validateDependencyForm", () => {
    it("returns valid for complete form", () => {
      const result = validateDependencyForm("mod-1", "val-1", "mod-2", ["val-3"]);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("returns error when parent module missing", () => {
      const result = validateDependencyForm("", "val-1", "mod-2", ["val-3"]);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Seleccioná un módulo padre");
    });

    it("returns error when parent value missing", () => {
      const result = validateDependencyForm("mod-1", "", "mod-2", ["val-3"]);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Seleccioná un valor padre");
    });

    it("returns error when child module missing", () => {
      const result = validateDependencyForm("mod-1", "val-1", "", ["val-3"]);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Seleccioná un módulo hijo");
    });

    it("returns error when parent and child are same module", () => {
      const result = validateDependencyForm("mod-1", "val-1", "mod-1", ["val-2"]);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("El módulo hijo debe ser diferente al padre");
    });
  });

  describe("dependencyExists", () => {
    it("returns true for existing dependency", () => {
      const exists = dependencyExists(mockDependencies, "mod-1", "val-1", "mod-2", "val-3");
      expect(exists).toBe(true);
    });

    it("returns false for non-existing dependency", () => {
      const exists = dependencyExists(mockDependencies, "mod-1", "val-2", "mod-2", "val-4");
      expect(exists).toBe(false);
    });

    it("handles null child_value_id (all values allowed)", () => {
      const depsWithNull: AttributeDependency[] = [
        {
          id: "dep-2",
          parent_module_id: "mod-1",
          parent_value_id: "val-1",
          parent_value_label: "Rojo",
          child_module_id: "mod-2",
          child_value_id: null,
          child_value_label: null,
        },
      ];
      const exists = dependencyExists(depsWithNull, "mod-1", "val-1", "mod-2", null);
      expect(exists).toBe(true);
    });

    it("returns false for empty dependencies", () => {
      const exists = dependencyExists([], "mod-1", "val-1", "mod-2", "val-3");
      expect(exists).toBe(false);
    });
  });

  describe("Value Picker", () => {
    const allModuleValues: AttributeValue[] = [
      { id: "val-1", module_id: "mod-1", label: "Rojo", raw_value: "#FF0000", hex_color: "#FF0000", sort_order: 0 },
      { id: "val-2", module_id: "mod-1", label: "Azul", raw_value: "#0000FF", hex_color: "#0000FF", sort_order: 1 },
      { id: "val-6", module_id: "mod-1", label: "Verde", raw_value: "#00FF00", hex_color: "#00FF00", sort_order: 2 },
    ];

    it("buildAssignedValueIds returns correct set for module", () => {
      const assignedIds = buildAssignedValueIds(mockProductAttributes, "mod-1");
      expect(assignedIds.size).toBe(2);
      expect(assignedIds.has("val-1")).toBe(true);
      expect(assignedIds.has("val-2")).toBe(true);
    });

    it("buildAssignedValueIds returns empty set for unassigned module", () => {
      const assignedIds = buildAssignedValueIds(mockProductAttributes, "mod-3");
      expect(assignedIds.size).toBe(0);
    });

    it("getAvailableValuesForPicker excludes assigned values", () => {
      const assignedIds = new Set(["val-1", "val-2"]);
      const available = getAvailableValuesForPicker(allModuleValues, assignedIds);
      expect(available).toHaveLength(1);
      expect(available[0].id).toBe("val-6");
    });

    it("getAvailableValuesForPicker returns all when none assigned", () => {
      const assignedIds = new Set<string>();
      const available = getAvailableValuesForPicker(allModuleValues, assignedIds);
      expect(available).toHaveLength(3);
    });

    it("picker excludes values assigned to the product (API id shape, REQ-4)", () => {
      const assignedIds = buildAssignedValueIds(mockProductAttributes, "mod-1");
      const available = getAvailableValuesForPicker(allModuleValues, assignedIds);
      expect(available.map((v) => v.id)).toEqual(["val-6"]);
    });

    it("returns empty list when all values are assigned (empty state, REQ-4)", () => {
      const allIds = new Set(allModuleValues.map((v) => v.id));
      const available = getAvailableValuesForPicker(allModuleValues, allIds);
      expect(available).toHaveLength(0);
    });

    it("isValueAssigned returns true for assigned value", () => {
      const assignedIds = new Set(["val-1", "val-2"]);
      expect(isValueAssigned(assignedIds, "val-1")).toBe(true);
    });

    it("isValueAssigned returns false for unassigned value", () => {
      const assignedIds = new Set(["val-1", "val-2"]);
      expect(isValueAssigned(assignedIds, "val-6")).toBe(false);
    });
  });
});

describe("AttributeManager source structure", () => {
  const source = readFileSync(resolve(__dirname, "../admin/AttributeManager.astro"), "utf-8");

  it("picker add button uses global btn classes, not scoped attr-picker-btn", () => {
    expect(source).toContain('class="btn btn--primary btn--sm" onclick="assignValueFromPicker');
    expect(source).not.toContain("attr-picker-btn");
  });

  it("price modifier input uses global form-input form-input--sm classes", () => {
    expect(source).toContain('type="number" class="form-input form-input--sm"');
  });

  it("scoped style block does not style innerHTML-injected markup", () => {
    const scoped = source.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
    for (const selector of [
      ".attr-module-card",
      ".attr-value-row",
      ".attr-empty-state",
      ".attr-picker-item",
      ".attr-dep-item",
      ".attr-checklist-item",
    ]) {
      expect(scoped, `scoped styles still contain ${selector}`).not.toContain(selector);
    }
  });
});
