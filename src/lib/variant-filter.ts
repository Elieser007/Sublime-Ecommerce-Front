/**
 * Variant Dependency Filter — client-side port of the backend's
 * GET /api/public/products/:id/variants availability semantics.
 *
 * The backend returns ALL values plus the full dependency graph when called
 * without ?selected=. This module reproduces that filter logic exactly so the
 * storefront can resolve value availability and final price purely in the
 * browser — zero runtime /variants requests on catalog pages (SSG).
 *
 * Filter semantics (ported 1:1 from the backend):
 * - For a child module, relevantDeps = dependencies where child_module_id === module
 * - A value is available unless SOME selected parent module/value has
 *   restriction rows and none of them allow it:
 *   - depsForThisValue = relevantDeps where parent_module_id/value matches a selection
 *   - no deps for a given parent → that parent imposes no restriction
 *   - otherwise isAllowed = some dep where child_value_id is null (entire child
 *     module allowed) or equals the value id
 * - Only directly-selected parents constrain. No transitive chains.
 */

// ─── TYPES (backend response shape) ────────────────────────

export interface BakedModuleValue {
  value_id: string;
  label: string;
  raw_value: string;
  hex_color: string | null;
  price_modifier: number;
  available: boolean;
}

export interface BakedModule {
  module_id: string;
  name: string;
  slug: string;
  frontend_component: string;
  sort_order: number;
  values: BakedModuleValue[];
}

export interface VariantDependency {
  parent_module_id: string;
  parent_value_id: string;
  child_module_id: string;
  child_value_id: string | null;
}

export type SelectedValues = Map<string, string> | Record<string, string>;

// ─── HELPERS ───────────────────────────────────────────────

function toSelectionMap(selected: SelectedValues): Map<string, string> {
  return selected instanceof Map ? selected : new Map(Object.entries(selected));
}

function isValueAllowed(
  moduleId: string,
  valueId: string,
  dependencies: VariantDependency[],
  selected: Map<string, string>
): boolean {
  const relevantDeps = dependencies.filter((d) => d.child_module_id === moduleId);
  if (relevantDeps.length === 0) return true;

  for (const [parentModuleId, parentValueId] of selected) {
    // A module never constrains its own values.
    if (parentModuleId === moduleId) continue;

    const depsForThisValue = relevantDeps.filter(
      (d) => d.parent_module_id === parentModuleId && d.parent_value_id === parentValueId
    );

    // No restrictions declared for this parent value → no constraint from it.
    if (depsForThisValue.length === 0) continue;

    const isAllowed = depsForThisValue.some(
      (d) => !d.child_value_id || d.child_value_id === valueId
    );
    if (!isAllowed) return false;
  }

  return true;
}

// ─── PUBLIC API ────────────────────────────────────────────

/**
 * Compute each value's `available` flag given the current selections.
 * Returns new module/value objects — the input is never mutated.
 * Values that the backend would have filtered out are kept but flagged
 * `available: false` so the <variant-selector> UI can disable them.
 */
export function resolveAvailable(
  modules: BakedModule[],
  dependencies: VariantDependency[],
  selected: SelectedValues = {}
): BakedModule[] {
  const sel = toSelectionMap(selected);
  return modules.map((mod) => ({
    ...mod,
    values: mod.values.map((value) => ({
      ...value,
      available: isValueAllowed(mod.module_id, value.value_id, dependencies, sel),
    })),
  }));
}

/**
 * Final price = basePrice (already tier-adjusted by the caller) plus the sum
 * of the price_modifier of every selected value. Never below 0.
 */
export function resolveFinalPrice(
  basePrice: number,
  modules: BakedModule[],
  selected: SelectedValues = {}
): number {
  const sel = toSelectionMap(selected);
  let total = basePrice;
  for (const [moduleId, valueId] of sel) {
    const mod = modules.find((m) => m.module_id === moduleId);
    const value = mod?.values.find((v) => v.value_id === valueId);
    if (value && typeof value.price_modifier === "number") {
      total += value.price_modifier;
    }
  }
  return Math.max(0, total);
}
