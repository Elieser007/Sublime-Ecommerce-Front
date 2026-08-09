/**
 * Variant bake-failure fallback — SSG safety net.
 *
 * The attribute-variant graph is baked into pages at build time
 * (src/lib/catalog-batch.ts). If that bake failed for a product whose
 * payload said modules should exist, the page/modal must not let the user
 * add the product to the cart without choosing options — a variant product
 * added without options is an invalid cart entry. This module is the single,
 * testable source of that decision. Consumers:
 *   - src/pages/products/[slug].astro  (server render + client wiring)
 *   - src/components/variant-modal.js  (confirm guard)
 *
 * Signal — bake outcome, NOT legacy `has_variants`:
 * The backend payload carries `has_attribute_modules` (EXISTS product_attribute)
 * plus the fully baked graph (available_modules, dependencies, base_price).
 * `resolveProductGraph` (catalog-batch.ts) computes `bakeFailed`:
 *   corrupt = graph key absent / JSON parse fails / non-array / base_price
 *             non-number
 *   bakeFailed = corrupt || (has_attribute_modules && modules.length === 0)
 * Legacy `has_variants` (SKU count) is intentionally NOT used: on the seeded
 * catalog 22/73 products (all size products) have SKUs but zero attribute
 * modules — using SKU count would show a false "unavailable" notice and block
 * add-to-cart. Zero modules with a clean payload = genuine "no variants".
 */

export interface VariantUiState {
  /** True when the product's baked variant graph is missing/corrupt → notice. */
  showFallbackNotice: boolean;
  /** True when adding to cart is safe (no fallback notice). */
  canAddToCart: boolean;
}

/**
 * Resolve the variant UI state from the bake outcome.
 *
 * @param product     The product payload (kept for call-site symmetry).
 * @param modules     The baked attribute modules (informational).
 * @param dependencies The baked dependency graph (informational).
 * @param bakeFailed  The bake-outcome signal computed by resolveProductGraph:
 *                    true when the payload said modules should exist but the
 *                    graph is missing/corrupt. Defaults to false so callers
 *                    without a resolved graph stay purchasable.
 */
export function resolveVariantUiState(
  _product: unknown,
  _modules: readonly unknown[],
  _dependencies: readonly unknown[],
  bakeFailed = false
): VariantUiState {
  return {
    showFallbackNotice: bakeFailed,
    canAddToCart: !bakeFailed,
  };
}
