/**
 * Admin Products N+1 Removal Tests
 *
 * Verifies that loadProductList does NOT make per-product attribute API calls.
 * The attribute_count is now included in the product list response (backend Phase 2).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadProductList } from "../lib/admin-products";

const API_URL = "http://localhost:8787";

// ─── Mock Data ──────────────────────────────────────────────

const mockProducts = [
  { id: "p1", name: "Product 1", attribute_count: 3 },
  { id: "p2", name: "Product 2", attribute_count: 0 },
  { id: "p3", name: "Product 3", attribute_count: 5 },
];

// ─── Setup ──────────────────────────────────────────────────

beforeEach(() => {
  vi.restoreAllMocks();
});

// ─── loadProductList ────────────────────────────────────────

describe("loadProductList", () => {
  it("returns products from the list endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockProducts, total: 3, pages: 1 }),
      })
    );

    const result = await loadProductList(API_URL, {});

    expect(result.items).toEqual(mockProducts);
    expect(result.total).toBe(3);
    expect(result.totalPages).toBe(1);
  });

  it("makes exactly one fetch call (no N+1 attribute requests)", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockProducts, total: 3, pages: 1 }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    await loadProductList(API_URL, {});

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/api/products?"),
      expect.objectContaining({ credentials: "include" })
    );
  });

  it("does NOT call /api/admin/products/*/attributes endpoint", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockProducts, total: 3, pages: 1 }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    await loadProductList(API_URL, {});

    const attributeCalls = fetchSpy.mock.calls.filter((call: any) =>
      call[0].includes("/attributes")
    );
    expect(attributeCalls).toHaveLength(0);
  });

  it("passes query parameters correctly", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], total: 0, pages: 0 }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    await loadProductList(API_URL, {
      page: 2,
      limit: 10,
      search: "test",
      sectionId: "s1",
      categoryId: "c1",
      subcategoryId: "sub1",
    });

    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain("page=2");
    expect(url).toContain("limit=10");
    expect(url).toContain("search=test");
    expect(url).toContain("section_id=s1");
    expect(url).toContain("category_id=c1");
    expect(url).toContain("subcategory_id=sub1");
  });

  it("returns empty result on fetch error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network error"))
    );

    const result = await loadProductList(API_URL, {});

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(1);
  });

  it("returns empty result on 401 (redirect scenario)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401 })
    );

    const result = await loadProductList(API_URL, {});

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("uses credentials: include for auth", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], total: 0, pages: 0 }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    await loadProductList(API_URL, {});

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ credentials: "include" })
    );
  });
});
