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
 * Check if every *selectable* module has a selected value.
 *
 * Only modules with at least one available value (available !== false) are
 * counted — mirroring the backend, which filters out values that dependencies
 * forbid and (with no selection) drops all-unavailable modules entirely. A
 * module whose values are ALL unavailable is treated as absent, so it can
 * never permanently block add-to-cart (the all-unavailable deadlock fix).
 * Values without an explicit `available` flag are treated as selectable
 * (legacy payloads).
 *
 * @param modules - All modules with their values
 * @param selectedAttributes - Map of moduleId → valueId
 * @returns true if every selectable module has a selection
 */
export function isSelectionComplete(
  modules: ModuleWithValues[],
  selectedAttributes: Map<string, string>
): boolean {
  if (modules.length === 0) return true;

  return modules.every((mod) => {
    // Modules with no selectable values impose no requirement.
    const hasSelectableValue = mod.values.some((v) => v.available !== false);
    if (!hasSelectableValue) return true;
    return selectedAttributes.has(mod.module_id);
  });
}


