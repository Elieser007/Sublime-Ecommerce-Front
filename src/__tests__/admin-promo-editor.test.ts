/**
 * Admin Promo Editor — static-source page tests (TDD RED).
 *
 * The editor page's <script> wires the pure libs (promo-grid/editor/canvas)
 * to a pointer-event session. These tests read the compiled page source and
 * assert the wiring exists: imports, canvas rendering, pointer/keyboard
 * handlers, the single Guardar commit, Cancelar/Revertir, the beforeunload
 * guard, 44px touch handles, onboarding hint, and the absence of the old
 * upload module and dead #delete-overlay markup. Refs: PM-1..PM-4, AR-2.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

const pageSource = readFileSync(
  resolve(__dirname, "../pages/admin/promotions.astro"),
  "utf-8"
);

describe("promotions.astro — pure lib wiring", () => {
  it("imports the three pure promo libs", () => {
    expect(pageSource).toContain("promo-grid");
    expect(pageSource).toContain("promo-editor");
    expect(pageSource).toContain("promo-canvas");
  });

  it("imports image-utils and processImage (image pipeline)", () => {
    expect(pageSource).toContain("image-utils");
    expect(pageSource).toContain("processImage");
  });
});

describe("promotions.astro — canvas editor", () => {
  it("renders the tile canvas with grid-lines overlay and percent tiles", () => {
    expect(pageSource).toContain("renderTileCanvasHtml");
    expect(pageSource).toContain("renderGridLines");
  });

  it("registers a pointerdown session for drag and resize", () => {
    expect(pageSource).toContain("pointerdown");
    expect(pageSource).toContain("setPointerCapture");
    expect(pageSource).toContain("dragToCell");
    expect(pageSource).toContain("resizeToSpans");
  });

  it("handles touch: touch-action none + 44px handle hit class", () => {
    expect(pageSource).toContain("touch-action");
    expect(pageSource).toContain("handle-hit");
  });

  it("shows an onboarding hint element (one-time)", () => {
    expect(pageSource).toMatch(/onboarding|hint/i);
  });

  it("shows a collision warning without blocking placement", () => {
    expect(pageSource).toContain("detectCollisions");
  });
});

describe("promotions.astro — keyboard interactions", () => {
  it("handles Escape, arrows, Delete, and undo/redo keys", () => {
    expect(pageSource).toContain("keydown");
    expect(pageSource).toContain("Escape");
    expect(pageSource).toContain("Arrow");
    expect(pageSource).toContain("Delete");
    expect(pageSource).toContain("undoEditor");
    expect(pageSource).toContain("redoEditor");
  });
});

describe("promotions.astro — local state and single commit", () => {
  it("builds state via createEditorState and tracks dirty", () => {
    expect(pageSource).toContain("createEditorState");
    expect(pageSource).toContain("isDirty");
  });

  it("Guardar is disabled while clean and enabled when dirty", () => {
    expect(pageSource).toContain("Guardar");
    expect(pageSource).toMatch(/disabled/i);
  });

  it("Cancelar/Revertir restores the snapshot via revert()", () => {
    expect(pageSource).toMatch(/Cancelar|Revertir/i);
    expect(pageSource).toContain("revert");
  });

  it("sends exactly one batch PUT via toSavePayload", () => {
    expect(pageSource).toContain("toSavePayload");
    expect(pageSource).toContain("promotion-sections");
    expect(pageSource).toContain("promotions");
  });

  it("applies the server response via applySavedResponse", () => {
    expect(pageSource).toContain("applySavedResponse");
  });

  it("warns before unload when dirty", () => {
    expect(pageSource).toContain("beforeunload");
    expect(pageSource).toContain("shouldWarnBeforeUnload");
  });
});

describe("promotions.astro — no dead code", () => {
  it("does not import the old promo-upload module", () => {
    expect(pageSource).not.toContain("lib/promo-upload");
  });

  it("has no #delete-overlay markup", () => {
    expect(pageSource).not.toContain("delete-overlay");
  });

  it("has no per-interaction network calls to /api/promotions (single commit only)", () => {
    // The old editor PUT/POSTed per modal save. The new editor only calls the
    // batch PUT and reads. No fetch to /api/promotions (collection) for writes.
    expect(pageSource).not.toMatch(/fetch\([^)]*\/api\/promotions['"]/);
  });
});

describe("promotions.astro — judgment-day fixes wiring", () => {
  it("uses pointer-event reorder on the strip, not HTML5 drag-and-drop (F4)", () => {
    expect(pageSource).toContain("beginStripPointerSession");
    // Strip items are no longer HTML5-draggable (the image-upload area keeps
    // its own File drop handler, so dataTransfer still appears once).
    expect(pageSource).not.toContain("draggable=\"true\"");
    expect(pageSource).not.toMatch(/strip-item.*draggable/s);
    expect(pageSource).toContain("strip-item--target");
  });

  it("guards ClientRouter SPA navigation when dirty (F9)", () => {
    expect(pageSource).toContain("composedPath");
    expect(pageSource).toContain("beforeunload");
    expect(pageSource).toContain("shouldWarnBeforeUnload");
  });

  it("validates titles per tile before Guardar (F10)", () => {
    expect(pageSource).toContain("validatePromotionsForSave");
  });

  it("keys the edit modal by localKey so unsaved edits update in place (F5)", () => {
    expect(pageSource).toContain("localKey");
    expect(pageSource).toContain("updatePromotion(state, id, patch)");
  });

  it("captures R2 cleanup targets before applySavedResponse resets state (F6)", () => {
    expect(pageSource).toContain("removedImageUrls");
  });

  it("associates uploaded images by server id, not response array index (F7)", () => {
    expect(pageSource).toContain("for (const [serverId, url] of Object.entries(resolvedUrls))");
  });

  it("surfaces the save validation error outside the hidden modal (FIX3)", () => {
    expect(pageSource).toContain('id="save-error"');
    expect(pageSource).toContain("validatePromotionsForSave(state.promotions)");
    // The doSave validation failure must land in #save-error (always visible),
    // NOT in #form-error (hidden inside #modal-overlay).
    expect(pageSource).toMatch(/\$\(['"]save-error['"]\)!\.textContent\s*=\s*validationError/);
    expect(pageSource).not.toMatch(/\$\(['"]form-error['"]\)!\.textContent\s*=\s*validationError/);
  });
});
