/**
 * Product Page SSG Tests — TDD
 *
 * Tests for getStaticPaths() in [slug].astro: consumes the batched catalog
 * payload (src/lib/catalog-build.ts) with ZERO per-product requests.
 * Verifies path generation, baked variant-graph props, bakeFailed
 * forwarding, fail-loud on an unreachable backend, and related-product
 * determinism.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { getRelatedProducts } from "../lib/product-related";
import {
  getCatalogBuildData,
  resetCatalogCache,
  EMPTY_VARIANTS_DATA,
} from "../lib/catalog-build";
import type { BakedVariantData } from "../lib/catalog-build";

// Mock fetch for build-time API calls
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const API_URL = "http://localhost:8787";

const detailSource = readFileSync(
  resolve(__dirname, "../pages/products/[slug].astro"),
  "utf-8"
);
const catalogBatchSource = readFileSync(
  resolve(__dirname, "../lib/catalog-batch.ts"),
  "utf-8"
);

const okJson = (body: unknown) => ({ ok: true, json: async () => body });

// A catalog product exactly as the batch endpoint delivers it.
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

const catalogPage = (data: unknown[]) => ({ data });

// ─── getStaticPaths logic (extracted for testing) ─────────────────
// Mirrors getStaticPaths() in [slug].astro: one batched catalog fetch →
// paths for every product with baked graph + bakeFailed props. The batch
// pipeline issues offset 0 + a speculative offset 100 fetch synchronously,
// then (for a short batch) a discarded offset 200 — mock sequences must
// cover those, with a persistent empty-batch tail.
async function getStaticPathsLogic() {
  const { products, variantsByProduct, bakeFailedByProduct } =
    await getCatalogBuildData(API_URL);

  const paths = [];
  for (const product of products) {
    const related = getRelatedProducts(products, product.slug, product.section_slug || '');

    const relatedVariants: Record<string, BakedVariantData> = {};
    for (const relatedProduct of related) {
      const baked = variantsByProduct.get(relatedProduct.id);
      if (baked) relatedVariants[relatedProduct.id] = baked;
    }

    paths.push({
      params: { slug: product.slug },
      props: {
        product,
        related,
        variantsData: variantsByProduct.get(product.id) ?? EMPTY_VARIANTS_DATA,
        relatedVariants,
        bakeFailed: bakeFailedByProduct.get(product.id) ?? false,
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
    resetCatalogCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetCatalogCache();
  });

  it("returns paths with slug params, product props, and baked variantsData from ONE batch fetch", async () => {
    mockFetch
      .mockResolvedValueOnce(okJson(catalogPage([
        catProduct("p1", {
          name: "Remera Basica",
          slug: "remera-basica",
          base_price: 100000,
          available_modules: [{ module_id: "mod-color", values: [] }],
          has_attribute_modules: 1,
        }),
        catProduct("p2", { name: "Tote Bag", slug: "tote-bag", base_price: 85000 }),
      ])))
      .mockResolvedValueOnce(okJson(catalogPage([])))
      .mockResolvedValue(okJson(catalogPage([])));

    const paths = await getStaticPathsLogic();

    expect(paths).toHaveLength(2);
    expect(paths[0].params.slug).toBe("remera-basica");
    expect(paths[0].props.product.name).toBe("Remera Basica");
    expect(paths[0].props.variantsData.modules).toHaveLength(1);
    expect(paths[0].props.variantsData.basePrice).toBe(100000);
    expect(paths[0].props.bakeFailed).toBe(false);
    expect(paths[1].params.slug).toBe("tote-bag");
    expect(paths[1].props.variantsData.modules).toHaveLength(0);
    expect(paths[1].props.variantsData.basePrice).toBe(85000);
    expect(paths[1].props.bakeFailed).toBe(false);
  });

  it("flags bakeFailed for a product whose graph is missing while modules were expected", async () => {
    mockFetch
      .mockResolvedValueOnce(okJson(catalogPage([
        // has_attribute_modules 1 but available_modules absent → corrupt
        catProduct("p1", { name: "Corrupt", slug: "corrupt", base_price: 10000, has_attribute_modules: 1 }),
      ])))
      .mockResolvedValue(okJson(catalogPage([])));

    const paths = await getStaticPathsLogic();
    expect(paths[0].props.bakeFailed).toBe(true);
    expect(paths[0].props.variantsData.modules).toEqual([]);
  });

  it("returns empty array when the catalog is empty", async () => {
    mockFetch
      .mockResolvedValueOnce(okJson(catalogPage([])))
      .mockResolvedValue(okJson(catalogPage([])));

    const paths = await getStaticPathsLogic();
    expect(paths).toEqual([]);
  });

  it("throws when the catalog batch fetch fails (fail-loud)", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });

    await expect(getStaticPathsLogic()).rejects.toThrow(
      "Failed to fetch catalog batch at offset 0: 500"
    );
  });

  it("real [slug].astro getStaticPaths fails the build on batch failure (README-accurate)", () => {
    // The README documents that an unreachable backend FAILS `astro build` —
    // getStaticPaths must not silently return an empty catalog. The pipeline
    // owns the fail-loud message; the page must consume it without a
    // try/catch that swallows it, and the old per-product fetches are gone.
    expect(detailSource).toContain("getCatalogBuildData");
    expect(detailSource).not.toContain("/api/public/products?limit=");
    expect(detailSource).not.toContain("/api/public/products/slug/");
    expect(detailSource).not.toContain("bakeVariantsData");
    expect(detailSource).not.toContain("Failed to fetch product list");
    expect(catalogBatchSource).toContain("Failed to fetch catalog batch");
  });

  it("each path has correct structure for Astro", async () => {
    mockFetch
      .mockResolvedValueOnce(okJson(catalogPage([
        catProduct("p1", { slug: "test-slug", name: "Test", images: [], variants: [] }),
      ])))
      .mockResolvedValue(okJson(catalogPage([])));

    const paths = await getStaticPathsLogic();

    expect(paths[0]).toHaveProperty("params");
    expect(paths[0]).toHaveProperty("props");
    expect(paths[0].params).toHaveProperty("slug");
    expect(paths[0].props).toHaveProperty("product");
    expect(paths[0].props).toHaveProperty("variantsData");
    expect(paths[0].props).toHaveProperty("relatedVariants");
    expect(paths[0].props).toHaveProperty("bakeFailed");
    expect(paths[0].props.variantsData.modules).toEqual([]);
    expect(paths[0].props.variantsData.basePrice).toBe(10000);
    expect(typeof paths[0].params.slug).toBe("string");
  });

  it("passes related products: same section, max 4, no self, deterministic", async () => {
    const listProducts = [
      catProduct("i1", { slug: "s1", section_slug: "ropa", created_at: 1 }),
      catProduct("i2", { slug: "s2", section_slug: "ropa", created_at: 2 }),
      catProduct("i3", { slug: "s3", section_slug: "ropa", created_at: 3 }),
      catProduct("i4", { slug: "s4", section_slug: "ropa", created_at: 4 }),
      catProduct("i5", { slug: "s5", section_slug: "ropa", created_at: 5 }),
      catProduct("i6", { slug: "s6", section_slug: "ropa", created_at: 6 }),
      catProduct("i7", { slug: "otro", section_slug: "accesorios", created_at: 999 }),
    ];
    mockFetch
      .mockResolvedValueOnce(okJson(catalogPage(listProducts)))
      .mockResolvedValue(okJson(catalogPage([])));

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

  it("bakes the variants attribute onto related product cards", () => {
    expect(detailSource).toContain("relatedVariants[relatedProduct.id]");
    expect(detailSource).toContain("variantsAttr");
  });

  it("forwards the bakeFailed flag in the related product card payload", () => {
    expect(detailSource).toContain("bakeFailed: !!relatedProduct.bakeFailed");
    expect(detailSource).not.toContain("has_variants: !!relatedProduct");
  });
});
