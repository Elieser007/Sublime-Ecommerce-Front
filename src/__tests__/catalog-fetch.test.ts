/**
 * Catalog Pages SSG Tests — TDD
 *
 * Tests for frontmatter fetch logic in index.astro and home.astro.
 * Verifies build-time data fetching from public API.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const API_URL = "http://localhost:8787";

// ─── Extracted frontmatter logic ──────────────────────────────────
async function fetchCatalogData() {
  const [productsRes, treeRes] = await Promise.all([
    fetch(`${API_URL}/api/public/products?limit=1000`),
    fetch(`${API_URL}/api/public/categories/tree`),
  ]);

  if (!productsRes.ok) throw new Error(`Products fetch failed: ${productsRes.status}`);
  if (!treeRes.ok) throw new Error(`Categories fetch failed: ${treeRes.status}`);

  const productsData = await productsRes.json();
  const treeData = await treeRes.json();

  return {
    products: productsData.data || [],
    tree: treeData.tree || [],
  };
}

async function fetchFeaturedData() {
  const res = await fetch(`${API_URL}/api/public/products/featured`);
  if (!res.ok) throw new Error(`Featured fetch failed: ${res.status}`);
  const data = await res.json();
  return data.products || [];
}

// ════════════════════════════════════════════════════════════════════
//  Catalog Data Fetching
// ════════════════════════════════════════════════════════════════════
describe("Catalog frontmatter fetch", () => {
  beforeEach(() => mockFetch.mockReset());
  afterEach(() => vi.restoreAllMocks());

  describe("fetchCatalogData (index.astro)", () => {
    it("returns products and category tree", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [{ slug: "p1", name: "Product 1" }] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tree: [{ name: "Section 1", slug: "s1" }] }),
        });

      const data = await fetchCatalogData();
      expect(data.products).toHaveLength(1);
      expect(data.tree).toHaveLength(1);
      expect(data.products[0].slug).toBe("p1");
    });

    it("throws when products fetch fails", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      await expect(fetchCatalogData()).rejects.toThrow("Products fetch failed");
    });

    it("throws when categories fetch fails", async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
        .mockResolvedValueOnce({ ok: false, status: 500 });
      await expect(fetchCatalogData()).rejects.toThrow("Categories fetch failed");
    });

    it("returns empty arrays when API returns empty data", async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      const data = await fetchCatalogData();
      expect(data.products).toEqual([]);
      expect(data.tree).toEqual([]);
    });
  });

  describe("fetchFeaturedData (home.astro)", () => {
    it("returns featured products", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: [{ slug: "feat-1", name: "Featured" }] }),
      });

      const products = await fetchFeaturedData();
      expect(products).toHaveLength(1);
      expect(products[0].slug).toBe("feat-1");
    });

    it("throws when fetch fails", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      await expect(fetchFeaturedData()).rejects.toThrow("Featured fetch failed");
    });

    it("returns empty array when no featured products", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: [] }),
      });

      const products = await fetchFeaturedData();
      expect(products).toEqual([]);
    });
  });
});
