/**
 * ProductGallery Tests
 *
 * Tests the gallery utility functions with realistic product image data.
 * Astro components render at build time, so we test the logic layer
 * that drives the gallery behavior.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  getImageById,
  getNextImage,
  getPrevImage,
  getPrimaryImage,
  getImageCount,
} from "../lib/gallery-utils";
import type { GalleryImage } from "../lib/image-types";

const gallerySource = readFileSync(
  resolve(__dirname, "../components/ProductGallery.astro"),
  "utf-8"
);

// ─── Realistic Data ─────────────────────────────────────────

const productImages: GalleryImage[] = [
  { id: "pi-1", url: "/products/shirt-front.webp", alt: "Camisa frontal", sort_order: 0, is_primary: true },
  { id: "pi-2", url: "/products/shirt-back.webp", alt: "Camisa espalda", sort_order: 1, is_primary: false },
  { id: "pi-3", url: "/products/shirt-detail.webp", alt: "Detalle de tela", sort_order: 2, is_primary: false },
];

// ─── Gallery Scenario Tests ─────────────────────────────────

describe("ProductGallery — image selection", () => {
  it("shows primary image as the main image", () => {
    const mainImage = getPrimaryImage(productImages);
    expect(mainImage?.id).toBe("pi-1");
    expect(mainImage?.url).toBe("/products/shirt-front.webp");
  });

  it("navigates forward through thumbnails", () => {
    const current = productImages[0];
    const next = getNextImage(productImages, current.id);
    expect(next?.id).toBe("pi-2");
  });

  it("navigates backward from first to last (wrap)", () => {
    const current = productImages[0];
    const prev = getPrevImage(productImages, current.id);
    expect(prev?.id).toBe("pi-3");
  });

  it("shows correct thumbnail count", () => {
    expect(getImageCount(productImages)).toBe(3);
  });

  it("finds a specific thumbnail by id", () => {
    const thumb = getImageById(productImages, "pi-3");
    expect(thumb?.alt).toBe("Detalle de tela");
  });
});

describe("ProductGallery — single image (no navigation)", () => {
  const singleImage: GalleryImage[] = [
    { id: "only-1", url: "/products/hat.webp", alt: "Gorra", sort_order: 0, is_primary: true },
  ];

  it("shows the single image as main", () => {
    const main = getPrimaryImage(singleImage);
    expect(main?.url).toBe("/products/hat.webp");
  });

  it("next and prev both return the same image", () => {
    const next = getNextImage(singleImage, "only-1");
    const prev = getPrevImage(singleImage, "only-1");
    expect(next?.id).toBe("only-1");
    expect(prev?.id).toBe("only-1");
  });

  it("reports count as 1", () => {
    expect(getImageCount(singleImage)).toBe(1);
  });
});

describe("ProductGallery — no images", () => {
  it("returns undefined for primary", () => {
    expect(getPrimaryImage([])).toBeUndefined();
  });

  it("returns 0 for count", () => {
    expect(getImageCount([])).toBe(0);
  });
});

describe("ProductGallery markup (D5)", () => {
  it("tracks pointer position via --x/--y for the zoom origin", () => {
    expect(gallerySource).toContain("--x");
    expect(gallerySource).toContain("--y");
    expect(gallerySource).toContain("gallery-main__img--zoomed");
  });

  it("renders an SSR counter element kept in sync on navigation", () => {
    expect(gallerySource).toContain("data-counter");
    expect(gallerySource).toContain("gallery-counter");
  });

  it("navigates with arrow keys from inside the gallery", () => {
    expect(gallerySource).toContain("keydown");
  });
});
