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

const previewSource = readFileSync(
  resolve(__dirname, "../lib/promo-preview.ts"),
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

describe("promotions.astro — duplicate action bindings", () => {
  it("adds a duplicate button to the selected-tile overlay in the tiles canvas", () => {
    // The overlay button lives on the SELECTED tile only (doDuplicate is
    // otherwise dead code). pointerdown propagation stops so the canvas
    // pointer session does not hijack the click into an edit-modal tap.
    expect(pageSource).toMatch(/dup\.dataset\.action = 'duplicate'/);
    expect(pageSource).toMatch(/dup\.addEventListener\('pointerdown', \(e\) => e\.stopPropagation\(\)\)/);
    expect(pageSource).toMatch(/doDuplicate\(selectedId\)/);
  });

  it("binds Ctrl/Cmd+D to duplicate the selected tile", () => {
    expect(pageSource).toMatch(/const isDuplicate = \(e\.ctrlKey \|\| e\.metaKey\) && \(e\.key === 'd' \|\| e\.key === 'D'\)/);
    expect(pageSource).toMatch(/if \(isDuplicate\) \{\s*\n\s*if \(selectedId && isTiles\(\)\) \{ e\.preventDefault\(\); doDuplicate\(selectedId\); \}/);
  });

  it("selects the duplicate copy by its fresh localKey after duplicating", () => {
    // duplicatePromotion gives the copy a new localId/localKey (id stays null),
    // so the overlay follows the copy via localKey(added), not added.id.
    expect(pageSource).toContain("selectedId = added ? localKey(added) : null;");
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

  it("dedupes the SPA nav guard across repeated initEvents (FIX4)", () => {
    expect(pageSource).toContain("installNavGuard");
    expect(pageSource).toContain("NAV_GUARD_KEY");
    // The guard removes the previous capture-phase document click listener
    // before installing the current one, so visits cannot stack confirm dialogs.
    expect(pageSource).toMatch(/document\.removeEventListener\(['"]click['"],\s*previous,\s*true\)/);
    expect(pageSource).toMatch(/document\.addEventListener\(['"]click['"],\s*handler,\s*true\)/);
  });

  it("scopes the SPA nav guard to the promotions editor path", () => {
    expect(pageSource).toContain("isPromoEditorRoute");
    // The guard must bail on other admin pages so a stale dirty closure cannot
    // pop a confirm dialog after ClientRouter navigation away from the editor.
    expect(pageSource).toMatch(/if \(!isPromoEditorRoute\(location\.pathname\)\) return;/);
  });
});

describe("promotions.astro — draft object-URL lifecycle", () => {
  it("revokes uncommitted drafts when the modal closes via Esc/back (onClose)", () => {
    // Esc/browser-back close goes through modalStack.closeTop(), which never
    // reaches the ✕/Cancelar handlers — the wrapModal onClose owns the cleanup.
    expect(pageSource).toMatch(/wrapModal\(['"]modal-overlay['"],\s*\{\s*\n\s*onClose:/);
    expect(pageSource).toContain("discardModalDraft");
    expect(pageSource).toMatch(/URL\.revokeObjectURL\(modalDraftUrl\)/);
  });

  it("skips the draft cleanup after a Guardar submit (modalSubmitted guard)", () => {
    expect(pageSource).toContain("modalSubmitted");
    expect(pageSource).toMatch(/modalSubmitted\s*=\s*true/);
    expect(pageSource).toMatch(/onClose:\s*\(\)\s*=>\s*\{\s*\n\s*if \(modalSubmitted\) return;/);
  });

  it("revokes drafts abandoned when switching sections", () => {
    // selectSection resets history, so the union covers the discarded stacks,
    // removed-promo drafts, and the orphan scan in one pass.
    expect(pageSource).toContain(
      "...orphanedDraftUrls(outgoing.promotions, nextState.promotions, { past: [], future: [] })"
    );
    expect(pageSource).toContain("...outgoing.removedDraftUrls,");
    expect(pageSource).toContain("revokeDraftUrlsOnce(discardedDrafts, state.promotions)");
  });

  it("undo/redo revoke only true orphans, keeping drafts reachable via history", () => {
    // The scan passes the remaining past/future stacks, so a draft still
    // reachable through a redo/future snapshot is NOT revoked.
    expect(pageSource).toContain(
      "orphanedDraftUrls(state.promotions, undone.state.promotions, undone.history)"
    );
    expect(pageSource).toContain(
      "orphanedDraftUrls(state.promotions, redone.state.promotions, redone.history)"
    );
  });

  it("removeModalImage revokes the dropped draft and clears it from the working promo", () => {
    expect(pageSource).toContain(
      "if (modalDraftUrl && modalDraftUrl !== modalPrevDraftUrl) URL.revokeObjectURL(modalDraftUrl);"
    );
    expect(pageSource).toContain("updatePromotion(state, id, { localImageUrl: null })");
  });
});

describe("promotions.astro — draft object-URL lifecycle", () => {
  it("revokes the dropped draft when the modal ✕ removes the image", () => {
    // The session draft (≠ the pre-modal one, which lives until Cancelar/
    // Guardar) is revoked, and the working promo stops referencing it.
    expect(pageSource).toMatch(/if \(modalDraftUrl && modalDraftUrl !== modalPrevDraftUrl\) URL\.revokeObjectURL\(modalDraftUrl\)/);
    expect(pageSource).toMatch(/updatePromotion\(state, id, \{ localImageUrl: null \}\)/);
  });

  it("runs cancelModal's cleanup on Esc/back close via the modal onClose hook", () => {
    // Esc/browser-back close via modalStack.closeTop() never reaches
    // cancelModal: wrapModal's onClose must discard the uncommitted draft.
    expect(pageSource).toMatch(/wrapModal\('modal-overlay', \{[^}]*onClose/);
    expect(pageSource).toContain("discardModalDraft");
    expect(pageSource).toMatch(/modalSubmitted/);
  });

  it("revokes abandoned drafts when switching sections after the discard confirm", () => {
    expect(pageSource).toMatch(/orphanedDraftUrls\(outgoing\.promotions, nextState\.promotions, \{ past: \[\], future: \[\] \}\)/);
  });

  it("undo/redo revoke orphans with history-aware scans", () => {
    // A draft still reachable via the remaining past/future stacks must NOT be
    // revoked, so the scan receives the post-step history.
    expect(pageSource).toMatch(/orphanedDraftUrls\(state\.promotions, undone\.state\.promotions, undone\.history\)/);
    expect(pageSource).toMatch(/orphanedDraftUrls\(state\.promotions, redone\.state\.promotions, redone\.history\)/);
  });

  it("captures the pre-gesture snapshot at pointerdown so undo returns the tile to its prior cell (PM-3)", () => {
    // The canvas drag history entry is the pointerdown state, not the
    // post-gesture one, so Ctrl+Z after a drag is not a no-op.
    expect(pageSource).toMatch(/const gestureStart = state;/);
    expect(pageSource).toMatch(/history = pushHistory\(history, gestureStart\);/);
  });
});

describe("promotions.astro — history-aware draft revocation (W-UNDO-REVOKED)", () => {
  it("submit revokes the replaced draft only when no state, history snapshot, or pushed prev references it", () => {
    // The pre-modal draft is released only when nothing references it: not the
    // current state, not the past/future stacks, not the prev snapshot about to
    // be pushed — otherwise undo restores a revoked URL.
    expect(pageSource).toMatch(
      /if \(replacedDraft && !draftUrlReferenced\(replacedDraft, state\.promotions, history, \[prev\]\)\)/
    );
    expect(pageSource).toMatch(/URL\.revokeObjectURL\(replacedDraft\)/);
    expect(pageSource).not.toMatch(/!state\.promotions\.some\(\(p\) => p\.localImageUrl === replacedDraft\)/);
  });

  it("doRemove scans orphans against the would-be history so undo can restore the removed draft", () => {
    // The scan receives the history INCLUDING the prev snapshot about to be
    // pushed, so the removed promo's draft stays live while undo can restore
    // it instead of rendering a revoked tile.
    expect(pageSource).toMatch(/const nextHistory = pushHistory\(history, prev\);/);
    expect(pageSource).toMatch(/orphanedDraftUrls\(before, next\.promotions, nextHistory\)/);
    expect(pageSource).not.toMatch(/orphanedDraftUrls\(before, next\.promotions\)\.forEach/);
  });

  it("doSave gathers history-only drafts before clearing, then revokes each candidate once", () => {
    // Superseded picks survive only in history snapshots: their URLs are
    // captured before createHistory() discards the stacks, then released by
    // the union along with removed-promo and orphan-scan drafts.
    expect(pageSource).toMatch(/const discardedDrafts = historyDraftUrls\(history\);/);
    expect(pageSource).toMatch(/const removedDraftUrls = \[\.\.\.saveState\.removedDraftUrls\];/);
    expect(pageSource).toMatch(/\[\.\.\.discardedDrafts, \.\.\.removedDraftUrls, \.\.\.orphanedDraftUrls\(preSavePromotions, state\.promotions\)\]/);
    expect(pageSource).toMatch(/revokeDraftUrlsOnce\(/);
  });

  it("doRevert revokes removed promos' and history-only drafts when the working copy is discarded", () => {
    // The removed promo is absent from the pre-revert promotions array, and
    // superseded picks live only in the discarded stacks: the union covers both.
    expect(pageSource).toContain("const discardedDrafts = [");
    expect(pageSource).toContain("...historyDraftUrls(history),");
    expect(pageSource).toContain("...orphanedDraftUrls(before, snapshot.promotions),");
    expect(pageSource).toContain("...state.removedDraftUrls,");
    expect(pageSource).toContain("revokeDraftUrlsOnce(discardedDrafts, state.promotions)");
  });

  it("selectSection revokes removed promos' and history-only drafts when switching sections", () => {
    expect(pageSource).toContain("...outgoing.removedDraftUrls,");
    expect(pageSource).toContain("revokeDraftUrlsOnce(discardedDrafts, state.promotions)");
  });
});

describe("promotions.astro — per-item banner edit binding", () => {
  it("binds each edit affordance to the promo matching its data-local-key", () => {
    expect(pageSource).toMatch(/btn\.dataset\.localKey/);
    expect(pageSource).toMatch(/localKey\(pp\) === key/);
  });

  it("emits one key-carrying edit affordance per banner item in the preview builder", () => {
    expect(previewSource).toMatch(/banner-item-wrap/);
    expect(previewSource).toMatch(/editAffordance\(pt\.id\)/);
    expect(previewSource).toMatch(/data-local-key=/);
  });
});

describe("promotions.astro — per-item delete affordances", () => {
  it("emits a per-item delete button in the reorder strip, wired to doRemove by localKey", () => {
    // Strip items are never selectable, so Delete-key removal is unreachable:
    // each item carries its own 🗑 button bound to doRemove with that item's
    // localKey. The binding must stop pointerdown propagation so the button
    // does not start the reorder session, and stop click propagation so the
    // tap does not open the edit modal.
    expect(pageSource).toMatch(/class="strip-delete"[^>]*data-action="delete"[^>]*data-local-key="/);
    expect(pageSource).toMatch(/\[data-action="delete"\]/);
    expect(pageSource).toMatch(/btn\.addEventListener\('pointerdown', \(e\) => e\.stopPropagation\(\)\)/);
    expect(pageSource).toMatch(/e\.stopPropagation\(\);\s*\n\s*doRemove\(key\)/);
  });

  it("emits a delete affordance per item in the hero/banner preview builder, bound to doRemove", () => {
    expect(previewSource).toContain('data-action="delete"');
    expect(previewSource).toContain('data-local-key="${escapeHtml(key)}"');
    expect(previewSource).toMatch(/deleteAffordance\(first\.id\)/);
    expect(previewSource).toMatch(/deleteAffordance\(pt\.id\)/);
    expect(pageSource).toMatch(/\[data-action="delete"\]/);
    expect(pageSource).toMatch(/if \(p\) btn\.addEventListener\('click', \(e\) => \{\s*\n\s*e\.stopPropagation\(\);\s*\n\s*doRemove\(key\);/);
  });
});

describe("promotions.astro — canvas observer guard and empty-cell add", () => {
  it("guards the canvas MutationObserver against a null canvas and disconnects it on SPA teardown (FIX-1)", () => {
    // ClientRouter re-runs this script on every page-load: navigating away
    // from /admin/promotions leaves #promo-canvas absent, so the observer
    // creation must bail before observe(null) throws. The observer is also
    // disconnected before the swap so it cannot leak the outgoing DOM.
    expect(pageSource).toMatch(/function initCanvasEvents\(\) \{[\s\S]*?if \(!canvas\) return;[\s\S]*?mo\.observe\(canvas, \{ childList: true, subtree: true \}\)/);
    expect(pageSource).toContain("canvasObserver?.disconnect();");
    expect(pageSource).toContain("document.addEventListener('astro:before-swap'");
  });

  it("opens the new-promo modal pre-positioned at the tapped empty cell (FIX-2)", () => {
    // A background tap must place the new promo at the tapped cell (clientToCell
    // math), not at the autoSuggestPosition the + button path uses.
    expect(pageSource).toContain("beginEmptyCellTap");
    expect(pageSource).toContain("pendingPromoCell");
    expect(pageSource).toMatch(/updatePromotion\(state, addedKey, \{ posX: pendingPromoCell\.x, posY: pendingPromoCell\.y \}\)/);
  });
});
