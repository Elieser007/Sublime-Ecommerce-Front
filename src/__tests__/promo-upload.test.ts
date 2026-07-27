/**
 * Promotion Upload Helpers Tests — TDD
 *
 * Tests for promo-upload.ts pure functions:
 * - State creation and manipulation
 * - Image state transitions (empty → blob, empty → url, clear)
 * - Preview URL generation
 */

import { describe, it, expect } from "vitest";
import {
  createEmptyPromoImageState,
  hasPromoImage,
  setPromoImageFromBlob,
  setPromoImageFromUrl,
  clearPromoImage,
  getPromoPreviewUrl,
  type PromoImageState,
} from "../lib/promo-upload";

describe("createEmptyPromoImageState", () => {
  it("returns empty state with all nulls", () => {
    const state = createEmptyPromoImageState();
    expect(state.blob).toBeNull();
    expect(state.url).toBeNull();
    expect(state.imageId).toBeNull();
    expect(state.isNew).toBe(false);
  });
});

describe("hasPromoImage", () => {
  it("returns false for empty state", () => {
    expect(hasPromoImage(createEmptyPromoImageState())).toBe(false);
  });

  it("returns true when blob is set", () => {
    const blob = new Blob(["test"], { type: "image/webp" });
    const state = setPromoImageFromBlob(createEmptyPromoImageState(), blob);
    expect(hasPromoImage(state)).toBe(true);
  });

  it("returns true when url is set", () => {
    const state = setPromoImageFromUrl(createEmptyPromoImageState(), "https://cdn.example.com/promo.webp", "img1");
    expect(hasPromoImage(state)).toBe(true);
  });
});

describe("setPromoImageFromBlob", () => {
  it("sets blob and marks as new", () => {
    const blob = new Blob(["test"], { type: "image/webp" });
    const state = setPromoImageFromBlob(createEmptyPromoImageState(), blob);
    expect(state.blob).toBe(blob);
    expect(state.url).toBeNull();
    expect(state.isNew).toBe(true);
  });

  it("preserves existing imageId", () => {
    const blob = new Blob(["test"], { type: "image/webp" });
    const initial = setPromoImageFromUrl(createEmptyPromoImageState(), "https://old.webp", "old-img");
    const state = setPromoImageFromBlob(initial, blob);
    expect(state.imageId).toBe("old-img");
    expect(state.isNew).toBe(true);
  });
});

describe("setPromoImageFromUrl", () => {
  it("sets url and imageId, marks as not new", () => {
    const state = setPromoImageFromUrl(createEmptyPromoImageState(), "https://cdn.example.com/promo.webp", "img1");
    expect(state.url).toBe("https://cdn.example.com/promo.webp");
    expect(state.imageId).toBe("img1");
    expect(state.blob).toBeNull();
    expect(state.isNew).toBe(false);
  });
});

describe("clearPromoImage", () => {
  it("resets to empty state", () => {
    const blob = new Blob(["test"], { type: "image/webp" });
    let state = setPromoImageFromBlob(createEmptyPromoImageState(), blob);
    state = setPromoImageFromUrl(state, "https://cdn.webp", "img1");
    const cleared = clearPromoImage(state);
    expect(cleared.blob).toBeNull();
    expect(cleared.url).toBeNull();
    expect(cleared.imageId).toBeNull();
    expect(cleared.isNew).toBe(false);
  });
});

describe("getPromoPreviewUrl", () => {
  it("returns null for empty state", () => {
    expect(getPromoPreviewUrl(createEmptyPromoImageState())).toBeNull();
  });

  it("returns object URL for blob state", () => {
    const blob = new Blob(["test"], { type: "image/webp" });
    const state = setPromoImageFromBlob(createEmptyPromoImageState(), blob);
    const url = getPromoPreviewUrl(state);
    expect(url).toBeTruthy();
    expect(url?.startsWith("blob:")).toBe(true);
  });

  it("returns stored URL for existing image", () => {
    const state = setPromoImageFromUrl(createEmptyPromoImageState(), "https://cdn.example.com/promo.webp", "img1");
    expect(getPromoPreviewUrl(state)).toBe("https://cdn.example.com/promo.webp");
  });
});
