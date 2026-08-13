/**
 * Gallery Lightbox Tests
 *
 * Pure zoom/pan/navigation math for the product-gallery lightbox
 * (src/lib/gallery-lightbox.ts). Unit tests — no DOM, no API, no mocks.
 * Locks REQ-10..16 conventions: scale clamp [1,6], cursor-anchored zoom,
 * pan clamp ±(dim·(scale−1))/2, wheel factor 1.15, step 1.25, dblclick 2.5.
 */

import { describe, it, expect } from "vitest";
import {
  MIN_SCALE,
  MAX_SCALE,
  ZOOM_STEP,
  DBLCLICK_ZOOM,
  WHEEL_FACTOR,
  resetZoom,
  clampScale,
  clampPan,
  zoomAt,
  zoomBy,
  toggleZoomAt,
  pinchScale,
  panTo,
  wheelZoomFactor,
  nextIndex,
  prevIndex,
  formatCounter,
  applyTransform,
  shouldShowThumbStrip,
} from "../lib/gallery-lightbox";

// ─── Locked constants (REQ-13) ─────────────────────────────

describe("locked zoom constants", () => {
  it("pins MIN_SCALE to 1", () => {
    expect(MIN_SCALE).toBe(1);
  });

  it("pins MAX_SCALE to 6", () => {
    expect(MAX_SCALE).toBe(6);
  });

  it("pins ZOOM_STEP to 1.25", () => {
    expect(ZOOM_STEP).toBe(1.25);
  });

  it("pins DBLCLICK_ZOOM to 2.5", () => {
    expect(DBLCLICK_ZOOM).toBe(2.5);
  });

  it("pins WHEEL_FACTOR to 1.15", () => {
    expect(WHEEL_FACTOR).toBeCloseTo(1.15);
  });
});

// ─── resetZoom (REQ-16) ────────────────────────────────────

describe("resetZoom", () => {
  it("returns the initial fit state", () => {
    expect(resetZoom()).toEqual({ scale: 1, tx: 0, ty: 0 });
  });

  it("returns a fresh object on every call", () => {
    expect(resetZoom()).not.toBe(resetZoom());
  });
});

// ─── clampScale (REQ-13) ───────────────────────────────────

describe("clampScale", () => {
  it("keeps an in-range scale unchanged", () => {
    expect(clampScale(4)).toBe(4);
  });

  it("clamps above MAX_SCALE (4 × 2 → 6)", () => {
    expect(clampScale(4 * 2)).toBe(6);
  });

  it("clamps below MIN_SCALE (1 × 0.5 → 1)", () => {
    expect(clampScale(1 * 0.5)).toBe(1);
  });

  it("accepts the boundary values exactly", () => {
    expect(clampScale(6)).toBe(6);
    expect(clampScale(1)).toBe(1);
  });
});

// ─── clampPan (REQ-14) ─────────────────────────────────────

describe("clampPan", () => {
  it("clamps translation to ±(w·(scale−1))/2 on both axes", () => {
    const result = clampPan({ scale: 3, tx: 2000, ty: -999 }, 1000, 600);
    expect(result).toEqual({ scale: 3, tx: 1000, ty: -600 });
  });

  it("keeps in-bounds translation unchanged", () => {
    const result = clampPan({ scale: 3, tx: 250, ty: -300 }, 1000, 600);
    expect(result).toEqual({ scale: 3, tx: 250, ty: -300 });
  });

  it("zeroes translation at scale 1 (no pan allowed)", () => {
    const result = clampPan({ scale: 1, tx: 50, ty: -50 }, 1000, 600);
    expect(result).toEqual({ scale: 1, tx: 0, ty: 0 });
  });

  it("uses asymmetric stage bounds per axis", () => {
    const result = clampPan({ scale: 3, tx: 999, ty: -999 }, 400, 100);
    expect(result).toEqual({ scale: 3, tx: 400, ty: -100 });
  });
});

// ─── zoomAt (REQ-13/14) ────────────────────────────────────

describe("zoomAt", () => {
  it("scales by the factor and anchors translation at the cursor", () => {
    const result = zoomAt({ scale: 1, tx: 0, ty: 0 }, 300, 200, 1.5, 1000, 600);
    expect(result.scale).toBe(1.5);
    // transform-origin is the stage center (500, 300): the stage point under
    // the cursor (300, 200) must stay fixed → tx = cxRel − cxRel·k = −200 + 300
    expect(result.tx).toBeCloseTo(100);
    expect(result.ty).toBeCloseTo(50);
  });

  it("keeps the stage point under the cursor fixed (geometric contract)", () => {
    const result = zoomAt({ scale: 1, tx: 0, ty: 0 }, 300, 200, 1.5, 1000, 600);
    // Point of the image currently under the cursor, in stage coordinates:
    // p = center + ((cursor − center) − tx) / scale
    const px = 500 + (300 - 500 - 0) / 1;
    const py = 300 + (200 - 300 - 0) / 1;
    // After zoom: center + (p − center)·scale + tx must land on the cursor.
    const sx = 500 + (px - 500) * result.scale + result.tx;
    const sy = 300 + (py - 300) * result.scale + result.ty;
    expect(sx).toBeCloseTo(300);
    expect(sy).toBeCloseTo(200);
  });

  it("anchors relative to a non-zero starting translation", () => {
    const result = zoomAt({ scale: 2, tx: -100, ty: 50 }, 300, 200, 1.25, 1000, 600);
    expect(result.scale).toBe(2.5);
    // (cx − w/2 − tx') = (cx − w/2 − tx) · k
    expect(300 - 500 - result.tx).toBeCloseTo((300 - 500 - -100) * 1.25);
    expect(200 - 300 - result.ty).toBeCloseTo((200 - 300 - 50) * 1.25);
  });

  it("clamps the resulting scale to MAX_SCALE", () => {
    const result = zoomAt({ scale: 4, tx: 0, ty: 0 }, 100, 100, 2, 1000, 600);
    expect(result.scale).toBe(6);
    expect(result.tx).toBeCloseTo(200);
    expect(result.ty).toBeCloseTo(100);
  });

  it("clamps translation through clampPan after zooming", () => {
    const result = zoomAt({ scale: 6, tx: 5000, ty: 3000 }, 500, 300, 1.5, 1000, 600);
    expect(result.scale).toBe(6);
    expect(result.tx).toBe(2500); // (1000·5)/2
    expect(result.ty).toBe(1500); // (600·5)/2
  });
});

// ─── zoomBy (REQ-13) ───────────────────────────────────────

describe("zoomBy", () => {
  it("zooms centered on the stage: fit stays centered (no drift)", () => {
    const result = zoomBy({ scale: 1, tx: 0, ty: 0 }, 1.25, 1000, 600);
    expect(result.scale).toBe(1.25);
    // Center of the stage is the transform origin: the image grows around it
    // without translation drift.
    expect(result.tx).toBeCloseTo(0);
    expect(result.ty).toBeCloseTo(0);
  });

  it("zooms out centered on the stage, restoring fit", () => {
    const result = zoomBy({ scale: 1.25, tx: -125, ty: -75 }, 1 / 1.25, 1000, 600);
    expect(result.scale).toBe(1);
    expect(result.tx).toBeCloseTo(0);
    expect(result.ty).toBeCloseTo(0);
  });

  it("clamps when zooming in beyond MAX_SCALE", () => {
    const result = zoomBy({ scale: 5, tx: 0, ty: 0 }, 1.25, 1000, 600);
    expect(result.scale).toBe(6);
  });
});

// ─── wheelZoomFactor (REQ-13, locked conventions) ──────────

describe("wheelZoomFactor", () => {
  it("plain wheel deltaY > 0 zooms in", () => {
    expect(wheelZoomFactor(false, 100)).toBeCloseTo(1.15);
  });

  it("plain wheel deltaY < 0 zooms out", () => {
    expect(wheelZoomFactor(false, -100)).toBeCloseTo(1 / 1.15);
  });

  it("trackpad pinch (ctrlKey, deltaY < 0) zooms in", () => {
    expect(wheelZoomFactor(true, -100)).toBeCloseTo(1.15);
  });

  it("ctrlKey with deltaY > 0 zooms out", () => {
    expect(wheelZoomFactor(true, 100)).toBeCloseTo(1 / 1.15);
  });

  it("zero deltaY is a no-op (factor 1)", () => {
    expect(wheelZoomFactor(false, 0)).toBe(1);
    expect(wheelZoomFactor(true, 0)).toBe(1);
  });
});

// ─── toggleZoomAt (REQ-13) ─────────────────────────────────

describe("toggleZoomAt", () => {
  it("zooms to 2.5× anchored at the pointer from fit", () => {
    const result = toggleZoomAt({ scale: 1, tx: 0, ty: 0 }, 300, 200, 1000, 600);
    expect(result.scale).toBe(2.5);
    // Stage-center-anchored math: cxRel = 300 − 500 = −200; tx = −200 − (−200)·2.5 = 300
    expect(result.tx).toBeCloseTo(300);
    expect(result.ty).toBeCloseTo(150);
  });

  it("resets to fit when already zoomed in", () => {
    const result = toggleZoomAt({ scale: 2, tx: -100, ty: 50 }, 300, 200, 1000, 600);
    expect(result).toEqual({ scale: 1, tx: 0, ty: 0 });
  });
});

// ─── pinchScale (REQ-14) ───────────────────────────────────

describe("pinchScale", () => {
  it("scales proportionally to the distance ratio", () => {
    expect(pinchScale(1, 100, 150)).toBe(1.5);
  });

  it("clamps the pinch result to [1, 6]", () => {
    expect(pinchScale(2, 50, 250)).toBe(6);
    expect(pinchScale(1, 100, 10)).toBe(1);
  });

  it("keeps the start scale when the start distance is invalid", () => {
    expect(pinchScale(2, 0, 100)).toBe(2);
    expect(pinchScale(2, -1, 100)).toBe(2);
  });
});

// ─── panTo (REQ-14) ────────────────────────────────────────

describe("panTo", () => {
  it("clamps requested translation to the stage bounds", () => {
    const result = panTo({ scale: 3, tx: 0, ty: 0 }, 5000, -5000, 1000, 600);
    expect(result).toEqual({ scale: 3, tx: 1000, ty: -600 });
  });

  it("passes through in-bounds translation", () => {
    const result = panTo({ scale: 3, tx: 0, ty: 0 }, -200, 150, 1000, 600);
    expect(result).toEqual({ scale: 3, tx: -200, ty: 150 });
  });

  it("disables panning at scale 1", () => {
    const result = panTo({ scale: 1, tx: 0, ty: 0 }, 300, -200, 1000, 600);
    expect(result).toEqual({ scale: 1, tx: 0, ty: 0 });
  });
});

// ─── nextIndex / prevIndex (REQ-15) ────────────────────────

describe("nextIndex", () => {
  it("advances within bounds", () => {
    expect(nextIndex(0, 4)).toBe(1);
    expect(nextIndex(2, 4)).toBe(3);
  });

  it("wraps from last to first", () => {
    expect(nextIndex(3, 4)).toBe(0);
  });

  it("returns the current index when total is invalid", () => {
    expect(nextIndex(2, 0)).toBe(2);
    expect(nextIndex(2, -3)).toBe(2);
  });
});

describe("prevIndex", () => {
  it("steps back within bounds", () => {
    expect(prevIndex(3, 4)).toBe(2);
    expect(prevIndex(1, 4)).toBe(0);
  });

  it("wraps from first to last", () => {
    expect(prevIndex(0, 4)).toBe(3);
  });

  it("returns the current index when total is invalid", () => {
    expect(prevIndex(1, 0)).toBe(1);
    expect(prevIndex(1, -3)).toBe(1);
  });
});

// ─── formatCounter (REQ-12) ────────────────────────────────

describe("formatCounter", () => {
  it("formats a 1-based counter", () => {
    expect(formatCounter(0, 4)).toBe("1 / 4");
    expect(formatCounter(3, 4)).toBe("4 / 4");
  });
});

// ─── applyTransform ────────────────────────────────────────

describe("applyTransform", () => {
  it("renders the CSS transform string for a zoomed state", () => {
    expect(applyTransform({ scale: 2, tx: -100, ty: 50 })).toBe(
      "translate(-100px, 50px) scale(2)"
    );
  });

  it("renders the fit state", () => {
    expect(applyTransform({ scale: 1, tx: 0, ty: 0 })).toBe(
      "translate(0px, 0px) scale(1)"
    );
  });
});

// ─── shouldShowThumbStrip (REQ-10) ─────────────────────────

describe("shouldShowThumbStrip", () => {
  it("hides the strip for 0 and 1 images", () => {
    expect(shouldShowThumbStrip(0)).toBe(false);
    expect(shouldShowThumbStrip(1)).toBe(false);
  });

  it("shows the strip for 2+ images", () => {
    expect(shouldShowThumbStrip(2)).toBe(true);
    expect(shouldShowThumbStrip(6)).toBe(true);
  });
});
