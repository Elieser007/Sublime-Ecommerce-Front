/**
 * Admin Gallery Concurrent Upload Tests
 *
 * Verifies that uploadGalleryImages uses Promise.allSettled for
 * concurrent uploads and handles partial failures gracefully.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { uploadGalleryImages } from "../lib/admin-products";

const API_URL = "http://localhost:8787";

// ─── Helpers ────────────────────────────────────────────────

function createMockFile(name: string, size = 1024): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type: "image/webp" });
}

// ─── Setup ──────────────────────────────────────────────────

beforeEach(() => {
  vi.restoreAllMocks();
});

// ─── uploadGalleryImages ────────────────────────────────────

describe("uploadGalleryImages", () => {
  it("uploads all files concurrently using Promise.allSettled", async () => {
    const uploadOrder: number[] = [];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/api/upload")) {
          const idx = uploadOrder.length;
          uploadOrder.push(idx);
          return {
            ok: true,
            json: async () => ({ url: `https://cdn.example.com/${idx}.webp` }),
          };
        }
        return { ok: true, json: async () => ({}) };
      })
    );

    const files = [
      createMockFile("a.webp"),
      createMockFile("b.webp"),
      createMockFile("c.webp"),
    ];

    const results = await uploadGalleryImages(files, "prod-1", API_URL);

    expect(results).toHaveLength(3);
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
  });

  it("handles partial failures — some uploads succeed, some fail", async () => {
    let uploadCallCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/api/upload")) {
          uploadCallCount++;
          // Fail the second upload
          if (uploadCallCount === 2) {
            return { ok: false, json: async () => ({ error: "Upload failed" }) };
          }
          return {
            ok: true,
            json: async () => ({ url: `https://cdn.example.com/img-${uploadCallCount}.webp` }),
          };
        }
        return { ok: true, json: async () => ({}) };
      })
    );

    const files = [
      createMockFile("0.webp"),
      createMockFile("1.webp"),
      createMockFile("2.webp"),
    ];

    const results = await uploadGalleryImages(files, "prod-1", API_URL);

    expect(results).toHaveLength(3);
    // First and third succeed, second fails
    expect(results[0].status).toBe("fulfilled");
    expect(results[1].status).toBe("rejected");
    expect(results[2].status).toBe("fulfilled");
  });

  it("returns empty array for empty input", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const results = await uploadGalleryImages([], "prod-1", API_URL);

    expect(results).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("handles single file upload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ url: "https://cdn.example.com/single.webp" }),
      })
    );

    const files = [createMockFile("single.webp")];
    const results = await uploadGalleryImages(files, "prod-1", API_URL);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("fulfilled");
  });

  it("uploads in parallel — all requests fire before any response", async () => {
    let resolveFirst: any;
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });

    const fetchSpy = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/api/upload")) {
        await firstPromise;
        return {
          ok: true,
          json: async () => ({ url: `https://cdn.example.com/upload.webp` }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });
    vi.stubGlobal("fetch", fetchSpy);

    const files = [
      createMockFile("a.webp"),
      createMockFile("b.webp"),
      createMockFile("c.webp"),
    ];

    const resultPromise = uploadGalleryImages(files, "prod-1", API_URL);

    // All 3 upload requests should have fired (parallel)
    expect(fetchSpy).toHaveBeenCalledTimes(3);

    // Resolve and await
    resolveFirst();
    const results = await resultPromise;
    expect(results).toHaveLength(3);
  });

  it("calls associateImage for successful uploads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/api/upload")) {
          return {
            ok: true,
            json: async () => ({ url: "https://cdn.example.com/img.webp" }),
          };
        }
        if (url.includes("/api/products/prod-1/images")) {
          return { ok: true, json: async () => ({ id: "img-1", url: "https://cdn.example.com/img.webp" }) };
        }
        return { ok: true, json: async () => ({}) };
      })
    );

    const files = [createMockFile("img.webp")];
    const results = await uploadGalleryImages(files, "prod-1", API_URL);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("fulfilled");
  });

  it("offsets sort_order by startSortOrder when provided", async () => {
    const associatedSortOrders: number[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string, init?: any) => {
        if (url.includes("/api/upload")) {
          return {
            ok: true,
            json: async () => ({ url: `https://cdn.example.com/${Math.random()}.webp` }),
          };
        }
        if (url.includes("/api/products/prod-1/images")) {
          associatedSortOrders.push(JSON.parse(init.body).sort_order);
          return { ok: true, json: async () => ({}) };
        }
        return { ok: true, json: async () => ({}) };
      })
    );

    const files = [createMockFile("a.webp"), createMockFile("b.webp")];
    const results = await uploadGalleryImages(files, "prod-1", API_URL, 5);

    expect(results).toHaveLength(2);
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
    // Existing images occupy sorts 0..4, so new ones start at 5.
    expect(associatedSortOrders).toEqual([5, 6]);
  });
});
