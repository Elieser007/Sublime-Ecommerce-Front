/**
 * Variant Selection Logic — Pure functions for VariantSelector
 *
 * These functions drive the client-side variant selection behavior:
 * - Price calculation (base + modifiers)
 * - Selection completeness check
 *
 * Used by: VariantSelector.astro
 */

// ─── TYPES ────────────────────────────────────────────────

export interface AttributeModule {
  id: string;
  module_id: string;
  name: string;
  slug: string;
  frontend_component: string;
  sort_order: number;
}

export interface ModuleValue {
  value_id: string;
  label: string;
  raw_value: string;
  hex_color: string | null;
  price_modifier: number;
  available: boolean;
}

export interface ModuleWithValues extends AttributeModule {
  values: ModuleValue[];
}

// ─── PRICE CALCULATION ────────────────────────────────────

/**
 * Compute final price: base_price + sum of selected value modifiers.
 * Price must never go below 0.
 *
 * @param basePrice - Product base price in Guaraníes
 * @param selectedModifiers - Array of price modifiers from selected values
 * @returns Final price (minimum 0)
 */
export function computeFinalPrice(basePrice: number, selectedModifiers: number[]): number {
  const total = selectedModifiers.reduce((sum, mod) => sum + mod, basePrice);
  return Math.max(0, total);
}

// ─── SELECTION COMPLETENESS ───────────────────────────────

/**
 * Check if all modules with values have a selected value.
 *
 * @param modules - All modules with their values
 * @param selectedAttributes - Map of moduleId → valueId
 * @returns true if every module that has values has a selection
 */
export function isSelectionComplete(
  modules: ModuleWithValues[],
  selectedAttributes: Map<string, string>
): boolean {
  if (modules.length === 0) return true;

  return modules.every((mod) => {
    // Skip modules with no values
    if (mod.values.length === 0) return true;
    return selectedAttributes.has(mod.module_id);
  });
}


