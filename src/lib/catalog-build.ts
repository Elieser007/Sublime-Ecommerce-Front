/**
 * Catalog build data — shared SSG payload.
 *
 * All catalog pages (index.astro, home.astro, products/[slug].astro
 * getStaticPaths) consume the SAME batched catalog. The payload is fetched
 * once per build via a module-level memo (Astro renders every page in one
 * process sharing module instances, so the first page to evaluate triggers
 * the single fetchCatalogBatches run and the rest reuse it). The pipeline
 * issues ⌈products/100⌉ settled batches plus an empty terminator and one
 * aborted speculative successor, so the whole build is ⌈products/100⌉ + 5
 * backend requests: 1 category tree + 2 promotions + the catalog batches
 * (≈6 for the seeded catalog, ≈7 at ~200 products).
 *
 * Exports:
 * - getCatalogBuildData(apiUrl) — memoized { products, bySlug,
 *   variantsByProduct, bakeFailedByProduct }.
 * - resetCatalogCache() — test seam (vitest isolates modules per file, but
 *   within a file each test needs a fresh pipeline).
 * - fetchWithTimeout(url, ms) — AbortController-guarded build fetches
 *   (category tree, promotions) so a hung backend can't stall the build.
 * - EMPTY_VARIANTS_DATA — no-variant graph fallback.
 */

import { fetchCatalogBatches, type ProductWithDetails } from "./catalog-batch";
import type { BakedModule, VariantDependency } from "./variant-filter";

/** Shape of the baked graph passed to the modal / __VARIANTS_DATA__. */
export interface BakedVariantData {
  modules: BakedModule[];
  dependencies: VariantDependency[];
  basePrice: number;
}

export const EMPTY_VARIANTS_DATA: BakedVariantData = {
  modules: [],
  dependencies: [],
  basePrice: 0,
};

export interface CatalogBuildData {
  products: ProductWithDetails[];
  bySlug: Map<string, ProductWithDetails>;
  /** productId → baked graph (mirrors the old bakeVariantsData map). */
  variantsByProduct: Map<string, BakedVariantData>;
  /** productId → bakeFailed signal (payload said modules, graph missing). */
  bakeFailedByProduct: Map<string, boolean>;
}

let cachedPromise: Promise<CatalogBuildData> | null = null;

/** Fetch the full catalog once per build and derive the lookup maps. */
export function getCatalogBuildData(apiUrl: string): Promise<CatalogBuildData> {
  if (!cachedPromise) {
    cachedPromise = fetchCatalogBatches(apiUrl).then((products) => ({
      products,
      bySlug: new Map(products.map((p) => [p.slug, p])),
      variantsByProduct: new Map(
        products.map((p) => [
          p.id,
          {
            modules: p.attributeModules,
            dependencies: p.dependencies,
            basePrice: p.basePrice,
          },
        ])
      ),
      bakeFailedByProduct: new Map(products.map((p) => [p.id, p.bakeFailed])),
    }));
  }
  return cachedPromise;
}

/** Test seam: drop the memo so the next call issues a fresh fetch. */
export function resetCatalogCache(): void {
  cachedPromise = null;
}

/**
 * Fetch with an AbortController timeout (default 10s). The timer is always
 * cleared, so a settled response never leaks a stray timeout. Used for the
 * category-tree and promotion build fetches on index/home.
 */
export async function fetchWithTimeout(
  url: string,
  timeoutMs = 10_000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
