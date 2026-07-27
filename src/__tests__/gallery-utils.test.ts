/**
 * Gallery Utils Tests
 *
 * Pure functions for image gallery navigation and management.
 * These are unit tests — no DOM, no API, no mocks needed.
 */

import { describe, it, expect } from "vitest";
import {
  getImageById,
  getNextImage,
  getPrevImage,
  getPrimaryImage,
  getImageCount,
} from "../lib/gallery-utils";
import type { GalleryImage } from "../lib/image-types";

// ─── Test Data ──────────────────────────────────────────────

const img1: GalleryImage = { id: "img-1", url: "/a.webp", alt: "A", sort_order: 0, is_primary: true };
const img2: GalleryImage = { id: "img-2", url: "/b.webp", alt: "B", sort_order: 1, is_primary: false };
const img3: GalleryImage = { id: "img-3", url: "/c.webp", alt: "C", sort_order: 2, is_primary: false };
const img4: GalleryImage = { id: "img-4", url: "/d.webp", alt: "D", sort_order: 3, is_primary: false };

const twoImages: GalleryImage[] = [img1, img2];
const threeImages: GalleryImage[] = [img1, img2, img3];
const fourImages: GalleryImage[] = [img1, img2, img3, img4];

// ─── getImageById ───────────────────────────────────────────

describe("getImageById", () => {
  it("returns the image matching the given id", () => {
    const result = getImageById(threeImages, "img-2");
    expect(result).toEqual(img2);
  });

  it("returns undefined when id is not found", () => {
    const result = getImageById(threeImages, "nonexistent");
    expect(result).toBeUndefined();
  });

  it("returns undefined for empty array", () => {
    const result = getImageById([], "img-1");
    expect(result).toBeUndefined();
  });

  it("returns the correct image when there is only one", () => {
    const result = getImageById([img1], "img-1");
    expect(result).toEqual(img1);
  });
});

// ─── getNextImage ───────────────────────────────────────────

describe("getNextImage", () => {
  it("returns the next image in the list", () => {
    const result = getNextImage(threeImages, "img-1");
    expect(result).toEqual(img2);
  });

  it("wraps around from last to first", () => {
    const result = getNextImage(threeImages, "img-3");
    expect(result).toEqual(img1);
  });

  it("wraps around when only two images", () => {
    const result = getNextImage(twoImages, "img-2");
    expect(result).toEqual(img1);
  });

  it("returns the same image when array has only one image", () => {
    const result = getNextImage([img1], "img-1");
    expect(result).toEqual(img1);
  });

  it("returns undefined for empty array", () => {
    const result = getNextImage([], "img-1");
    expect(result).toBeUndefined();
  });

  it("returns undefined when currentId is not in the array", () => {
    const result = getNextImage(threeImages, "nonexistent");
    expect(result).toBeUndefined();
  });
});

// ─── getPrevImage ───────────────────────────────────────────

describe("getPrevImage", () => {
  it("returns the previous image in the list", () => {
    const result = getPrevImage(threeImages, "img-2");
    expect(result).toEqual(img1);
  });

  it("wraps around from first to last", () => {
    const result = getPrevImage(threeImages, "img-1");
    expect(result).toEqual(img3);
  });

  it("wraps around when only two images", () => {
    const result = getPrevImage(twoImages, "img-1");
    expect(result).toEqual(img2);
  });

  it("returns the same image when array has only one image", () => {
    const result = getPrevImage([img1], "img-1");
    expect(result).toEqual(img1);
  });

  it("returns undefined for empty array", () => {
    const result = getPrevImage([], "img-1");
    expect(result).toBeUndefined();
  });

  it("returns undefined when currentId is not in the array", () => {
    const result = getPrevImage(threeImages, "nonexistent");
    expect(result).toBeUndefined();
  });
});

// ─── getPrimaryImage ────────────────────────────────────────

describe("getPrimaryImage", () => {
  it("returns the primary image when one exists", () => {
    const result = getPrimaryImage(threeImages);
    expect(result).toEqual(img1);
  });

  it("returns the first image when no primary is set", () => {
    const noPrimary: GalleryImage[] = [
      { id: "img-a", url: "/a.webp", alt: "A", sort_order: 0, is_primary: false },
      { id: "img-b", url: "/b.webp", alt: "B", sort_order: 1, is_primary: false },
    ];
    const result = getPrimaryImage(noPrimary);
    expect(result).toEqual(noPrimary[0]);
  });

  it("returns undefined for empty array", () => {
    const result = getPrimaryImage([]);
    expect(result).toBeUndefined();
  });

  it("returns the primary image even when it is not the first", () => {
    const lastPrimary: GalleryImage[] = [
      { id: "img-a", url: "/a.webp", alt: "A", sort_order: 0, is_primary: false },
      { id: "img-b", url: "/b.webp", alt: "B", sort_order: 1, is_primary: true },
    ];
    const result = getPrimaryImage(lastPrimary);
    expect(result).toEqual(lastPrimary[1]);
  });
});

// ─── getImageCount ──────────────────────────────────────────

describe("getImageCount", () => {
  it("returns the number of images", () => {
    expect(getImageCount(threeImages)).toBe(3);
  });

  it("returns 0 for empty array", () => {
    expect(getImageCount([])).toBe(0);
  });

  it("returns 1 for single image", () => {
    expect(getImageCount([img1])).toBe(1);
  });

  it("returns correct count for four images", () => {
    expect(getImageCount(fourImages)).toBe(4);
  });
});
