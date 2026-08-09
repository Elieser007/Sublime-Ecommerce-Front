/**
 * catalog-batch — SSG batch fetch pipeline.
 *
 * fetchCatalogBatches replaces the per-product N+1 build fetches with
 * paginated batches of GET /api/public/catalog. Pipelined prefetch:
 * batch N+1 is requested before batch N is processed. Per-batch
 * AbortController timeout; non-ok/timeout rejects (fail-loud — matching
 * the getStaticPaths contract); an empty batch ends the loop and its
 * speculative successor is discarded (abort swallowed, never left
 * floating).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchCatalogBatches,
  resolveProductGraph,
  type ProductWithDetails,
} from "./catalog-batch";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const API_URL = "http://localhost:8787";

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (v: T) => void;
  reject: (e: unknown) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// A mock fetch that records every requested offset and rejects when its
// AbortSignal fires (real fetch behavior) — so timeouts and discards
// surface as AbortError rejections instead of hanging. Tolerates no-arg
// invocations: vitest invokes the mock once with no arguments (and awaits
// the result) during hook cleanup, so that call must settle instantly.
function installDeferredFetch(): Map<string, Deferred<unknown>> {
  const deferreds = new Map<string, Deferred<unknown>>();
  mockFetch.mockImplementation((url?: unknown, init?: RequestInit) => {
    if (typeof url !== "string" || !url) {
      // Vitest hook-cleanup probe — settle immediately, never defer.
      return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
    }
    const d = createDeferred<unknown>();
    const offset = new URL(url).searchParams.get("offset") || "";
    deferreds.set(offset, d);
    if (init?.signal) {
      const onAbort = () => d.reject(new DOMException("Aborted", "AbortError"));
      if (init.signal.aborted) onAbort();
      else init.signal.addEventListener("abort", onAbort);
    }
    return d.promise;
  });
  return deferreds;
}

const flush = () => new Promise((r) => setTimeout(r, 0));

// Response-shaped object — the pipeline checks res.ok before res.json().
const okResponse = (body: unknown) => ({ ok: true, json: async () => body });

function product(id: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id,
    name: `Product ${id}`,
    slug: `slug-${id}`,
    description: null,
    base_price: 10000,
    created_at: 1000,
    section_name: null,
    section_slug: null,
    category_name: null,
    category_slug: null,
    subcategory_name: null,
    subcategory_slug: null,
    image_url: null,
    images: [],
    variants: [],
    price_tiers: [],
    available_modules: [],
    dependencies: [],
    has_attribute_modules: 0,
    ...overrides,
  };
}

function catalogPage(products: unknown[]) {
  return { data: products };
}

// ════════════════════════════════════════════════════════════════════
//  fetchCatalogBatches — pipeline
// ════════════════════════════════════════════════════════════════════
describe("fetchCatalogBatches", () => {
  beforeEach(() => mockFetch.mockReset());
  afterEach(() => vi.restoreAllMocks());

  it("prefetches batch N+1 before batch N is processed", async () => {
    const deferreds = installDeferredFetch();
    const promise = fetchCatalogBatches(API_URL, { batchSize: 2, timeoutMs: 1000 });

    // Offsets 0 and 2 are requested synchronously, before batch 0 resolves.
    expect([...deferreds.keys()].sort()).toEqual(["0", "2"]);

    // Resolve batch 0 — the pipeline must request batch 4 (offset 4) BEFORE
    // it awaits batch 2's resolution.
    (deferreds.get("0") as Deferred<unknown>).resolve(okResponse(catalogPage([product("p1"), product("p2")])));
    await flush();

    expect([...deferreds.keys()].sort()).toEqual(["0", "2", "4"]);

    (deferreds.get("2") as Deferred<unknown>).resolve(okResponse(catalogPage([product("p3"), product("p4")])));
    await flush();
    (deferreds.get("4") as Deferred<unknown>).resolve(okResponse(catalogPage([product("p5")])));
    await flush();

    // Batch 4 was short (1 < 2) but non-empty — the pipeline requests batch 6
    // and ends the loop when it comes back empty.
    (deferreds.get("6") as Deferred<unknown>).resolve(okResponse(catalogPage([])));
    await flush();

    const result = await promise;
    expect(result).toHaveLength(5);
    expect(result.map((p) => p.id)).toEqual(["p1", "p2", "p3", "p4", "p5"]);
  });

  it("rejects loudly on a non-ok batch (fail-loud)", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });

    await expect(fetchCatalogBatches(API_URL, { batchSize: 100, timeoutMs: 1000 })).rejects.toThrow(
      "Failed to fetch catalog batch at offset 0: 500"
    );
  });

  it("rejects loudly when a batch exceeds the timeout (abort)", async () => {
    installDeferredFetch(); // never resolved — the 20ms timer must abort it

    await expect(
      fetchCatalogBatches(API_URL, { batchSize: 100, timeoutMs: 20 })
    ).rejects.toThrow("Aborted");
  });

  it("rejects on a 200 whose body lacks a non-array `data` (corrupt envelope, fail-loud)", async () => {
    // A corrupted 200 ({ error } / missing data) must NOT be read as an empty
    // page — that would silently ship an empty catalog. Same fail-loud
    // contract as non-ok batches.
    mockFetch
      .mockResolvedValueOnce(okResponse({ error: "Something went wrong" }))
      .mockResolvedValue(okResponse(catalogPage([]))); // speculative successor — discarded

    await expect(
      fetchCatalogBatches(API_URL, { batchSize: 100, timeoutMs: 1000 })
    ).rejects.toThrow("Corrupt catalog batch at offset 0");
  });

  it("stops the loop at an empty batch and discards the speculative successor", async () => {
    const deferreds = installDeferredFetch();
    const promise = fetchCatalogBatches(API_URL, { batchSize: 2, timeoutMs: 1000 });

    (deferreds.get("0") as Deferred<unknown>).resolve(okResponse(catalogPage([product("p1"), product("p2")])));
    await flush();
    (deferreds.get("2") as Deferred<unknown>).resolve(okResponse(catalogPage([])));
    await flush();

    const result = await promise;
    expect(result).toHaveLength(2);
    // The loop ended after the empty batch — no batch beyond the discarded
    // speculative one was requested.
    expect([...deferreds.keys()].sort()).toEqual(["0", "2", "4"]);
  });

  it("concatenates every batch into one flat ProductWithDetails list", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => catalogPage(Array.from({ length: 100 }, (_, i) => product(`p${i + 1}`))),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => catalogPage(Array.from({ length: 50 }, (_, i) => product(`p${i + 101}`))),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => catalogPage([]) });

    const result = await fetchCatalogBatches(API_URL, { batchSize: 100, timeoutMs: 1000 });

    expect(result).toHaveLength(150);
    expect(result[0].id).toBe("p1");
    expect(result[149].id).toBe("p150");
    expect(result.every((p) => p.hasAttributeModules === false)).toBe(true);
  });

  it("tolerates JSON-string images/variants/price_tiers (same parseArray tolerance as modules/dependencies)", async () => {
    mockFetch
      .mockResolvedValueOnce(
        okResponse(
          catalogPage([
            product("p1", {
              images: JSON.stringify([
                { id: "i1", url: "a.webp", alt: null, sort_order: 0, is_primary: 1 },
              ]),
              variants: JSON.stringify([
                { id: "v1", name: "Única", sku: "SKU-1", price: 1000, stock: 3 },
              ]),
              price_tiers: JSON.stringify([
                { id: "t1", min_quantity: 1, price: 1000 },
              ]),
            }),
          ])
        )
      )
      .mockResolvedValue(okResponse(catalogPage([])));

    const result = await fetchCatalogBatches(API_URL, { batchSize: 100, timeoutMs: 1000 });

    expect(result[0].images).toEqual([
      { id: "i1", url: "a.webp", alt: null, sort_order: 0, is_primary: 1 },
    ]);
    expect(result[0].variants).toEqual([
      { id: "v1", name: "Única", sku: "SKU-1", price: 1000, stock: 3 },
    ]);
    expect(result[0].price_tiers).toEqual([{ id: "t1", min_quantity: 1, price: 1000 }]);
  });

  it("degrades corrupt images/variants/price_tiers (non-array, unparseable string) to []", async () => {
    mockFetch
      .mockResolvedValueOnce(
        okResponse(
          catalogPage([
            product("p1", {
              images: "not-json{",
              variants: { not: "an array" },
              price_tiers: 42,
            }),
          ])
        )
      )
      .mockResolvedValue(okResponse(catalogPage([])));

    const result = await fetchCatalogBatches(API_URL, { batchSize: 100, timeoutMs: 1000 });

    expect(result[0].images).toEqual([]);
    expect(result[0].variants).toEqual([]);
    expect(result[0].price_tiers).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════════
//  resolveProductGraph — corrupt detection + bakeFailed rule
// ════════════════════════════════════════════════════════════════════
describe("resolveProductGraph", () => {
  it("maps a valid payload (no bake failure)", () => {
    const graph = resolveProductGraph({
      base_price: 100000,
      has_attribute_modules: 1,
      available_modules: [{ module_id: "m1", values: [] }],
      dependencies: [],
    });
    expect(graph.bakeFailed).toBe(false);
    expect(graph.modules).toHaveLength(1);
    expect(graph.basePrice).toBe(100000);
  });

  it("flags bakeFailed when the payload says modules exist but none baked", () => {
    const graph = resolveProductGraph({
      base_price: 100000,
      has_attribute_modules: 1,
      available_modules: [],
      dependencies: [],
    });
    expect(graph.bakeFailed).toBe(true);
    expect(graph.modules).toEqual([]);
  });

  it("is NOT bakeFailed for SKUs-but-no-modules (flag 0, empty modules)", () => {
    const graph = resolveProductGraph({
      base_price: 100000,
      has_attribute_modules: 0,
      available_modules: [],
      dependencies: [],
    });
    expect(graph.bakeFailed).toBe(false);
    expect(graph.modules).toEqual([]);
  });

  it("treats a missing available_modules key as corrupt", () => {
    const graph = resolveProductGraph({ base_price: 100000, has_attribute_modules: 0 });
    expect(graph.bakeFailed).toBe(true);
    expect(graph.modules).toEqual([]);
  });

  it("treats an unparseable string available_modules as corrupt", () => {
    const graph = resolveProductGraph({
      base_price: 100000,
      available_modules: "not-json{",
      dependencies: [],
    });
    expect(graph.bakeFailed).toBe(true);
    expect(graph.modules).toEqual([]);
  });

  it("treats a non-array available_modules as corrupt", () => {
    const graph = resolveProductGraph({
      base_price: 100000,
      available_modules: { module_id: "m1" },
      dependencies: [],
    });
    expect(graph.bakeFailed).toBe(true);
  });

  it("treats a missing/non-numeric base_price as corrupt and falls back to 0", () => {
    const graph = resolveProductGraph({
      has_attribute_modules: 0,
      available_modules: [],
      dependencies: [],
    });
    expect(graph.bakeFailed).toBe(true);
    expect(graph.basePrice).toBe(0);
  });

  it("accepts a JSON-string available_modules payload", () => {
    const graph = resolveProductGraph({
      base_price: 100000,
      available_modules: JSON.stringify([{ module_id: "m1", values: [] }]),
      dependencies: JSON.stringify([]),
    });
    expect(graph.bakeFailed).toBe(false);
    expect(graph.modules).toHaveLength(1);
  });
});
