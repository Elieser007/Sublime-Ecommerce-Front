/**
 * Admin Gallery State Logic Tests
 *
 * Pure functions for managing images in the admin panel:
 * add, remove, set primary, reorder.
 */

import { describe, it, expect } from "vitest";
import {
  addImage,
  removeImage,
  setPrimary,
  reorderImages,
} from "../lib/admin-gallery";
import type { GalleryImage } from "../lib/image-types";

// ─── Test Data ──────────────────────────────────────────────

const img1: GalleryImage = { id: "img-1", url: "/a.webp", alt: "A", sort_order: 0, is_primary: true };
const img2: GalleryImage = { id: "img-2", url: "/b.webp", alt: "B", sort_order: 1, is_primary: false };
const img3: GalleryImage = { id: "img-3", url: "/c.webp", alt: "C", sort_order: 2, is_primary: false };

const newImg: GalleryImage = { id: "img-new", url: "/new.webp", alt: "New", sort_order: 0, is_primary: false };

// ─── addImage ───────────────────────────────────────────────

describe("addImage", () => {
  it("adds an image to an empty array", () => {
    const result = addImage([], newImg);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(newImg);
  });

  it("appends image to the end of existing array", () => {
    const result = addImage([img1, img2], newImg);
    expect(result).toHaveLength(3);
    expect(result[2].id).toBe("img-new");
    expect(result[2].url).toBe("/new.webp");
    expect(result[2].sort_order).toBe(2);
  });

  it("does not mutate the original array", () => {
    const original = [img1, img2];
    addImage(original, newImg);
    expect(original).toHaveLength(2);
  });

  it("sets sort_order to the next index", () => {
    const result = addImage([img1, img2, img3], newImg);
    expect(result[3].sort_order).toBe(3);
  });
});

// ─── removeImage ────────────────────────────────────────────

describe("removeImage", () => {
  it("removes the specified image", () => {
    const result = removeImage([img1, img2, img3], "img-2");
    expect(result).toHaveLength(2);
    expect(result.find((i) => i.id === "img-2")).toBeUndefined();
  });

  it("returns original array unchanged if id not found", () => {
    const result = removeImage([img1, img2], "nonexistent");
    expect(result).toHaveLength(2);
  });

  it("handles removing the only image", () => {
    const result = removeImage([img1], "img-1");
    expect(result).toHaveLength(0);
  });

  it("does not mutate the original array", () => {
    const original = [img1, img2, img3];
    removeImage(original, "img-2");
    expect(original).toHaveLength(3);
  });

  it("reindexes sort_order after removal", () => {
    const result = removeImage([img1, img2, img3], "img-2");
    expect(result[0].sort_order).toBe(0);
    expect(result[1].sort_order).toBe(1);
  });
});

// ─── setPrimary ─────────────────────────────────────────────

describe("setPrimary", () => {
  it("sets the specified image as primary", () => {
    const result = setPrimary([img1, img2, img3], "img-3");
    expect(result[2].is_primary).toBe(true);
  });

  it("unsets the previously primary image", () => {
    const result = setPrimary([img1, img2, img3], "img-3");
    expect(result[0].is_primary).toBe(false);
  });

  it("does nothing if id is not found", () => {
    const result = setPrimary([img1, img2], "nonexistent");
    expect(result[0].is_primary).toBe(true);
    expect(result[1].is_primary).toBe(false);
  });

  it("does not mutate the original array", () => {
    const original = [img1, img2, img3];
    setPrimary(original, "img-3");
    expect(original[0].is_primary).toBe(true);
  });

  it("only one image is primary after setPrimary", () => {
    const result = setPrimary([img1, img2, img3], "img-2");
    const primaries = result.filter((i) => i.is_primary);
    expect(primaries).toHaveLength(1);
    expect(primaries[0].id).toBe("img-2");
  });
});

// ─── reorderImages ──────────────────────────────────────────

describe("reorderImages", () => {
  it("moves an image from index 0 to index 2", () => {
    const result = reorderImages([img1, img2, img3], 0, 2);
    expect(result[0].id).toBe("img-2");
    expect(result[1].id).toBe("img-3");
    expect(result[2].id).toBe("img-1");
  });

  it("moves an image from index 2 to index 0", () => {
    const result = reorderImages([img1, img2, img3], 2, 0);
    expect(result[0].id).toBe("img-3");
    expect(result[1].id).toBe("img-1");
    expect(result[2].id).toBe("img-2");
  });

  it("does nothing when fromIndex equals toIndex", () => {
    const result = reorderImages([img1, img2, img3], 1, 1);
    expect(result.map((i) => i.id)).toEqual(["img-1", "img-2", "img-3"]);
  });

  it("reindexes sort_order after reorder", () => {
    const result = reorderImages([img1, img2, img3], 0, 2);
    expect(result[0].sort_order).toBe(0);
    expect(result[1].sort_order).toBe(1);
    expect(result[2].sort_order).toBe(2);
  });

  it("does not mutate the original array", () => {
    const original = [img1, img2, img3];
    reorderImages(original, 0, 2);
    expect(original[0].id).toBe("img-1");
  });

  it("handles single element array", () => {
    const result = reorderImages([img1], 0, 0);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("img-1");
  });
});
