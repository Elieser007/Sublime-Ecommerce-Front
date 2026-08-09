/**
 * Catalog batch pipeline — SSG build data source.
 *
 * Replaces the per-product N+1 build fetches (list + slug detail + /variants
 * ≈ 3 requests/product) with paginated batches of the backend's
 * GET /api/public/catalog endpoint (one request per 100 products).
 *
 * Pipeline guarantees:
 * - Pipelined prefetch: batch N+1 is requested BEFORE batch N is processed,
 *   so network latency overlaps with graph resolution.
 * - Per-batch AbortController with a timeout; non-ok responses and timeouts
 *   REJECT (fail-loud — an unreachable/corrupt backend must fail the build,
 *   never silently ship an empty catalog).
 * - An empty/short batch ends the loop; its speculative successor is aborted
 *   and the rejection swallowed (never a floating promise).
 *
 * Every raw product is resolved through resolveProductGraph, which computes
 * the bakeFailed signal (payload says modules should exist but the graph is
 * missing/corrupt) consumed by the variant fallback UI.
 */

import type { BakedModule, VariantDependency } from "./variant-filter";

export interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
  sort_order: number;
  is_primary: number;
}

export interface Variant {
  id: string;
  name: string;
  sku: string;
  price: number | null;
  stock: number;
}

export interface PriceTier {
  id: string;
  min_quantity: number;
  price: number;
}

export interface ProductWithDetails {
  // Raw payload fields (card parity — same shape as /api/public/products).
  id: string;
  name: string;
  slug: string;
  description: string | null;
  base_price: number;
  created_at: number;
  section_name: string | null;
  category_name: string | null;
  subcategory_name: string | null;
  section_slug: string | null;
  category_slug: string | null;
  subcategory_slug: string | null;
  image_url: string | null;
  images: ProductImage[];
  variants: Variant[];
  price_tiers: PriceTier[];
  // Resolved attribute-variant graph (mirrors /variants no-selected shape).
  attributeModules: BakedModule[];
  dependencies: VariantDependency[];
  basePrice: number;
  hasAttributeModules: boolean;
  bakeFailed: boolean;
}

export interface ResolvedGraph {
  modules: BakedModule[];
  dependencies: VariantDependency[];
  basePrice: number;
  bakeFailed: boolean;
}

/** Parse an aggregate array, tolerating a JSON-string form (defensive —
 * the backend parses aggregates, but a proxy/CDN layer might not).
 * Returns null when the value is corrupt (absent, non-array, unparseable). */
function parseArray<T>(value: unknown): T[] | null {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Resolve the attribute-variant graph for one raw catalog product.
 *
 * bakeFailed rule (exact):
 *   corrupt = available_modules/dependencies absent, JSON parse fails,
 *             non-array, or base_price non-number
 *   bakeFailed = corrupt || (has_attribute_modules === true && modules.length === 0)
 *
 * `modules: []` + flag false → genuine no-variants product (e.g. seeded size
 * products with SKUs but no attribute modules) — purchasable, NOT bakeFailed.
 */
export function resolveProductGraph(product: unknown): ResolvedGraph {
  const raw = (product ?? {}) as Record<string, unknown>;

  const parsedModules = parseArray<BakedModule>(raw.available_modules);
  const parsedDependencies = parseArray<VariantDependency>(raw.dependencies);
  const basePrice = typeof raw.base_price === "number" ? raw.base_price : NaN;

  const corrupt =
    parsedModules === null ||
    parsedDependencies === null ||
    !Number.isFinite(basePrice);

  // D1 returns EXISTS as 1/0 — normalize both forms.
  const hasAttributeModules =
    raw.has_attribute_modules === true || raw.has_attribute_modules === 1;

  const bakeFailed =
    corrupt || (hasAttributeModules && (parsedModules ?? []).length === 0);

  return {
    modules: corrupt ? [] : parsedModules,
    dependencies: corrupt ? [] : parsedDependencies,
    basePrice: Number.isFinite(basePrice) ? basePrice : 0,
    bakeFailed,
  };
}

function toProductWithDetails(product: unknown): ProductWithDetails {
  const raw = (product ?? {}) as Record<string, any>;
  const graph = resolveProductGraph(raw);
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    description: raw.description ?? null,
    base_price: raw.base_price,
    created_at: raw.created_at,
    section_name: raw.section_name ?? null,
    category_name: raw.category_name ?? null,
    subcategory_name: raw.subcategory_name ?? null,
    section_slug: raw.section_slug ?? null,
    category_slug: raw.category_slug ?? null,
    subcategory_slug: raw.subcategory_slug ?? null,
    image_url: raw.image_url ?? null,
    // Same parseArray tolerance as modules/dependencies: the backend
    // serializes aggregates, but a proxy/CDN layer might deliver them as
    // JSON strings — corrupt values (absent, non-array, unparseable) degrade
    // to [] rather than breaking the page.
    images: parseArray<ProductImage>(raw.images) ?? [],
    variants: parseArray<Variant>(raw.variants) ?? [],
    price_tiers: parseArray<PriceTier>(raw.price_tiers) ?? [],
    attributeModules: graph.modules,
    dependencies: graph.dependencies,
    basePrice: graph.basePrice,
    hasAttributeModules:
      raw.has_attribute_modules === true || raw.has_attribute_modules === 1,
    bakeFailed: graph.bakeFailed,
  };
}

interface PendingBatch {
  promise: Promise<{ data: unknown[] } | null>;
  controller: AbortController;
  offset: number;
}

/** Abort a pending fetch and swallow its rejection (never left floating). */
function discard(batch: PendingBatch): void {
  batch.controller.abort();
  void batch.promise.catch(() => undefined);
}

/**
 * Fetch the whole catalog in batches of `batchSize` (default 100), pipelined:
 * batch N+1 is requested before batch N is processed. Rejects loudly on the
 * first non-ok response or timeout; stops (and discards the speculative
 * successor) when a batch comes back empty. Returns one flat
 * ProductWithDetails[] for the entire catalog.
 */
export async function fetchCatalogBatches(
  apiUrl: string,
  opts: { batchSize?: number; timeoutMs?: number } = {}
): Promise<ProductWithDetails[]> {
  const batchSize = opts.batchSize ?? 100;
  const timeoutMs = opts.timeoutMs ?? 10_000;
  // Raw rows from the wire are `unknown` until mapped through
  // toProductWithDetails (strict-mode safe: no TS2345 on the spread below).
  const out: unknown[] = [];

  const startBatch = (offset: number): PendingBatch => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const promise = (async () => {
      try {
        const res = await fetch(
          `${apiUrl}/api/public/catalog?limit=${batchSize}&offset=${offset}`,
          { signal: controller.signal }
        );
        if (!res.ok) {
          throw new Error(
            `Failed to fetch catalog batch at offset ${offset}: ${res.status}`
          );
        }
        return (await res.json()) as { data: unknown[] };
      } finally {
        // Every exit path (ok, non-ok, timeout, abort) clears the timer.
        clearTimeout(timer);
      }
    })();
    return { promise, controller, offset };
  };

  let offset = 0;
  let current: PendingBatch = startBatch(offset);
  offset += batchSize;
  // Holds only the speculative N+1 batch while the current one is in flight.
  let next: PendingBatch | null = null;

  try {
    for (;;) {
      next = startBatch(offset);
      offset += batchSize;

      const batch = await current.promise;
      // Fail-loud on a corrupt 200 envelope: a missing/non-array `data`
      // (e.g. a { error } body from a misbehaving proxy) must NOT be read as
      // an empty page — that would silently ship an empty catalog. Same
      // contract as non-ok batches: an unreachable/corrupt backend fails
      // the build.
      if (!batch || !Array.isArray(batch.data)) {
        throw new Error(
          `Corrupt catalog batch at offset ${current.offset}: expected { data: [...] } in the response body`
        );
      }
      const data = batch.data;
      if (data.length === 0) {
        // Past the last page — the speculative successor is useless; the
        // finally block discards it. Fail-loud NOT triggered (empty is a
        // normal end condition, not an error).
        return out.map(toProductWithDetails);
      }
      out.push(...data);
      current = next;
      next = null;
    }
  } finally {
    // No floating promises: on any exit (empty batch, non-ok, timeout,
    // abort) the still-pending speculative fetch is aborted and its
    // rejection swallowed.
    if (next) discard(next);
  }
}
