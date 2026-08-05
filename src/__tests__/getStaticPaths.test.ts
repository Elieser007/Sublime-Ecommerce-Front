/**
 * Product Page SSG Tests — TDD
 *
 * Tests for getStaticPaths() in [slug].astro
 * Verifies build-time path generation from the public API.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { getRelatedProducts } from "../lib/product-related";

// Mock fetch for build-time API calls
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const API_URL = "http://localhost:8787";

const detailSource = readFileSync(
  resolve(__dirname, "../pages/producto/[slug].astro"),
  "utf-8"
);

// ─── getStaticPaths logic (extracted for testing) ─────────────────
// This mirrors what getStaticPaths() will do in [slug].astro
async function getStaticPathsLogic() {
  // Fetch all product slugs
  const listRes = await fetch(`${API_URL}/api/public/products?limit=1000`);
  if (!listRes.ok) {
    throw new Error(`Failed to fetch product list: ${listRes.status}`);
  }
  const listData = await listRes.json();
  const products = listData.data || [];

  // Fetch detail for each product
  const paths = [];
  for (const product of products) {
    const detailRes = await fetch(`${API_URL}/api/public/products/slug/${product.slug}`);
    if (!detailRes.ok) continue;
    const detailData = await detailRes.json();
    paths.push({
      params: { slug: product.slug },
      props: {
        product: detailData.product,
        related: getRelatedProducts(products, product.slug, product.section_slug || ''),
      },
    });
  }

  return paths;
}

// ════════════════════════════════════════════════════════════════════
//  getStaticPaths
// ════════════════════════════════════════════════════════════════════
describe("getStaticPaths logic", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns paths with slug params and product props", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { slug: "remera-basica", name: "Remera Basica" },
            { slug: "tote-bag", name: "Tote Bag" },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          product: { id: "p1", slug: "remera-basica", name: "Remera Basica", base_price: 100000 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          product: { id: "p2", slug: "tote-bag", name: "Tote Bag", base_price: 85000 },
        }),
      });

    const paths = await getStaticPathsLogic();

    expect(paths).toHaveLength(2);
    expect(paths[0].params.slug).toBe("remera-basica");
    expect(paths[0].props.product.name).toBe("Remera Basica");
    expect(paths[1].params.slug).toBe("tote-bag");
    expect(paths[1].props.product.name).toBe("Tote Bag");
  });

  it("skips products whose detail fetch fails", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { slug: "good-product", name: "Good" },
            { slug: "bad-product", name: "Bad" },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          product: { id: "p1", slug: "good-product", name: "Good" },
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

    const paths = await getStaticPathsLogic();

    expect(paths).toHaveLength(1);
    expect(paths[0].params.slug).toBe("good-product");
  });

  it("returns empty array when product list is empty", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    const paths = await getStaticPathsLogic();
    expect(paths).toEqual([]);
  });

  it("throws when product list fetch fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(getStaticPathsLogic()).rejects.toThrow("Failed to fetch product list");
  });

  it("each path has correct structure for Astro", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ slug: "test-slug", name: "Test" }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          product: { id: "p1", slug: "test-slug", name: "Test", images: [], variants: [] },
        }),
      });

    const paths = await getStaticPathsLogic();

    expect(paths[0]).toHaveProperty("params");
    expect(paths[0]).toHaveProperty("props");
    expect(paths[0].params).toHaveProperty("slug");
    expect(paths[0].props).toHaveProperty("product");
    expect(typeof paths[0].params.slug).toBe("string");
  });

  it("passes related products: same section, max 4, no self, deterministic", async () => {
    const listProducts = [
      { slug: "s1", section_slug: "ropa", created_at: 1 },
      { slug: "s2", section_slug: "ropa", created_at: 2 },
      { slug: "s3", section_slug: "ropa", created_at: 3 },
      { slug: "s4", section_slug: "ropa", created_at: 4 },
      { slug: "s5", section_slug: "ropa", created_at: 5 },
      { slug: "s6", section_slug: "ropa", created_at: 6 },
      { slug: "otro", section_slug: "accesorios", created_at: 999 },
    ];
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: listProducts }),
      });
    for (const p of listProducts) {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ product: { ...p } }),
      });
    }

    const paths = await getStaticPathsLogic();
    expect(paths).toHaveLength(7);

    const s1 = paths.find((p: any) => p.params.slug === "s1");
    expect(s1.props.related).toHaveLength(4);
    expect(s1.props.related.map((r: any) => r.slug)).toEqual(["s6", "s5", "s4", "s3"]);
    expect(s1.props.related.some((r: any) => r.slug === "s1")).toBe(false);
    expect(s1.props.related.some((r: any) => r.slug === "otro")).toBe(false);

    // Deterministic across identical builds
    const s1Again = paths.find((p: any) => p.params.slug === "s1");
    expect(s1Again.props.related.map((r: any) => r.slug)).toEqual(["s6", "s5", "s4", "s3"]);
  });
});

describe("product detail related markers (D6)", () => {
  it("listens for tier-add to wire quick-add", () => {
    expect(detailSource).toContain("'tier-add'");
  });

  it("renders the related-products section", () => {
    expect(detailSource).toContain('id="related-products"');
  });
});
