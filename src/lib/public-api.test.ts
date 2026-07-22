/**
 * Public API Client Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Import after setting up mock
import {
  fetchProducts,
  fetchFeaturedProducts,
  fetchProductById,
  fetchSections,
  fetchCategoryTree,
  formatPrice,
  getProductImageUrl,
} from "./public-api";

describe("fetchProducts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls /api/public/products without params", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], total: 0, page: 1, pages: 1, limit: 24 }),
    });

    const result = await fetchProducts();
    expect(result.total).toBe(0);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/public/products"),
      expect.objectContaining({ credentials: "include" })
    );
  });

  it("appends query params when provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], total: 0, page: 1, pages: 1, limit: 24 }),
    });

    const params = new URLSearchParams({ section_id: "abc", limit: "10" });
    await fetchProducts(params);

    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain("section_id=abc");
    expect(url).toContain("limit=10");
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    await expect(fetchProducts()).rejects.toThrow("API error");
  });
});

describe("fetchFeaturedProducts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls /api/public/products/featured", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ products: [{ id: "1", name: "Test" }] }),
    });

    const result = await fetchFeaturedProducts();
    expect(result).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/public/products/featured"),
      expect.any(Object)
    );
  });

  it("returns empty array when no products", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ products: undefined }),
    });

    const result = await fetchFeaturedProducts();
    expect(result).toEqual([]);
  });
});

describe("fetchProductById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls /api/public/products/:id", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        product: { id: "abc123", name: "Test Product", images: [], variants: [] },
      }),
    });

    const result = await fetchProductById("abc123");
    expect(result.id).toBe("abc123");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/public/products/abc123"),
      expect.any(Object)
    );
  });

  it("throws 404 error for not found", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    await expect(fetchProductById("nonexistent")).rejects.toThrow("Not found");
  });

  it("encodes the ID in the URL", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ product: { id: "special id", images: [], variants: [] } }),
    });

    await fetchProductById("special id");
    expect(mockFetch.mock.calls[0][0]).toContain(encodeURIComponent("special id"));
  });
});

describe("fetchSections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls /api/public/sections", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sections: [{ id: "1", name: "Ropa" }] }),
    });

    const result = await fetchSections();
    expect(result).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/public/sections"),
      expect.any(Object)
    );
  });

  it("returns empty array on undefined", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const result = await fetchSections();
    expect(result).toEqual([]);
  });
});

describe("fetchCategoryTree", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls /api/public/categories/tree", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tree: [{ id: "1", name: "Ropa", categories: [] }] }),
    });

    const result = await fetchCategoryTree();
    expect(result).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/public/categories/tree"),
      expect.any(Object)
    );
  });
});

describe("formatPrice", () => {
  it("formats price in Guaraníes", () => {
    expect(formatPrice(120000)).toBe("120.000");
    expect(formatPrice(0)).toBe("0");
    expect(formatPrice(1000)).toBe("1.000");
  });
});

describe("getProductImageUrl", () => {
  it("returns placeholder when no image", () => {
    expect(getProductImageUrl(null)).toBe("/placeholder-product.svg");
    expect(getProductImageUrl(undefined)).toBe("/placeholder-product.svg");
  });

  it("returns the image URL when provided", () => {
    expect(getProductImageUrl("https://images.example.com/test.webp")).toBe(
      "https://images.example.com/test.webp"
    );
  });
});
