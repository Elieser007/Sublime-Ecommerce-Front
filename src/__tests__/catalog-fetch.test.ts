/**
 * Catalog Pages SSG Tests — TDD
 *
 * Tests for frontmatter fetch logic in index.astro and home.astro: both
 * consume the shared batched catalog payload (src/lib/catalog-build.ts —
 * one catalog fetch reused across pages via memoization) plus build-time
 * fetches guarded by AbortController timeouts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  getCatalogBuildData,
  resetCatalogCache,
  fetchWithTimeout,
} from "../lib/catalog-build";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const API_URL = "http://localhost:8787";

const okJson = (body: unknown) => ({ ok: true, json: async () => body });
const catalogPage = (data: unknown[]) => ({ data });

function catProduct(id: string, overrides: Record<string, unknown> = {}) {
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

// ─── Extracted frontmatter logic (mirrors index.astro) ─────────────
// The auxiliary sections (category tree, top/bottom promotions) are fired in
// parallel with the catalog and EACH is consumed through its own try/catch —
// a rejection (timeout/abort/network error) degrades ONLY that section, never
// the product grid. The catalog batch itself is FAIL-LOUD: awaited without a
// swallowing guard, so an unreachable backend fails the build (same contract
// as [slug].astro getStaticPaths — never silently ship an empty catalog).
// The batch pipeline issues offset 0 + a speculative offset 100 synchronously,
// then a discarded offset 200 for a short batch — mock sequences must cover
// that with a persistent empty-batch tail.
async function fetchCatalogData(apiUrl: string = API_URL) {
  resetCatalogCache();
  let products: any[] = [];
  let tree: any[] = [];
  let topPromotions: any[] = [];
  let bottomPromotions: any[] = [];

  const treeReq = fetchWithTimeout(`${apiUrl}/api/public/categories/tree`, 10_000);
  const topPromoReq = fetchWithTimeout(`${apiUrl}/api/public/promotions?section=always-catalog-top`, 10_000);
  const bottomPromoReq = fetchWithTimeout(`${apiUrl}/api/public/promotions?section=always-catalog-bottom`, 10_000);

  const buildData = await getCatalogBuildData(apiUrl);
  products = buildData.products;

  try {
    const treeRes = await treeReq;
    if (treeRes.ok) {
      const data = await treeRes.json();
      tree = data.tree || [];
    }
  } catch (err) {
    console.error('Error fetching category tree at build time:', err);
  }
  try {
    const topPromoRes = await topPromoReq;
    if (topPromoRes.ok) {
      const data = await topPromoRes.json();
      topPromotions = data.promotions || [];
    }
  } catch (err) {
    console.error('Error fetching top promotions at build time:', err);
  }
  try {
    const bottomPromoRes = await bottomPromoReq;
    if (bottomPromoRes.ok) {
      const data = await bottomPromoRes.json();
      bottomPromotions = data.promotions || [];
    }
  } catch (err) {
    console.error('Error fetching bottom promotions at build time:', err);
  }
  return { products, tree, topPromotions, bottomPromotions };
}

// ─── Extracted frontmatter logic (mirrors home.astro) ──────────────
// Featured = first 8 of the catalog sorted by created_at DESC ONLY (no id
// tiebreak) — the exact ORDER BY semantics of the old
// /api/public/products/featured endpoint (created_at DESC LIMIT 8). The sort
// is stable, so products with identical created_at keep the catalog's
// deterministic order (created_at DESC, id); the old endpoint's tie order was
// unspecified, so any tie order is a faithful reproduction. No separate
// featured fetch — the payload is shared with the other pages via the memo.
async function fetchFeaturedData(apiUrl: string = API_URL) {
  resetCatalogCache();
  let featured: any[] = [];
  try {
    const buildData = await getCatalogBuildData(apiUrl);
    featured = [...buildData.products]
      .sort((a, b) => b.created_at - a.created_at)
      .slice(0, 8);
  } catch (err) {
    console.error('Error fetching featured products at build time:', err);
  }
  return featured;
}

// ════════════════════════════════════════════════════════════════════
//  Catalog Data Fetching
// ════════════════════════════════════════════════════════════════════
describe("Catalog frontmatter fetch", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    resetCatalogCache();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    resetCatalogCache();
  });

  describe("fetchCatalogData (index.astro)", () => {
    it("returns products from batches, plus tree and both promotions", async () => {
      mockFetch
        .mockResolvedValueOnce(okJson({ tree: [{ name: "Section 1", slug: "s1" }] }))
        .mockResolvedValueOnce(okJson({ promotions: [{ id: "top1" }], section: { id: "top" } }))
        .mockResolvedValueOnce(okJson({ promotions: [{ id: "bot1" }], section: { id: "bot" } }))
        .mockResolvedValueOnce(okJson(catalogPage([catProduct("p1"), catProduct("p2")])))
        .mockResolvedValue(okJson(catalogPage([])));

      const data = await fetchCatalogData();
      expect(data.products).toHaveLength(2);
      expect(data.products[0].slug).toBe("slug-p1");
      expect(data.tree).toHaveLength(1);
      expect(data.topPromotions).toHaveLength(1);
      expect(data.bottomPromotions).toHaveLength(1);
    });

    it("keeps products when the tree fetch fails (per-response ok check)", async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
        .mockResolvedValueOnce(okJson({ promotions: [], section: null }))
        .mockResolvedValueOnce(okJson({ promotions: [], section: null }))
        .mockResolvedValueOnce(okJson(catalogPage([catProduct("p1")])))
        .mockResolvedValue(okJson(catalogPage([])));

      const data = await fetchCatalogData();
      expect(data.products).toHaveLength(1);
      expect(data.tree).toEqual([]);
    });

    it("keeps products and degrades ONLY the tree when its fetch REJECTS (abort/timeout)", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockFetch
        .mockRejectedValueOnce(new DOMException("Aborted", "AbortError"))
        .mockResolvedValueOnce(okJson({ promotions: [{ id: "top1" }], section: { id: "top" } }))
        .mockResolvedValueOnce(okJson({ promotions: [{ id: "bot1" }], section: { id: "bot" } }))
        .mockResolvedValueOnce(okJson(catalogPage([catProduct("p1")])))
        .mockResolvedValue(okJson(catalogPage([])));

      const data = await fetchCatalogData();
      expect(data.products).toHaveLength(1);
      expect(data.tree).toEqual([]);
      expect(data.topPromotions).toHaveLength(1);
      expect(data.bottomPromotions).toHaveLength(1);
      errorSpy.mockRestore();
    });

    it("keeps products/tree and degrades ONLY the top promotions when its fetch REJECTS", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockFetch
        .mockResolvedValueOnce(okJson({ tree: [{ name: "Section 1", slug: "s1" }] }))
        .mockRejectedValueOnce(new DOMException("Aborted", "AbortError"))
        .mockResolvedValueOnce(okJson({ promotions: [{ id: "bot1" }], section: { id: "bot" } }))
        .mockResolvedValueOnce(okJson(catalogPage([catProduct("p1")])))
        .mockResolvedValue(okJson(catalogPage([])));

      const data = await fetchCatalogData();
      expect(data.products).toHaveLength(1);
      expect(data.tree).toHaveLength(1);
      expect(data.topPromotions).toEqual([]);
      expect(data.bottomPromotions).toHaveLength(1);
      errorSpy.mockRestore();
    });

    it("fails loudly when the catalog is unreachable (fail-loud — never empty)", async () => {
      mockFetch
        .mockResolvedValueOnce(okJson({ tree: [] }))
        .mockResolvedValueOnce(okJson({ promotions: [], section: null }))
        .mockResolvedValueOnce(okJson({ promotions: [], section: null }))
        .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });

      await expect(fetchCatalogData()).rejects.toThrow(
        "Failed to fetch catalog batch at offset 0: 500"
      );
    });

    it("passes an AbortController signal to every build fetch (10s timeout guard)", async () => {
      mockFetch
        .mockResolvedValueOnce(okJson({ tree: [] }))
        .mockResolvedValueOnce(okJson({ promotions: [], section: null }))
        .mockResolvedValueOnce(okJson({ promotions: [], section: null }))
        .mockResolvedValueOnce(okJson(catalogPage([])))
        .mockResolvedValue(okJson(catalogPage([])));
      await fetchCatalogData();
      // Every build fetch (tree, both promotions, and each catalog batch)
      // must carry an AbortSignal so a hung backend can't stall the build.
      const initSignals = mockFetch.mock.calls
        .filter(([, init]) => init && init.signal)
        .map(([, init]) => init.signal);
      expect(initSignals.length).toBeGreaterThan(0);
      expect(initSignals.every((s) => s instanceof AbortSignal)).toBe(true);
    });

    it("real index.astro frontmatter isolates each auxiliary fetch (source pin)", () => {
      const indexSource = readFileSync(
        resolve(__dirname, "../pages/index.astro"),
        "utf-8"
      );
      // The catalog must NOT be awaited inside a shared Promise.all with the
      // auxiliary sections — a rejecting tree/promotions fetch would wipe the
      // whole page payload (products too). The catalog await stays outside
      // every per-section guard so an unreachable backend fails the build.
      expect(indexSource).not.toContain("[buildData, treeRes, topPromoRes, bottomPromoRes]");
      expect(indexSource).not.toContain("await Promise.all([");
      expect(indexSource).toContain("await getCatalogBuildData(API_URL)");
      // Each auxiliary fetch carries a defensive no-op rejection handler at
      // creation time: the fail-loud catalog await runs BEFORE the per-section
      // try/catch attaches handlers, so a concurrent rejection (full backend
      // outage) must never be an unhandled rejection masking the catalog error.
      expect(indexSource).toContain("treeReq.catch(() => {});");
      expect(indexSource).toContain("topPromoReq.catch(() => {});");
      expect(indexSource).toContain("bottomPromoReq.catch(() => {});");
    });
  });

  describe("fetchFeaturedData (home.astro)", () => {
    it("derives featured as the first 8 of the batched catalog", async () => {
      const many = Array.from({ length: 10 }, (_, i) => catProduct(`p${i + 1}`));
      mockFetch
        .mockResolvedValueOnce(okJson(catalogPage(many)))
        .mockResolvedValue(okJson(catalogPage([])));

      const featured = await fetchFeaturedData();
      expect(featured).toHaveLength(8);
      expect(featured[0].id).toBe("p1");
      expect(featured[7].id).toBe("p8");
    });

    it("sorts by created_at DESC only — ties keep the catalog order, no id tiebreak", async () => {
      // The batch delivers z BEFORE a (both created_at 1000); the old
      // featured endpoint (ORDER BY created_at DESC LIMIT 8) had NO id
      // tiebreak, so a stable created_at-only sort must keep the batch order
      // for ties — NOT re-sort them by id (a before z).
      const many = [
        catProduct("z", { created_at: 1000 }),
        catProduct("a", { created_at: 1000 }),
        catProduct("m", { created_at: 2000 }),
      ];
      mockFetch
        .mockResolvedValueOnce(okJson(catalogPage(many)))
        .mockResolvedValue(okJson(catalogPage([])));

      const featured = await fetchFeaturedData();
      expect(featured.map((p) => p.id)).toEqual(["m", "z", "a"]);
    });

    it("returns fewer than 8 when the catalog is small", async () => {
      mockFetch
        .mockResolvedValueOnce(okJson(catalogPage([catProduct("p1"), catProduct("p2")])))
        .mockResolvedValue(okJson(catalogPage([])));

      const featured = await fetchFeaturedData();
      expect(featured).toHaveLength(2);
    });

    it("degrades to empty when the catalog is unreachable", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });

      const featured = await fetchFeaturedData();
      expect(featured).toEqual([]);
      errorSpy.mockRestore();
    });

    it("real home.astro sorts featured by created_at DESC only (source pin)", () => {
      const homeSource = readFileSync(resolve(__dirname, "../pages/home.astro"), "utf-8");
      expect(homeSource).toContain(".sort((a, b) => b.created_at - a.created_at)");
      expect(homeSource).toContain(".slice(0, 8)");
      // The comment must NOT claim the batch slice equals the old endpoint —
      // it only mirrors its ORDER BY (created_at DESC, no id tiebreak).
      expect(homeSource).not.toContain("exactly what");
    });
  });
});
