/**
 * Variant Selection Logic — Pure functions for VariantSelector
 *
 * These functions drive the client-side variant selection behavior:
 * - Price calculation (base + modifiers)
 * - Dependency filtering (available/unavailable values)
 * - Selection completeness check
 * - Module sorting
 *
 * Used by: VariantSelector.astro, SizeSelector.astro, ColorSelector.astro, MaterialSelector.astro
 */

// ─── TYPES ────────────────────────────────────────────────

export interface AttributeModule {
  id: string;
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

export interface Dependency {
  parent_module_id: string;
  parent_value_id: string;
  child_module_id: string;
  child_value_id: string | null;
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

// ─── DEPENDENCY FILTERING ─────────────────────────────────

/**
 * Filter available values in child modules based on current selection and dependencies.
 *
 * For each dependency where the parent value is selected:
 * - If child_value_id is set, that specific child value is allowed
 * - If child_value_id is null, all values in the child module are allowed
 *
 * Values not covered by any active dependency become unavailable.
 *
 * @param modules - All modules with their values
 * @param selectedAttributes - Map of moduleId → valueId (current selection)
 * @param dependencies - All dependency rules
 * @returns Modules with values marked as available/unavailable
 */
export function filterAvailableOptions(
  modules: ModuleWithValues[],
  selectedAttributes: Map<string, string>,
  dependencies: Dependency[]
): ModuleWithValues[] {
  if (dependencies.length === 0) {
    // No dependencies — all values remain available
    return modules.map((mod) => ({
      ...mod,
      values: mod.values.map((v) => ({ ...v, available: true })),
    }));
  }

  // Build a map: child_module_id → Set of allowed child_value_ids
  const allowedByModule = new Map<string, Set<string> | null>();

  for (const [parentModuleId, parentValueId] of selectedAttributes) {
    const matchingDeps = dependencies.filter(
      (d) => d.parent_module_id === parentModuleId && d.parent_value_id === parentValueId
    );

    for (const dep of matchingDeps) {
      if (dep.child_value_id === null) {
        // null means all values in child module are allowed
        allowedByModule.set(dep.child_module_id, null);
      } else {
        const existing = allowedByModule.get(dep.child_module_id);
        if (existing === null) {
          // Already marked as "all allowed" — skip
          continue;
        }
        if (!existing) {
          allowedByModule.set(dep.child_module_id, new Set());
        }
        allowedByModule.get(dep.child_module_id)!.add(dep.child_value_id);
      }
    }
  }

  return modules.map((mod) => {
    const allowed = allowedByModule.get(mod.id);

    // If no dependencies reference this module, all values stay available
    if (allowed === undefined) {
      return {
        ...mod,
        values: mod.values.map((v) => ({ ...v, available: true })),
      };
    }

    // null = all allowed; Set = only specific values allowed
    return {
      ...mod,
      values: mod.values.map((v) => ({
        ...v,
        available: allowed === null ? true : allowed.has(v.value_id),
      })),
    };
  });
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
    return selectedAttributes.has(mod.id);
  });
}

// ─── MODULE SORTING ───────────────────────────────────────

/**
 * Sort modules by sort_order ascending. Does not mutate the original array.
 *
 * @param modules - Array of modules to sort
 * @returns New array sorted by sort_order
 */
export function sortModules(modules: ModuleWithValues[]): ModuleWithValues[] {
  return [...modules].sort((a, b) => a.sort_order - b.sort_order);
}
