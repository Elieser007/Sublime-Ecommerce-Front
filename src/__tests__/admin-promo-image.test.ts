/**
 * Admin Promo Image Flow — static-source tests (TDD RED, PM-5).
 *
 * The promo page must use processImage (≤1000×1000 WebP 80%) and
 * image-utils.ts exclusively for the image lifecycle: upload at Guardar
 * time → resolvedUrls → batch PUT; replace/remove deletes the old R2 object
 * via deleteUploadedFile; batch failure deletes blobs uploaded this save.
 * The old promo-upload.ts module and dead #delete-overlay markup must be
 * gone.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

const pageSource = readFileSync(
  resolve(__dirname, "../pages/admin/promotions.astro"),
  "utf-8"
);

describe("promotions.astro — image pipeline", () => {
  it("uses processImage from lib/image (client-side WebP processing)", () => {
    expect(pageSource).toContain("processImage");
    expect(pageSource).toContain("lib/image");
  });

  it("uses image-utils exclusively for upload/associate/delete", () => {
    expect(pageSource).toContain("lib/image-utils");
    expect(pageSource).toContain("uploadImageBlob");
    expect(pageSource).toContain("deleteUploadedFile");
  });

  it("uploads blobs at save time into resolvedUrls", () => {
    expect(pageSource).toContain("resolvedUrls");
    expect(pageSource).toContain("toSavePayload");
  });

  it("deletes the old R2 object when an image is replaced or removed", () => {
    expect(pageSource).toContain("extractFilename");
    expect(pageSource).toContain("deleteUploadedFile");
    expect(pageSource).toContain("previousImageUrl");
  });

  it("guards against orphan blobs on batch failure", () => {
    expect(pageSource).toMatch(/uploadedThisSave|orphan/i);
  });
});

describe("promo page — no legacy upload duplication", () => {
  it("does not import lib/promo-upload", () => {
    expect(pageSource).not.toContain("lib/promo-upload");
  });

  it("has no #delete-overlay markup", () => {
    expect(pageSource).not.toContain("delete-overlay");
  });
});

describe("promo-upload.ts removal (design file table)", () => {
  it("src/lib/promo-upload.ts no longer exists", () => {
    expect(existsSync(resolve(__dirname, "../lib/promo-upload.ts"))).toBe(false);
  });

  it("src/__tests__/promo-upload.test.ts no longer exists", () => {
    expect(existsSync(resolve(__dirname, "./promo-upload.test.ts"))).toBe(false);
  });
});
